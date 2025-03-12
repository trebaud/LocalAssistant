import type { FunctionParameter } from '../types';
import { ToolError } from '../types';
import { TOOLS } from '../tools/definitions';

/**
 * Mock responses for each tool
 */
const mockResponses: Record<string, (params: FunctionParameter[]) => string> = {
  WeatherFromLocation: (params) => {
    const location = getParameterValue('location', params);
    return `72.5 degrees Fahrenheit (Mock response for ${location})`;
  },
  
  WeatherFromLatLon: (params) => {
    const lat = getParameterValue('latitude', params);
    const lon = getParameterValue('longitude', params);
    return `68.3 degrees Fahrenheit (Mock response for coordinates ${lat}, ${lon})`;
  },
  
  LatLonToCity: (params) => {
    const lat = getParameterValue('latitude', params);
    const lon = getParameterValue('longitude', params);
    return `Chicago, IL, USA (Mock response for coordinates ${lat}, ${lon})`;
  },
  
  WebSearch: (params) => {
    const query = getParameterValue('query', params);
    return `Mock Search Result\nHere is some information about "${query}" that would normally come from a web search.`;
  },
};

/**
 * Helper function to get parameter value from parameters array
 */
function getParameterValue(parameterName: string, parameters: FunctionParameter[]): string {
  const param = parameters.find(p => p.parameterName === parameterName);
  if (!param) {
    throw new ToolError(`Required parameter '${parameterName}' not found`, 'MISSING_PARAMETER');
  }
  return param.parameterValue;
}

/**
 * Mock AI response for a given prompt
 */
function mockAIResponse(prompt: string): { functionName: string; parameters: FunctionParameter[] } {
  // Simple keyword matching to determine which tool to use
  const lowerPrompt = prompt.toLowerCase();
  
  if (lowerPrompt.includes('weather') && (lowerPrompt.includes('latitude') || lowerPrompt.includes('longitude') || lowerPrompt.match(/\b\d+\.\d+\b/))) {
    return {
      functionName: 'WeatherFromLatLon',
      parameters: [
        { parameterName: 'latitude', parameterValue: '41.881832' },
        { parameterName: 'longitude', parameterValue: '-87.640406' },
      ],
    };
  } else if (lowerPrompt.includes('weather')) {
    // Extract location from prompt (simple implementation)
    const locationMatch = prompt.match(/weather in ([a-zA-Z\s]+)/i);
    const location = locationMatch ? locationMatch[1].trim() : 'London';
    
    return {
      functionName: 'WeatherFromLocation',
      parameters: [
        { parameterName: 'location', parameterValue: location },
      ],
    };
  } else if (lowerPrompt.includes('located at') || (lowerPrompt.includes('city') && lowerPrompt.match(/\b\d+\.\d+\b/))) {
    return {
      functionName: 'LatLonToCity',
      parameters: [
        { parameterName: 'latitude', parameterValue: '41.881832' },
        { parameterName: 'longitude', parameterValue: '-87.640406' },
      ],
    };
  } else {
    // Default to web search
    return {
      functionName: 'WebSearch',
      parameters: [
        { parameterName: 'query', parameterValue: prompt },
      ],
    };
  }
}

/**
 * Execute a mock tool
 */
async function executeMockFunction(functionName: string, parameters: FunctionParameter[]): Promise<void> {
  const mockResponse = mockResponses[functionName];
  
  if (!mockResponse) {
    throw new ToolError(`Unknown function: ${functionName}`, 'UNKNOWN_FUNCTION');
  }
  
  const result = mockResponse(parameters);
  console.log(result);
}

/**
 * Run a prompt with mock responses
 */
export async function runMockPrompt(prompt: string): Promise<void> {
  try {
    console.log('\nProcessing prompt (MOCK MODE):', prompt);
    
    const mockResponse = mockAIResponse(prompt);
    console.log(`\nMock AI selected tool: ${mockResponse.functionName}`);
    console.log('Parameters:', JSON.stringify(mockResponse.parameters, null, 2));
    
    await executeMockFunction(mockResponse.functionName, mockResponse.parameters);
  } catch (error) {
    if (error instanceof ToolError) {
      console.error(`Tool Error (${error.code}):`, error.message);
    } else {
      console.error('Unexpected error:', error instanceof Error ? error.message : 'Unknown error');
    }
  }
}

/**
 * Run mock tests for all tools
 */
export async function runMockTests(): Promise<void> {
  console.log('Running mock tests for all tools...\n');
  
  const tests = [
    'What is the weather in London?',
    'What is the weather at 41.881832, -87.640406?',
    'Who is the current CEO of Tesla?',
    'What is located at 41.881832, -87.640406?',
  ];
  
  for (const prompt of tests) {
    await runMockPrompt(prompt);
    console.log('\n---\n');
  }
  
  console.log('All mock tests completed.');
}
