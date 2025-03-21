import ollama from 'ollama';
import { CONFIG } from './config';
import { toolsString, executeFunction, TOOLS } from './tools';
import { ToolError } from './types';
import readline from 'readline';

const FUNCTION_CALL_DELIMITERS = {
  START: '<<__FUNCTION_CALL_8X7__>>',
  END: '<</__FUNCTION_CALL_8X7__>>'
}

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
    const functionMatch = text.match(new RegExp(`${FUNCTION_CALL_DELIMITERS.START}([\\s\\S]*?)${FUNCTION_CALL_DELIMITERS.END}`));
    if (!functionMatch) return null;
    
    const jsonStr = functionMatch[1];
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
export async function processPrompt(
  prompt: string, 
  streamOutput: boolean = false,
  history: Array<{ role: 'system' | 'user' | 'assistant', content: string }> = []
): Promise<string | null> {
  try {
    if (streamOutput) {
      // For streaming mode (chat), use the full conversation history
      const messages = [
        ...(history.length > 0 ? history : [{ role: 'system', content: CHAT_SYSTEM_PROMPT }]),
        { role: 'user', content: prompt }
      ];

      const stream = await ollama.chat({
        model: CONFIG.AI.MODEL,
        messages,
        stream: true,
      });
      
      const fullResponse = await handleStreamingResponse(stream);
      const parsedResponse = extractAndParseJSON(fullResponse);
      
      if (parsedResponse) {
        const result = await executeFunction(parsedResponse.functionName, parsedResponse.parameters);
        if (typeof result === 'string') {
          console.log(result);
        } else {
          console.log(JSON.stringify(result, null, 2));
        }
      }
      
      return fullResponse;
    } else {
      // Non-streaming mode for tool execution - don't use persisted history
      // Use generate API with system prompt for direct tool execution
      const response = await ollama.generate({
        model: CONFIG.AI.MODEL,
        system: SYSTEM_PROMPT,
        prompt,
        stream: false,
        format: 'json',
      });

      const parsedResponse = parseAIResponse(response.response.trim());
      const result = await executeFunction(parsedResponse.functionName, parsedResponse.parameters);
      if (typeof result === 'string') {
        console.log(result);
      } else {
        console.log(JSON.stringify(result, null, 2));
      }
      
      return response.response;
    }
  } catch (error) {
    if (error instanceof ToolError) {
      console.error(`Tool Error (${error.code}):`, error.message);
    } else if (error instanceof SyntaxError) {
      console.error('Failed to parse AI response:', error.message);
    } else {
      console.error('Unexpected error:', error instanceof Error ? error.message : 'Unknown error');
    }
    return null;
  }
}

/**
 * Start an interactive chat session with streaming responses
 */
export async function startChatSession(options: { 
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
  const history: Array<{ role: 'system' | 'user' | 'assistant', content: string }> = [
    { role: 'system', content: CHAT_SYSTEM_PROMPT }
  ];
  
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
      // Reset history but keep the system prompt
      history.length = 0;
      history.push({ role: 'system', content: CHAT_SYSTEM_PROMPT });
      console.log('Chat history cleared.');
      return true;
    } else if (cmd.startsWith('/tool')) {
      await handleToolCommand(cmd, history);
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
      
      // Add user message to history
      history.push({ role: 'user', content: input });
      
      // Process the message
      process.stdout.write('Assistant: ');
      
      try {
        // Pass the history to processPrompt and get the assistant's response
        const assistantResponse = await processPrompt(input, true, history);
        
        // Add the assistant's response to history if it exists
        if (assistantResponse) {
          history.push({ role: 'assistant', content: assistantResponse });
        }
      } catch (error) {
        console.error('\nError processing message:', error instanceof Error ? error.message : 'Unknown error');
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
2. IMMEDIATELY followed by the JSON format wrapped in special delimiters

For tool requests, use this format:
${FUNCTION_CALL_DELIMITERS.START}
{
  "functionName": "string - the name of the tool function to execute",
  "parameters": [
    {
      "parameterName": "string - name of the parameter", 
      "parameterValue": "string - the actual value to use"
    }
  ]
}
${FUNCTION_CALL_DELIMITERS.END}

For regular conversation:
- Be friendly, helpful, and direct
- Answer questions using your knowledge
- Keep responses concise and relevant
- Don't pretend to have personal experiences or emotions
- If you're unsure if a tool is needed, respond conversationally

Available Tools:
${toolsString}

Remember: Detect tool intent immediately and output JSON wrapped in the function call delimiters without discussion. For regular chat, be natural and helpful.
`;


/**
 * Handle the /tool command
 * Format: /tool ToolName param1="value1" param2="value2"
 */
async function handleToolCommand(
  command: string, 
  history?: Array<{ role: 'system' | 'user' | 'assistant', content: string }>
): Promise<void> {
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
    const result = await executeFunction(toolName, parameters);
    
    // Format the result for display and history
    const resultStr = typeof result === 'string' 
      ? result 
      : JSON.stringify(result, null, 2);
    
    console.log(resultStr);
    
    // Add the command and result to history if available
    if (history) {
      // Add the tool command as a user message
      history.push({ 
        role: 'user', 
        content: command 
      });
      
      // Add the result as an assistant message
      history.push({ 
        role: 'assistant', 
        content: `Tool execution result:\n${resultStr}` 
      });
    }
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
