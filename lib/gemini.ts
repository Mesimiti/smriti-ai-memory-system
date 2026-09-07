import { GoogleGenAI } from "@google/genai";

// Model Fallback Ladder ordered by latency and availability
export const MODEL_FALLBACK_LADDER = [
  "gemini-3.6-flash",
  "gemini-3.1-flash-lite",
  "gemini-flash-latest",
  "gemini-3.7-flash",
] as const;

let aiClient: GoogleGenAI | null = null;

export function isGeminiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 0);
}

export function getGeminiClient(): GoogleGenAI | null {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || !apiKey.trim()) {
      console.warn("[Gemini API Warning]: GEMINI_API_KEY is not set. Deterministic fallback engine will be utilized.");
      return null;
    }
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
}

/**
 * Executes a generation request through the Resilient Model Fallback Ladder.
 * Catches 503, 429, 404, and 500 recoverable errors and tries the next model.
 * If Gemini is not configured or all models fail, throws an identifiable error for route-level deterministic fallback.
 */
export async function generateContentWithFallback(params: {
  contents: any;
  config?: any;
}): Promise<{ text: string; modelUsed: string }> {
  const ai = getGeminiClient();
  if (!ai) {
    throw new Error("GEMINI_NOT_CONFIGURED: GEMINI_API_KEY environment variable is not available.");
  }

  const errors: Array<{ model: string; error: string }> = [];

  for (const model of MODEL_FALLBACK_LADDER) {
    try {
      // Execute generateContent with a defensive 25s timeout to prevent hanging requests
      const responsePromise = ai.models.generateContent({
        model,
        contents: params.contents,
        config: params.config,
      });

      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error(`Timeout: ${model} took longer than 25s`)), 25000);
      });

      const response = await Promise.race([responsePromise, timeoutPromise]);
      const responseText = response.text || "";

      if (responseText.trim().length > 0) {
        return { text: responseText, modelUsed: model };
      }
    } catch (err: any) {
      const errorMessage = err?.message || String(err);
      const status = err?.status || err?.statusCode || "";
      console.warn(`[Gemini Fallback] Model ${model} failed (${status}): ${errorMessage}`);
      errors.push({ model, error: errorMessage });
    }
  }

  // If all models in the ladder failed
  const errorDetails = errors.map((e) => `[${e.model}: ${e.error}]`).join(", ");
  throw new Error(`ALL_MODELS_EXHAUSTED: All Gemini fallback models exhausted. Details: ${errorDetails}`);
}

