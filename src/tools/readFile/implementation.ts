import { promises as fs } from 'fs';
import type { FunctionParameter } from '../../types';
import { ToolError } from '../../types';
import { getParameterValue } from '../utils';

export async function ReadFile(parameters: FunctionParameter[]): Promise<string> {
  const filePath = getParameterValue('path', parameters);
  
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return content;
  } catch (error) {
    throw new ToolError(
      `Failed to read file: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'FILE_READ_ERROR'
    );
  }
}
