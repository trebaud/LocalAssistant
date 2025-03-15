import { WeatherFromLocation } from './weatherFromLocation/definition';
import { WeatherFromLatLon } from './weatherFromLatLon/definition';
import { LatLonToCity } from './latLonToCity/definition';
import { WebSearch } from './webSearch/definition';

import { WeatherFromLocation as WeatherFromLocationImpl } from './weatherFromLocation/implementation';
import { WeatherFromLatLon as WeatherFromLatLonImpl } from './weatherFromLatLon/implementation';
import { LatLonToCity as LatLonToCityImpl } from './latLonToCity/implementation';
import { WebSearch as WebSearchImpl } from './webSearch/implementation';

import type { Tool, FunctionParameter } from '../types';
import { ToolError } from '../types';

// Export all tool definitions
export const TOOLS: Record<string, Tool> = {
  WeatherFromLocation,
  WeatherFromLatLon,
  LatLonToCity,
  WebSearch,
};

// Export the tools string for system prompts
export const toolsString = JSON.stringify({ tools: Object.values(TOOLS) }, null, 2);

// Tool implementations mapping
const toolImplementations = {
  WeatherFromLocation: WeatherFromLocationImpl,
  WeatherFromLatLon: WeatherFromLatLonImpl,
  LatLonToCity: LatLonToCityImpl,
  WebSearch: WebSearchImpl,
};

/**
 * Execute a tool by name with given parameters
 */
export async function executeFunction(
  functionName: string,
  parameters: FunctionParameter[]
): Promise<string | object> {
  const implementation = toolImplementations[functionName as keyof typeof toolImplementations];
  if (!implementation) {
    throw new ToolError(`Unknown function: ${functionName}`, 'UNKNOWN_FUNCTION');
  }
  
  return await implementation(parameters);
}
