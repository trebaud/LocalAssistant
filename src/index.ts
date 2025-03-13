import ollama from 'ollama';
import { CONFIG } from './config';
import { toolsString, executeFunction } from './tools';
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
 * Process a user prompt through the AI model and execute the appropriate tool
 */
export async function processPrompt(prompt: string, streamOutput: boolean = false): Promise<void> {
  try {
    console.log('\nProcessing prompt:', prompt);
    
    if (streamOutput) {
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
  
  // Keep track of chat history
  const history: Array<{ role: 'user' | 'assistant', content: string }> = [];
  
  const processCommand = async (command: string): Promise<boolean> => {
    const cmd = command.toLowerCase().trim();
    
    // Handle special commands
    if (cmd === 'exit' || cmd === 'quit') {
      console.log('Goodbye! 👋');
      rl.close();
      return true;
    } else if (cmd === '/help') {
      console.log('\nAvailable Commands:');
      console.log('  /help     - Show this help message');
      console.log('  /clear    - Clear the chat history');
      console.log('  /tool     - Switch to tool execution mode for the next message');
      console.log('  /model    - Show or change the current model');
      console.log('  exit, quit - End the session\n');
      return true;
    } else if (cmd === '/clear') {
      console.clear();
      history.length = 0;
      console.log('Chat history cleared.');
      return true;
    } else if (cmd.startsWith('/model')) {
      const parts = cmd.split(' ');
      if (parts.length > 1) {
        const newModel = parts.slice(1).join(' ');
        (CONFIG.AI as any).MODEL = newModel;
        console.log(`Model changed to: ${newModel}`);
      } else {
        console.log(`Current model: ${CONFIG.AI.MODEL}`);
      }
      return true;
    } else if (cmd === '/tool') {
      console.log('Enter your query for tool execution:');
      rl.question('Query: ', async (toolQuery) => {
        console.log('\nProcessing with tool execution...');
        if (options.mock) {
          const { runMockPrompt } = await import('./mock/index.js');
          await runMockPrompt(toolQuery);
        } else {
          await processPrompt(toolQuery, false);
        }
        askQuestion();
      });
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
You are a helpful, friendly, and knowledgeable assistant. 
Respond directly to the user's questions and requests in a conversational manner.
Be concise but thorough in your responses.
If you don't know something, admit it rather than making up information.
`;

// Import and run the CLI if this is the main module
if (import.meta.main) {
  const { runCli } = await import('./cli/index.js');
  runCli().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}
