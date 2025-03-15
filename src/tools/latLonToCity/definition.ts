import type { Tool } from '../../types';

export const LatLonToCity: Tool = {
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
};
