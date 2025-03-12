import type { Tool } from '../types';

export const TOOLS: Record<string, Tool> = {
  WeatherFromLocation: {
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
  },

  WeatherFromLatLon: {
    name: 'WeatherFromLatLon',
    description: 'Get the weather for a location using coordinates',
    parameters: [
      {
        name: 'latitude',
        description: 'The latitude of the location',
        type: 'string',
        required: true,
      },
      {
        name: 'longitude',
        description: 'The longitude of the location',
        type: 'string',
        required: true,
      },
    ],
  },

  LatLonToCity: {
    name: 'LatLonToCity',
    description: 'Get the city name for given coordinates',
    parameters: [
      {
        name: 'latitude',
        description: 'The latitude of the location',
        type: 'string',
        required: true,
      },
      {
        name: 'longitude',
        description: 'The longitude of the location',
        type: 'string',
        required: true,
      },
    ],
  },

  WebSearch: {
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
  },
};

export const toolsString = JSON.stringify({ tools: Object.values(TOOLS) }, null, 2);
