import type { FunctionParameter } from '../types';
import { ToolError } from '../types';

/**
 * Helper function to get parameter value from parameters array
 */
export function getParameterValue(parameterName: string, parameters: FunctionParameter[]): string {
  const param = parameters.find(p => p.parameterName === parameterName);
  if (!param) {
    throw new ToolError(`Required parameter '${parameterName}' not found`, 'MISSING_PARAMETER');
  }
  return param.parameterValue;
}
