import type { FunctionParameter } from '../../types';
import { ApiService } from '../../services/api';
import { getParameterValue } from '../utils';

export async function WebSearch(parameters: FunctionParameter[]): Promise<void> {
  const query = getParameterValue('query', parameters);
  const result = await ApiService.webSearch(query);
  console.log(`${result.title}\n${result.content}\n`);
}
