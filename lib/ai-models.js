// AI Model configurations
export const AI_MODELS = {
  gemini: {
    id: 'gemini',
    name: 'Google Gemini 2.0 Flash',
    provider: 'gemini',
    model: 'gemini-2.0-flash', // Fast and stable model
  },
  'gemini-pro': {
    id: 'gemini-pro',
    name: 'Google Gemini Pro Latest',
    provider: 'gemini',
    model: 'gemini-pro-latest', // Latest Pro model
  }, 
  'gemini-flash': {
    id: 'gemini-flash',
    name: 'Google Gemini 2.5 Flash',
    provider: 'gemini',
    model: 'gemini-2.5-flash',  // Newest Flash model
  },
}

export function getModelConfig(modelId) {
  return AI_MODELS[modelId] || AI_MODELS.gemini
}

