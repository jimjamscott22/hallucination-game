import OpenAI from "openai";

let _client: OpenAI | null = null;

export function openaiClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Missing OPENAI_API_KEY. Add it to .env.local (you can copy .env.example)."
    );
  }

  if (_client) return _client;

  _client = new OpenAI({ apiKey });
  return _client;
}

export const OPENAI_MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
