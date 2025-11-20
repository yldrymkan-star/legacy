// Removed type-only imports from @google/genai
// GenerateContentParameters, FunctionDeclaration, Tool, are type-only imports
// and are removed from this plain JavaScript file.

export const MessageRole = {
  USER: 'user',
  MODEL: 'model',
  INFO: 'info', // For system messages, e.g., "AI is thinking..."
};

// Re-defining runtime relevant structures as plain JavaScript objects
// For `ChatMessage`, `GroundingUrl`, `AiConfig`, `Blob`, `FunctionCall`, `ToolResponse`
// these are no longer 'interface' but conceptual structures managed by runtime code.

export const controlLightFunctionDeclaration = {
  name: 'controlLight',
  parameters: {
    type: 'OBJECT', // Using string literal as Type enum is not imported
    description: 'Set the brightness and color temperature of a room light.',
    properties: {
      brightness: {
        type: 'NUMBER', // Using string literal
        description:
          'Light level from 0 to 100. Zero is off and 100 is full brightness.',
      },
      colorTemperature: {
        type: 'STRING', // Using string literal
        description:
          'Color temperature of the light fixture such as `daylight`, `cool` or `warm`.',
      },
    },
    required: ['brightness', 'colorTemperature'],
  },
};

// Removed `toolsConfig` as it's not directly used here after `controlLightFunctionDeclaration` is used.