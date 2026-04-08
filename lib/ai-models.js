// AI Model configurations — OpenRouter entries use :free tier only (no paid models).

export const OPENROUTER_FREE_FALLBACK_MODELS = [
  "openai/gpt-oss-120b:free",
  "openai/gpt-oss-20b:free",
  "qwen/qwen3-next-80b-a3b-instruct:free",
  "google/gemma-4-31b-it:free",
  "google/gemma-4-26b-a4b-it:free",
  "z-ai/glm-4.5-air:free",
  "qwen/qwen3-coder:free",
  "nvidia/nemotron-nano-9b-v2:free",
  "stepfun/step-3.5-flash:free",
  "minimax/minimax-m2.5:free",
];

export const AI_MODELS = {
  "openrouter-gpt-oss-120b": {
    id: "openrouter-gpt-oss-120b",
    name: "OpenAI GPT-OSS 120B",
    provider: "openrouter",
    model: "openai/gpt-oss-120b:free",
  },
  "openrouter-gpt-oss-20b": {
    id: "openrouter-gpt-oss-20b",
    name: "OpenAI GPT-OSS 20B",
    provider: "openrouter",
    model: "openai/gpt-oss-20b:free",
  },
  "openrouter-qwen-next-80b": {
    id: "openrouter-qwen-next-80b",
    name: "Qwen3 Next 80B",
    provider: "openrouter",
    model: "qwen/qwen3-next-80b-a3b-instruct:free",
  },
  "openrouter-gemma-31b": {
    id: "openrouter-gemma-31b",
    name: "Gemma 4 31B",
    provider: "openrouter",
    model: "google/gemma-4-31b-it:free",
  },
  "openrouter-gemma-26b": {
    id: "openrouter-gemma-26b",
    name: "Gemma 4 26B",
    provider: "openrouter",
    model: "google/gemma-4-26b-a4b-it:free",
  },
  "openrouter-glm-air": {
    id: "openrouter-glm-air",
    name: "GLM 4.5 Air",
    provider: "openrouter",
    model: "z-ai/glm-4.5-air:free",
  },
  "openrouter-qwen-coder": {
    id: "openrouter-qwen-coder",
    name: "Qwen3 Coder",
    provider: "openrouter",
    model: "qwen/qwen3-coder:free",
  },
  "openrouter-nemotron-nano": {
    id: "openrouter-nemotron-nano",
    name: "Nemotron Nano 9B",
    provider: "openrouter",
    model: "nvidia/nemotron-nano-9b-v2:free",
  },
  "openrouter-step-flash": {
    id: "openrouter-step-flash",
    name: "Step 3.5 Flash",
    provider: "openrouter",
    model: "stepfun/step-3.5-flash:free",
  },
  "openrouter-minimax": {
    id: "openrouter-minimax",
    name: "MiniMax M2.5",
    provider: "openrouter",
    model: "minimax/minimax-m2.5:free",
  },
  "gemini-flash": {
    id: "gemini-flash",
    name: "Google Gemini 2.5 Flash",
    provider: "gemini",
    model: "gemini-2.5-flash",
  },
};

const MODEL_ID_ALIASES = {
  "openrouter-llama-free": "openrouter-gpt-oss-120b",
  "openrouter-deepseek-free": "openrouter-qwen-next-80b",
};

export function getModelConfig(modelId) {
  const id = MODEL_ID_ALIASES[modelId] || modelId;
  return AI_MODELS[id] || AI_MODELS["openrouter-gpt-oss-120b"];
}
