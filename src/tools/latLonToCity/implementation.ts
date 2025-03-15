import type { FunctionParameter } from '../../types';
import { ApiService } from '../../services/api';
import { getParameterValue } from '../utils';

export async function LatLonToCity(parameters: FunctionParameter[]): Promise<void> {
  const latitude = getParameterValue('latitude', parameters);
  const longitude = getParameterValue('longitude', parameters);
  const cityName = await ApiService.getCityFromCoordinates(latitude, longitude);
  console.log(cityName);
}
