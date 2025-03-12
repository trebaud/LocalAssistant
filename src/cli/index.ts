import { processPrompt } from '../index';
import { TOOLS } from '../tools/definitions';
import { CONFIG } from '../config';

interface CliOptions {
  model?: string;
  verbose?: boolean;
  help?: boolean;
  listTools?: boolean;
  prompt?: string;
  mock?: boolean;
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
    } else if (arg === '--mock') {
      options.mock = true;
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
Function Calling CLI

Usage:
  bun run index.ts [options] [prompt]

Options:
  -h, --help        Show this help message
  -m, --model       Specify the AI model to use (default: ${CONFIG.AI.MODEL})
  -v, --verbose     Enable verbose output
  -l, --list-tools  List available tools
  --mock            Use mock responses instead of calling the AI model

Examples:
  bun run index.ts "What is the weather in London?"
  bun run index.ts --model llama3.2 "Who is the CEO of Tesla?"
  bun run index.ts --verbose "What is located at 41.881832, -87.640406?"
  bun run index.ts --list-tools
  bun run index.ts --mock "What is the weather in London?"
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
  
  if (!options.prompt) {
    console.log('No prompt provided. Use --help for usage information.');
    return;
  }
  
  if (options.mock) {
    console.log('Using mock mode');
    // This will be implemented in the mock module
    const { runMockPrompt } = await import('../mock/index.js');
    await runMockPrompt(options.prompt);
  } else {
    await processPrompt(options.prompt);
  }
}
