import type { Tool, FunctionParameter } from '../types';
import { ToolError } from '../types';
import { ReadFile, ReadFileImpl } from './readFile';
import { WeatherFromLocation, WeatherFromLocationImpl } from './weatherFromLocation';
import { WeatherFromLatLon, WeatherFromLatLonImpl } from './weatherFromLatLon';
import { LatLonToCity, LatLonToCityImpl } from './latLonToCity';
import { WebSearch, WebSearchImpl } from './webSearch';

// Tool registry to store definitions and implementations
const toolRegistry: Record<string, {
  definition: Tool,
  implementation: (params: FunctionParameter[]) => Promise<string | object>
}> = {};

/**
 * Register a tool with its definition and implementation
 */
function registerTool(
  definition: Tool,
  implementation: (params: FunctionParameter[]) => Promise<string | object>
) {
  toolRegistry[definition.name] = {
    definition,
    implementation
  };
}

// Register all tools
registerTool(WeatherFromLocation, WeatherFromLocationImpl);
registerTool(WeatherFromLatLon, WeatherFromLatLonImpl);
registerTool(LatLonToCity, LatLonToCityImpl);
registerTool(WebSearch, WebSearchImpl);
registerTool(ReadFile, ReadFileImpl);

// Export all tool definitions
export const TOOLS: Record<string, Tool> = Object.fromEntries(
  Object.entries(toolRegistry).map(([name, { definition }]) => [name, definition])
);

// Export the tools string for system prompts
export const toolsString = JSON.stringify({ tools: Object.values(TOOLS) }, null, 2);

/**
 * Execute a tool by name with given parameters
 */
export async function executeFunction(
  functionName: string, 
  parameters: FunctionParameter[]
): Promise<string | object> {
  const tool = toolRegistry[functionName];
  if (!tool) {
    throw new ToolError(`Unknown function: ${functionName}`, 'UNKNOWN_FUNCTION');
  }
  
  return await tool.implementation(parameters);
}
