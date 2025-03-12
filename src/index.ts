import ollama from 'ollama';
import { CONFIG } from './config';
import { toolsString, executeFunction } from './tools';
import { ToolError } from './types';

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
export async function processPrompt(prompt: string): Promise<void> {
  try {
    console.log('\nProcessing prompt:', prompt);
    
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

// Import and run the CLI if this is the main module
if (import.meta.main) {
  const { runCli } = await import('./cli/index.js');
  runCli().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}
