import type { FunctionParameter } from '../../types';
import { ApiService } from '../../services/api';
import { getParameterValue } from '../utils';

export async function WeatherFromLatLon(parameters: FunctionParameter[]): Promise<string> {
  const latitude = getParameterValue('latitude', parameters);
  const longitude = getParameterValue('longitude', parameters);
  const temperature = await ApiService.getWeather(latitude, longitude);
  return `${temperature} degrees Fahrenheit`;
}
