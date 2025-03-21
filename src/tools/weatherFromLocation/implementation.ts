import type { FunctionParameter } from '../../types';
import { ApiService } from '../../services/api';
import { getParameterValue } from '../utils';

export default async function WeatherFromLocation(parameters: FunctionParameter[]): Promise<string> {
  const location = getParameterValue('location', parameters);
  const [lat, lon] = await ApiService.getCityCoordinates(location);
  const temperature = await ApiService.getWeather(lat, lon);
  return `${temperature} degrees Fahrenheit`;
}
