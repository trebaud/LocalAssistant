import { processPrompt, startChatSession } from '../index';
import { TOOLS } from '../tools/definitions';
import { CONFIG } from '../config';

interface CliOptions {
  model?: string;
  verbose?: boolean;
  help?: boolean;
  listTools?: boolean;
  prompt?: string;
  chat?: boolean;
}

/**
 * Parse command line arguments
 */
export function parseArgs(args: string[]): CliOptions {
  const options: CliOptions = {};
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--model' || arg === '-m') {
      options.model = args[++i];
    } else if (arg === '--verbose' || arg === '-v') {
      options.verbose = true;
    } else if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--list-tools' || arg === '-l') {
      options.listTools = true;
    } else if (arg === '--chat' || arg === '-c') {
      options.chat = true;
    } else if (!arg.startsWith('-')) {
      // If we already have a prompt, append this arg to it
      if (options.prompt) {
        options.prompt += ' ' + arg;
      } else {
        // Otherwise, set it as the prompt
        options.prompt = arg;
      }
    }
  }
  
  return options;
}

/**
 * Display help information
 */
export function displayHelp(): void {
  console.log(`
LocalAssistant CLI

Usage:
  bun run index.ts [options] [prompt]

Options:
  -h, --help        Show this help message
  -m, --model       Specify the AI model to use (default: ${CONFIG.AI.MODEL})
  -v, --verbose     Enable verbose output
  -l, --list-tools  List available tools
  -c, --chat        Force chat mode even if a prompt is provided

Default Mode:
  Running without a prompt starts an interactive chat session.
  Tool use is automatically detected from your messages!

Chat Commands:
  /help             Show help message
  /clear            Clear chat history
  /model [name]     Show or change the current model
  /tool             Explicitly trigger a tool (e.g., /tool WeatherFromLocation location="New York")
  exit, quit        End the session

Examples:
  bun run index.ts                           # Start interactive chat session
  bun run index.ts "What is the weather in London?"
  bun run index.ts --model llama3.2 "Who is the CEO of Tesla?"
  bun run index.ts --verbose "What is located at 41.881832, -87.640406?"
  bun run index.ts --list-tools
  `);
}

/**
 * Display available tools
 */
export function displayTools(): void {
  console.log('Available Tools:');
  console.log('----------------');
  
  Object.values(TOOLS).forEach(tool => {
    console.log(`\n${tool.name}: ${tool.description}`);
    console.log('Parameters:');
    
    tool.parameters.forEach(param => {
      console.log(`  - ${param.name} (${param.type})${param.required ? ' [required]' : ''}: ${param.description}`);
    });
  });
}

/**
 * Run the CLI
 */
export async function runCli(args: string[] = process.argv.slice(2)): Promise<void> {
  const options = parseArgs(args);
  
  if (options.help) {
    displayHelp();
    return;
  }
  
  if (options.listTools) {
    displayTools();
    return;
  }
  
  if (options.model) {
    // Override the model in config
    (CONFIG.AI as any).MODEL = options.model;
  }
  
  if (options.verbose) {
    console.log('Verbose mode enabled');
    console.log('Using model:', CONFIG.AI.MODEL);
  }
  
  // Start chat mode if explicitly requested or if no prompt is provided
  if (options.chat || !options.prompt) {
    if (options.verbose) {
      console.log('Starting chat mode');
    }
    await startChatSession({
      model: options.model
    });
    return;
  }
  
  // Process the prompt
  await processPrompt(options.prompt);
}
