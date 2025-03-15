import ollama from 'ollama';
import { CONFIG } from './config';
import { toolsString, executeFunction, TOOLS } from './tools';
import { ToolError } from './types';
import readline from 'readline';

interface AIResponse {
  functionName: string;
  parameters: Array<{
    parameterName: string;
    parameterValue: string;
  }>;
}

/**
 * Extract and parse JSON from a text that might contain both regular text and JSON
 * @returns AIResponse if JSON is found and valid, null otherwise
 */
function extractAndParseJSON(text: string): AIResponse | null {
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    
    const jsonStr = jsonMatch[0];
    return parseAIResponse(jsonStr);
  } catch (error) {
    if (error instanceof SyntaxError) {
      return null;
    }
    throw error;
  }
}

/**
 * Handle streaming response from the AI model
 */
async function handleStreamingResponse(stream: AsyncIterable<any>): Promise<string> {
  let fullResponse = '';
  
  // Add a newline and a subtle separator before the response
  console.log('\n' + '─'.repeat(process.stdout.columns || 80));
  
  for await (const chunk of stream) {
    if (chunk.message?.content) {
      // Use cyan color for the assistant's response
      process.stdout.write('\x1b[36m' + chunk.message.content + '\x1b[0m');
      fullResponse += chunk.message.content;
    }
  }
  
  // Add a separator after the response
  console.log('\n' + '─'.repeat(process.stdout.columns || 80) + '\n');
  return fullResponse;
}

/**
 * Process a user prompt through the AI model and execute the appropriate tool
 */
export async function processPrompt(prompt: string, streamOutput: boolean = false): Promise<void> {
  try {
    if (streamOutput) {
      const stream = await ollama.chat({
        model: CONFIG.AI.MODEL,
        messages: [
          { role: 'system', content: CHAT_SYSTEM_PROMPT },
          { role: 'user', content: prompt }
        ],
        stream: true,
      });
      
      const fullResponse = await handleStreamingResponse(stream);
      const parsedResponse = extractAndParseJSON(fullResponse);
      
      if (parsedResponse) {
        await executeFunction(parsedResponse.functionName, parsedResponse.parameters);
      }
      
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
          console.log('\n[Mock Response] This is a simulated response in chat mode.');
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
You are a helpful and friendly AI assistant. You can engage in natural conversation and have access to various tools to help users.

Important: When you detect that a user's request requires using a tool, respond with:
1. A brief acknowledgment of their intent (e.g. "I'll check the weather for you")
2. IMMEDIATELY followed by the appropriate JSON format

Example response for "what's the weather in London?":
"I'll check London's weather for you"
{
  "functionName": "getWeather",
  "parameters": [
    {
      "parameterName": "location",
      "parameterValue": "London"
    }
  ]
}

For tool requests, use this JSON format:
{
  "functionName": "string - the name of the tool function to execute",
  "parameters": [
    {
      "parameterName": "string - name of the parameter", 
      "parameterValue": "string - the actual value to use"
    }
  ]
}

For regular conversation:
- Be friendly, helpful, and direct
- Answer questions using your knowledge
- Keep responses concise and relevant
- Don't pretend to have personal experiences or emotions
- If you're unsure if a tool is needed, respond conversationally

Available Tools:
${toolsString}

Remember: Detect tool intent immediately and output JSON without discussion. For regular chat, be natural and helpful.
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
