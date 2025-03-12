/**
 * Represents a tool's parameter definition
 */
export interface ToolParameter {
  name: string;
  description: string;
  type: string;
  required: boolean;
}

/**
 * Represents a tool definition
 */
export interface Tool {
  name: string;
  description: string;
  parameters: ToolParameter[];
}

/**
 * Represents a parameter passed to a function
 */
export interface FunctionParameter {
  parameterName: string;
  parameterValue: string;
}

/**
 * API Response types
 */
export interface GeocodingResponse {
  lat: string;
  lon: string;
  display_name?: string;
}

export interface WeatherResponse {
  current: {
    temperature_2m: number;
  };
}

export interface SearchResponse {
  results: Array<{
    title: string;
    content: string;
  }>;
}

/**
 * Error types
 */
export class ToolError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = 'ToolError';
  }
}
