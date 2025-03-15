import type { Tool } from '../../types';

export const WebSearch: Tool = {
  name: 'WebSearch',
  description: 'Search the web for a query',
  parameters: [
    {
      name: 'query',
      description: 'The query to search for',
      type: 'string',
      required: true,
    },
  ],
};
