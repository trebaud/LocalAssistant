import type { FunctionParameter } from '../../types';
import { ApiService } from '../../services/api';
import { getParameterValue } from '../utils';

export async function WebSearch(parameters: FunctionParameter[]): Promise<{title: string, content: string}> {
  const query = getParameterValue('query', parameters);
  const result = await ApiService.webSearch(query);
  return result;
}
