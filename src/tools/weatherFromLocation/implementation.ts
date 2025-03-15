import type { FunctionParameter } from '../../types';
import { ApiService } from '../../services/api';
import { getParameterValue } from '../utils';

export async function WeatherFromLocation(parameters: FunctionParameter[]): Promise<void> {
  const location = getParameterValue('location', parameters);
  const [lat, lon] = await ApiService.getCityCoordinates(location);
  const temperature = await ApiService.getWeather(lat, lon);
  console.log(`${temperature} degrees Fahrenheit`);
}
