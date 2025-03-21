import type { Tool } from '../../types';

export const ReadFile: Tool = {
  name: 'ReadFile',
  description: 'Read contents of a file at the specified path',
  parameters: [
    {
      name: 'path',
      description: 'Path to the file to read',
      type: 'string',
      required: true,
    }
  ]
};
