import { GoogleGenAI } from "@google/genai";

// Model Fallback Ladder ordered by latency and availability
export const MODEL_FALLBACK_LADDER = [
  "gemini-3.6-flash",
  "gemini-3.1-flash-lite",
  "gemini-flash-latest",
  "gemini-3.7-flash",
] as const;

let aiClient: GoogleGenAI | null = null;

export function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is missing.");
    }
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
}

/**
 * Executes a generation request through the Resilient Model Fallback Ladder.
 * Catches 503, 429, 404, and 500 recoverable errors and tries the next model.
 */
export async function generateContentWithFallback(params: {
  contents: any;
  config?: any;
}): Promise<{ text: string; modelUsed: string }> {
  const ai = getGeminiClient();
  const errors: Array<{ model: string; error: string }> = [];

  for (const model of MODEL_FALLBACK_LADDER) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: params.contents,
        config: params.config,
      });

      const responseText = response.text || "";
      return { text: responseText, modelUsed: model };
    } catch (err: any) {
      const errorMessage = err?.message || String(err);
      const status = err?.status || err?.statusCode || "";
      console.warn(`[Gemini Fallback] Model ${model} failed (${status}): ${errorMessage}`);
      errors.push({ model, error: errorMessage });

      // Check if error is recoverable
      const isRecoverable =
        status === 503 ||
        status === 429 ||
        status === 404 ||
        status === 500 ||
        errorMessage.includes("429") ||
        errorMessage.includes("503") ||
        errorMessage.includes("resource exhausted") ||
        errorMessage.includes("unavailable") ||
        errorMessage.includes("overloaded") ||
        errorMessage.includes("not found");

      if (!isRecoverable && model === MODEL_FALLBACK_LADDER[0]) {
        // If it's a fatal validation or syntax error, log and still attempt one fallback
      }
    }
  }

  // If all models in the ladder failed
  const errorDetails = errors.map((e) => `[${e.model}: ${e.error}]`).join(", ");
  throw new Error(`All Gemini fallback models exhausted. Details: ${errorDetails}`);
}
