import type { Tool } from '../../types';

export const WeatherFromLocation: Tool = {
  name: 'WeatherFromLocation',
  description: 'Get the weather for a location',
  parameters: [
    {
      name: 'location',
      description: 'The location to get the weather for',
      type: 'string',
      required: true,
    },
  ],
};
