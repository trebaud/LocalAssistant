import type { FunctionParameter } from '../types';
import { ToolError } from '../types';
import { ApiService } from '../services/api';

/**
 * Helper function to get parameter value from parameters array
 */
function getParameterValue(parameterName: string, parameters: FunctionParameter[]): string {
  const param = parameters.find(p => p.parameterName === parameterName);
  if (!param) {
    throw new ToolError(`Required parameter '${parameterName}' not found`, 'MISSING_PARAMETER');
  }
  return param.parameterValue;
}

/**
 * Tool implementations
 */
export const toolImplementations = {
  async WeatherFromLocation(parameters: FunctionParameter[]): Promise<void> {
    const location = getParameterValue('location', parameters);
    const [lat, lon] = await ApiService.getCityCoordinates(location);
    const temperature = await ApiService.getWeather(lat, lon);
    console.log(`${temperature} degrees Fahrenheit`);
  },

  async WeatherFromLatLon(parameters: FunctionParameter[]): Promise<void> {
    const latitude = getParameterValue('latitude', parameters);
    const longitude = getParameterValue('longitude', parameters);
    const temperature = await ApiService.getWeather(latitude, longitude);
    console.log(`${temperature} degrees Fahrenheit`);
  },

  async LatLonToCity(parameters: FunctionParameter[]): Promise<void> {
    const latitude = getParameterValue('latitude', parameters);
    const longitude = getParameterValue('longitude', parameters);
    const cityName = await ApiService.getCityFromCoordinates(latitude, longitude);
    console.log(cityName);
  },

  async WebSearch(parameters: FunctionParameter[]): Promise<void> {
    const query = getParameterValue('query', parameters);
    const result = await ApiService.webSearch(query);
    console.log(`${result.title}\n${result.content}\n`);
  },
};

/**
 * Execute a tool by name with given parameters
 */
export async function executeFunction(
  functionName: string,
  parameters: FunctionParameter[]
): Promise<void> {
  const implementation = toolImplementations[functionName as keyof typeof toolImplementations];
  if (!implementation) {
    throw new ToolError(`Unknown function: ${functionName}`, 'UNKNOWN_FUNCTION');
  }
  
  await implementation(parameters);
}
