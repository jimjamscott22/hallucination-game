import OpenAI from "openai";

let _client: OpenAI | null = null;

export function openaiClient(): OpenAI {
  const baseURL = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434/v1";
  
  if (_client) return _client;

  // Ollama uses OpenAI-compatible API but doesn't require an API key
  _client = new OpenAI({ 
    baseURL,
    apiKey: "ollama" // Required by the client but not used by Ollama
  });
  return _client;
}

export const OPENAI_MODEL = process.env.OLLAMA_MODEL ?? "llama3.2:latest";
