import { CONFIG } from '../config';
import type { GeocodingResponse, WeatherResponse, SearchResponse } from '../types';
import { ToolError } from '../types';

/**
 * Generic API call wrapper with error handling
 */
async function apiCall<T>(url: string, errorCode: string): Promise<T> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new ToolError(`API request failed with status ${response.status}`, errorCode);
    }
    return await response.json() as T;
  } catch (error) {
    if (error instanceof ToolError) {
      throw error;
    }
    throw new ToolError(`Failed to fetch data: ${error instanceof Error ? error.message : 'Unknown error'}`, errorCode);
  }
}

export class ApiService {
  /**
   * Get latitude and longitude for a given city
   */
  static async getCityCoordinates(city: string): Promise<[string, string]> {
    const encodedCity = encodeURIComponent(city);
    const url = `${CONFIG.GEOCODING.BASE_URL}/search?q=${encodedCity}&format=json`;
    
    const response = await apiCall<GeocodingResponse[]>(url, 'GEOCODING_ERROR');
    if (!response.length) {
      throw new ToolError(`No coordinates found for city: ${city}`, 'CITY_NOT_FOUND');
    }
    
    return [response[0].lat, response[0].lon];
  }

  /**
   * Get city name for given coordinates
   */
  static async getCityFromCoordinates(latitude: string, longitude: string): Promise<string> {
    const url = `${CONFIG.GEOCODING.BASE_URL}/reverse?lat=${latitude}&lon=${longitude}&format=json`;
    
    const response = await apiCall<GeocodingResponse>(url, 'REVERSE_GEOCODING_ERROR');
    if (!response.display_name) {
      throw new ToolError(`No location found for coordinates: ${latitude}, ${longitude}`, 'LOCATION_NOT_FOUND');
    }
    
    return response.display_name;
  }

  /**
   * Get weather for given coordinates
   */
  static async getWeather(latitude: string, longitude: string): Promise<number> {
    const url = new URL(CONFIG.WEATHER.BASE_URL);
    url.searchParams.append('latitude', latitude);
    url.searchParams.append('longitude', longitude);
    url.searchParams.append('current', 'temperature_2m');
    url.searchParams.append('temperature_unit', CONFIG.WEATHER.UNITS.TEMPERATURE);
    url.searchParams.append('wind_speed_unit', CONFIG.WEATHER.UNITS.WIND_SPEED);
    url.searchParams.append('forecast_days', CONFIG.WEATHER.FORECAST_DAYS.toString());
    
    const response = await apiCall<WeatherResponse>(url.toString(), 'WEATHER_ERROR');
    return response.current.temperature_2m;
  }

  /**
   * Perform web search
   */
  static async webSearch(query: string): Promise<{ title: string; content: string }> {
    const encodedQuery = encodeURIComponent(query);
    const url = `${CONFIG.SEARCH.BASE_URL}/search?q=${encodedQuery}&format=json`;
    
    const response = await apiCall<SearchResponse>(url, 'SEARCH_ERROR');
    if (!response.results.length) {
      throw new ToolError(`No results found for query: ${query}`, 'NO_SEARCH_RESULTS');
    }
    
    return {
      title: response.results[0].title,
      content: response.results[0].content,
    };
  }
}
