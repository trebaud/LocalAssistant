import type { Tool } from '../../types';

export const WeatherFromLatLon: Tool = {
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
};
