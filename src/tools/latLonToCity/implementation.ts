import type { FunctionParameter } from '../../types';
import { ApiService } from '../../services/api';
import { getParameterValue } from '../utils';

export default async function LatLonToCity(parameters: FunctionParameter[]): Promise<string> {
  const latitude = getParameterValue('latitude', parameters);
  const longitude = getParameterValue('longitude', parameters);
  const cityName = await ApiService.getCityFromCoordinates(latitude, longitude);
  return cityName;
}
