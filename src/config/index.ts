export const CONFIG = {
  GEOCODING: {
    BASE_URL: 'https://nominatim.openstreetmap.org',
  },
  WEATHER: {
    BASE_URL: 'https://api.open-meteo.com/v1/forecast',
    UNITS: {
      TEMPERATURE: 'fahrenheit',
      WIND_SPEED: 'mph',
    },
    FORECAST_DAYS: 1,
  },
  SEARCH: {
    BASE_URL: 'http://localhost:3333',
  },
  AI: {
    MODEL: 'llama3.2',
  },
} as const;
