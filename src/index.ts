import ollama from 'ollama';
import { CONFIG } from './config';
import { toolsString, executeFunction, TOOLS } from './tools';
import { ToolError } from './types';
import type { Tool, FunctionParameter } from './types';
import readline from 'readline';

interface AIResponse {
  functionName: string;
  parameters: Array<{
    parameterName: string;
    parameterValue: string;
  }>;
}

/**
 * Detect if a prompt is likely to be a tool request
 */
export function isToolRequest(prompt: string): boolean {
  const lowerPrompt = prompt.toLowerCase();
  
  // Check for keywords related to available tools
  const weatherKeywords = ['weather', 'temperature', 'forecast', 'humidity', 'rain', 'snow'];
  const locationKeywords = ['coordinates', 'latitude', 'longitude', 'located at', 'where is'];
  const searchKeywords = ['search for', 'find information', 'look up'];
  
  // Check for patterns like coordinates
  const hasCoordinates = lowerPrompt.match(/\b\d+\.\d+\b/) !== null;
  
  // Check if the prompt contains tool-related keywords
  const hasWeatherKeywords = weatherKeywords.some(keyword => lowerPrompt.includes(keyword));
  const hasLocationKeywords = locationKeywords.some(keyword => lowerPrompt.includes(keyword));
  const hasSearchKeywords = searchKeywords.some(keyword => lowerPrompt.includes(keyword));
  
  // Check if the prompt is a question
  const isQuestion = lowerPrompt.includes('?') || 
                     lowerPrompt.startsWith('what') || 
                     lowerPrompt.startsWith('where') || 
                     lowerPrompt.startsWith('who') || 
                     lowerPrompt.startsWith('how');
  
  // If the prompt contains tool-related keywords and is a question, it's likely a tool request
  return (hasWeatherKeywords || hasLocationKeywords || hasSearchKeywords || hasCoordinates) && isQuestion;
}

/**
 * Process a user prompt through the AI model and execute the appropriate tool
 */
export async function processPrompt(prompt: string, streamOutput: boolean = false): Promise<void> {
  try {
    console.log('\nProcessing prompt:', prompt);
    
    if (streamOutput) {
      // Check if this is likely a tool request
      const shouldUseTool = isToolRequest(prompt);
      
      if (shouldUseTool) {
        console.log('Detected tool request, processing with tool execution...');
        // Process as a tool request (non-streaming)
        await processPrompt(prompt, false);
        return;
      }
      
      // For streaming mode, we'll use a different system prompt and handle the response differently
      const stream = await ollama.chat({
        model: CONFIG.AI.MODEL,
        messages: [
          { role: 'system', content: CHAT_SYSTEM_PROMPT },
          { role: 'user', content: prompt }
        ],
        stream: true,
      });
      
      process.stdout.write('\n');
      for await (const chunk of stream) {
        if (chunk.message?.content) {
          process.stdout.write(chunk.message.content);
        }
      }
      process.stdout.write('\n\n');
      return;
    }
    
    // Non-streaming mode for tool execution
    const response = await ollama.generate({
      model: CONFIG.AI.MODEL,
      system: SYSTEM_PROMPT,
      prompt,
      stream: false,
      format: 'json',
    });

    const parsedResponse = parseAIResponse(response.response.trim());
    await executeFunction(parsedResponse.functionName, parsedResponse.parameters);
  } catch (error) {
    if (error instanceof ToolError) {
      console.error(`Tool Error (${error.code}):`, error.message);
    } else if (error instanceof SyntaxError) {
      console.error('Failed to parse AI response:', error.message);
    } else {
      console.error('Unexpected error:', error instanceof Error ? error.message : 'Unknown error');
    }
  }
}

/**
 * Start an interactive chat session with streaming responses
 */
export async function startChatSession(options: { 
  mock?: boolean; 
  model?: string;
} = {}): Promise<void> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    historySize: 100,
  });
  
  console.log('\n🤖 Welcome to LocalAssistant Chat Mode!');
  console.log('Type your messages and press Enter to chat.');
  console.log('Type "/help" to see available commands.');
  console.log('Type "exit", "quit", or press Ctrl+C to end the session.\n');
  console.log('Tool use is now automatically detected from your messages!\n');
  
  // Keep track of chat history
  const history: Array<{ role: 'user' | 'assistant', content: string }> = [];
  
  const processCommand = async (command: string): Promise<boolean> => {
    const cmd = command.trim();
    const lowerCmd = cmd.toLowerCase();
    
    // Handle special commands
    if (lowerCmd === 'exit' || lowerCmd === 'quit') {
      console.log('Goodbye! 👋');
      rl.close();
      return true;
    } else if (lowerCmd === '/help') {
      console.log('\nAvailable Commands:');
      console.log('  /help     - Show this help message');
      console.log('  /clear    - Clear the chat history');
      console.log('  /model    - Show or change the current model');
      console.log('  /tool     - Explicitly trigger a tool (e.g., /tool WeatherFromLocation location="New York")');
      console.log('  exit, quit - End the session\n');
      console.log('Note: Tool use is automatically detected from your messages!\n');
      return true;
    } else if (lowerCmd === '/clear') {
      console.clear();
      history.length = 0;
      console.log('Chat history cleared.');
      return true;
    } else if (cmd.startsWith('/tool')) {
      await handleToolCommand(cmd);
      return true;
    } else if (lowerCmd.startsWith('/model')) {
      const parts = cmd.split(' ');
      if (parts.length > 1) {
        const newModel = parts.slice(1).join(' ');
        (CONFIG.AI as any).MODEL = newModel;
        console.log(`Model changed to: ${newModel}`);
      } else {
        console.log(`Current model: ${CONFIG.AI.MODEL}`);
      }
      return true;
    }
    
    return false;
  };
  
  const askQuestion = () => {
    rl.question('You: ', async (input) => {
      // Skip empty inputs
      if (!input.trim()) {
        askQuestion();
        return;
      }
      
      // Process commands
      if (await processCommand(input)) {
        askQuestion();
        return;
      }
      
      // Add to history
      history.push({ role: 'user', content: input });
      
      // Process the message
      process.stdout.write('Assistant: ');
      
      if (options.mock) {
        // Check if this is likely a tool request
        if (isToolRequest(input)) {
          console.log('\nDetected tool request, processing with mock tool execution...');
          const { runMockPrompt } = await import('./mock/index.js');
          await runMockPrompt(input);
        } else {
          console.log('\n[Mock Response] This is a simulated response in chat mode.');
        }
        history.push({ role: 'assistant', content: '[Mock Response]' });
      } else {
        try {
          await processPrompt(input, true);
          // We don't add the assistant's response to history here because
          // we don't have access to the full response text from the streaming output
        } catch (error) {
          console.error('\nError processing message:', error instanceof Error ? error.message : 'Unknown error');
        }
      }
      
      askQuestion();
    });
  };
  
  askQuestion();
}

/**
 * Parse and validate the AI response
 */
function parseAIResponse(response: string): AIResponse {
  const parsed = JSON.parse(response);
  
  if (!parsed.functionName || !Array.isArray(parsed.parameters)) {
    throw new Error('Invalid AI response format');
  }
  
  return parsed;
}

const SYSTEM_PROMPT = `
You are a helpful assistant that analyzes user questions and determines the most appropriate tool to execute.
Your role is to understand the user's intent and map it to available tool functions with the correct parameters.

Response Schema:
{
  "functionName": "string - the name of the tool function to execute",
  "parameters": [
    {
      "parameterName": "string - name of the parameter",
      "parameterValue": "string - the actual value to use"
    }
  ]
}

Requirements:
- Only use functionName values from the available tools list
- Ensure all required parameters are included
- Parameter values must be appropriate for their intended use
- Respond ONLY with valid JSON - no other text

Available Tools:
${toolsString}
`;

const CHAT_SYSTEM_PROMPT = `
You are a helpful, friendly, and knowledgeable assistant. 
Respond directly to the user's questions and requests in a conversational manner.
Be concise but thorough in your responses.
If you don't know something, admit it rather than making up information.
`;

/**
 * Handle the /tool command
 * Format: /tool ToolName param1="value1" param2="value2"
 */
async function handleToolCommand(command: string): Promise<void> {
  try {
    // Extract the command parts (skip the "/tool" part)
    const parts = command.substring(5).trim().split(/\s+/);
    
    if (parts.length === 0 || !parts[0]) {
      console.log('Error: Tool name is required. Usage: /tool ToolName param1="value1" param2="value2"');
      console.log('Available tools:');
      Object.values(TOOLS).forEach(tool => {
        console.log(`- ${tool.name}: ${tool.description}`);
        tool.parameters.forEach(param => {
          console.log(`  * ${param.name}${param.required ? ' (required)' : ''}: ${param.description}`);
        });
      });
      return;
    }
    
    const toolName = parts[0];
    const tool = Object.values(TOOLS).find(t => t.name === toolName);
    
    if (!tool) {
      console.log(`Error: Unknown tool "${toolName}". Use /help to see available tools.`);
      return;
    }
    
    // Parse parameters
    const parameters: Array<{ parameterName: string; parameterValue: string }> = [];
    const paramRegex = /([a-zA-Z0-9_]+)=(?:"([^"]*)"|([\S]+))/g;
    
    // Join the rest of the command to handle parameters with spaces
    const paramString = parts.slice(1).join(' ');
    let match;
    
    while ((match = paramRegex.exec(paramString)) !== null) {
      const paramName = match[1];
      // Use the quoted value if available, otherwise use the non-quoted value
      const paramValue = match[2] !== undefined ? match[2] : match[3];
      parameters.push({ parameterName: paramName, parameterValue: paramValue });
    }
    
    // Check for required parameters
    const missingParams = tool.parameters
      .filter(param => param.required)
      .filter(param => !parameters.some(p => p.parameterName === param.name));
    
    if (missingParams.length > 0) {
      console.log(`Error: Missing required parameters: ${missingParams.map(p => p.name).join(', ')}`);
      return;
    }
    
    // Execute the tool
    console.log(`Executing tool: ${toolName}`);
    await executeFunction(toolName, parameters);
  } catch (error) {
    if (error instanceof ToolError) {
      console.error(`Tool Error (${error.code}):`, error.message);
    } else {
      console.error('Error executing tool:', error instanceof Error ? error.message : 'Unknown error');
    }
  }
}

// Import and run the CLI if this is the main module
if (import.meta.main) {
  const { runCli } = await import('./cli/index.js');
  runCli().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}
