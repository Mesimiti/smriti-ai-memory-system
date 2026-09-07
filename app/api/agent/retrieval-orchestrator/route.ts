import { NextRequest, NextResponse } from "next/server";
import { generateContentWithFallback } from "@/lib/gemini";
import {
  rankMemories,
  rankWisdomCandidates,
  rankBookWisdom,
  buildRetrievalPromptContext,
} from "@/lib/retrieval";
import {
  RetrievalOrchestratorResult,
  StructuredMemory,
  WisdomEntry,
  BookWisdomEntry,
} from "@/lib/types";

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  try {
    let body: any = null;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON payload in request body." },
        { status: 400 }
      );
    }

    const payload = body && typeof body === "object" ? body : {};
    const rawMessages = Array.isArray(payload.messages) ? payload.messages : [];

    if (rawMessages.length === 0) {
      return NextResponse.json(
        { error: "At least one message is required for retrieval orchestration." },
        { status: 400 }
      );
    }

    // Extract the active user reflection query from the latest user message
    const lastUserMessage = [...rawMessages].reverse().find((m: any) => m.role === "user");
    const queryText =
      lastUserMessage && typeof lastUserMessage.content === "string"
        ? lastUserMessage.content.trim()
        : "";

    if (!queryText) {
      return NextResponse.json(
        { error: "A non-empty user reflection is required to orchestrate retrieval." },
        { status: 400 }
      );
    }

    // Defensive clamping of history
    const sanitizedHistory = rawMessages.slice(-14).map((m: any) => {
      const role = m.role === "assistant" || m.role === "model" ? "model" : "user";
      const content = typeof m.content === "string" ? m.content.slice(0, 4000) : "";
      return { role, parts: [{ text: content }] };
    });

    const validStyles = ["coach", "practical", "mentor", "motivational", "philosophical"];
    const styleKey =
      typeof payload.reflectionStyle === "string" &&
      validStyles.includes(payload.reflectionStyle.toLowerCase())
        ? payload.reflectionStyle.toLowerCase()
        : "coach";

    const STYLE_PERSONA_PROMPTS: Record<string, string> = {
      coach: `### Active Reflection Style: COACH (Self-Discovery & Reflection)
- Core Directive: Focus on self-discovery, active inquiry, and deep personal reflection.
- Guidelines:
  * Act as a Socratic mirror. Ask 1–2 thoughtful coaching questions that invite the user to examine assumptions.
  * When referencing retrieved past memories, connect them warmly: "Earlier you noticed a pattern around..."`,

      practical: `### Active Reflection Style: PRACTICAL (Actions, Execution & Problem Solving)
- Core Directive: Focus on actions, tangible execution, and concrete problem solving.
- Guidelines:
  * Cut through ambiguity to identify high-leverage immediate next steps.
  * Connect past memory action items to today's execution roadblocks.`,

      mentor: `### Active Reflection Style: MENTOR (Career Growth, Leadership & Decision Making)
- Core Directive: Focus on career growth, leadership presence, high-stakes decision making, and long-term development.
- Guidelines:
  * Offer seasoned perspective on career trajectories and strategic tradeoffs.
  * Ground today's dilemma in the user's prior growth milestones.`,

      motivational: `### Active Reflection Style: MOTIVATIONAL (Encouragement, Progress & Confidence)
- Core Directive: Focus on encouragement, celebrating progress, reinforcing innate strengths, and building confidence.
- Guidelines:
  * Validate persistence and celebrate progress by reminding the user how they overcame similar trials in past memories.`,

      philosophical: `### Active Reflection Style: PHILOSOPHICAL (Meaning, Values, Identity & Purpose)
- Core Directive: Focus on deeper meaning, core values, identity alignment, and existential purpose.
- Guidelines:
  * Probe beyond surface events into foundational principles and identity alignment.`
    };

    const activePersonaPrompt = STYLE_PERSONA_PROMPTS[styleKey] || STYLE_PERSONA_PROMPTS.coach;

    // Retrieve and parse memory vault candidates
    const rawMemories: StructuredMemory[] = Array.isArray(payload.memories)
      ? payload.memories
      : [];

    // Retrieve and parse wisdom candidates
    const rawWisdom: WisdomEntry[] = Array.isArray(payload.wisdomList)
      ? payload.wisdomList
      : [];

    // Retrieve and parse book wisdom candidates
    const rawBooks: BookWisdomEntry[] = Array.isArray(payload.bookList)
      ? payload.bookList
      : [];

    // User consent parameters
    // IMPORTANT: Wisdom retrieval must remain opt-in!
    // Never automatically retrieve Wisdom Circle entries.
    const explicitConsentedIds: string[] = Array.isArray(payload.consentedWisdomIds)
      ? payload.consentedWisdomIds
      : [];

    const sessionWisdomOptIn = Boolean(payload.allowWisdomOptIn);

    // =========================================================================
    // 1. Automatic Memory Vault Retrieval
    // Rule: Memory retrieval may happen automatically.
    // =========================================================================
    const retrievedMemories = rankMemories(queryText, rawMemories, 0.35, 3);

    // =========================================================================
    // 2. Opt-In Wisdom Circle Retrieval
    // Rule: Never automatically retrieve Wisdom Circle entries. Always ask for user consent before using Wisdom Circle content.
    // =========================================================================
    const effectiveConsentedIds = sessionWisdomOptIn
      ? rawWisdom.map((w) => w.id)
      : explicitConsentedIds;

    const allWisdomCandidates = rankWisdomCandidates(
      queryText,
      rawWisdom,
      effectiveConsentedIds,
      0.38,
      4
    );

    // Strict Partitioning: Only consented wisdom can enter Gemini synthesis!
    const consentedWisdomInjected = allWisdomCandidates.filter((w) => w.isConsented);
    const candidateWisdomPendingConsent = allWisdomCandidates.filter((w) => !w.isConsented);

    // =========================================================================
    // 3. Book Wisdom Retrieval (Literature Insights & Core Principles)
    // Rule: Retrieve relevant book lessons, quotes, and reflections when reflecting or solving problems
    // =========================================================================
    const retrievedBooks = rankBookWisdom(queryText, rawBooks, 0.28, 3);

    // =========================================================================
    // 4. Assemble Grounded Prompt with Memory Provenance, Consented Wisdom & Books
    // =========================================================================
    const { promptSection, provenance } = buildRetrievalPromptContext(
      retrievedMemories,
      consentedWisdomInjected,
      retrievedBooks
    );

    const systemInstruction = `You are Smriti AI (स्मृति), a Personal Memory Agent and trusted Second Brain companion.
Tagline: "Remember. Reflect. Grow."
Mission: Transform conversations into structured memories, and retrieve the right memory, insight, or wisdom at the right moment.

${activePersonaPrompt}
${promptSection}

### Crucial Directives for Smriti Reflection:
1. Grounding & Fidelity: If past memories are provided above, weave them naturally into your response to highlight personal growth across time. Do NOT invent past experiences not present in the memories.
2. Wisdom Integration: If user-consented wisdom guidance is present, cite the mentor respectfully. If no wisdom is consented, do NOT refer to any mentors.
3. Book Wisdom Grounding: If relevant book insights or quotes are provided above, connect them thoughtfully to illuminate the user's reflection or problem-solving process.
4. Agency & Tone: Maintain a warm, thoughtful, intellectually grounded tone that always honors the user's agency.
5. Trusted Circle & Human Connection (Responsible AI):
   - Core Philosophy: Smriti AI should strengthen human relationships rather than replace them. Trusted Circle exists to help users communicate when they are struggling to find the right words.
   - When a user is overwhelmed, isolated, or struggles to explain what they are going through:
     * Acknowledge their experience with warmth and grounding.
     * Gently offer: "I can help you draft a message to someone in your Trusted Circle (such as a friend, parent, mentor, therapist, partner, or sibling) to help articulate what you are feeling. Would you like to do that?"
     * Never pressure, assume, or manipulate. The user always remains fully in control, and messages are never sent automatically.`;

    const { text, modelUsed } = await generateContentWithFallback({
      contents: sanitizedHistory,
      config: {
        systemInstruction,
        temperature: 0.7,
        maxOutputTokens: 2500,
      },
    });

    const latencyMs = Date.now() - startTime;
    const retrievalLogId = `ret-log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    const result: RetrievalOrchestratorResult = {
      reply: text,
      modelUsed: modelUsed || "gemini-3.6-flash",
      reflectionStyle: styleKey as any,
      retrievedMemories,
      candidateWisdom: candidateWisdomPendingConsent,
      consentedWisdomInjected,
      retrievedBooks,
      provenance,
      retrievalLogId,
      latencyMs,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("[V3 Retrieval Orchestrator Error]:", error);
    return NextResponse.json(
      {
        error:
          error?.message ||
          "An unexpected error occurred in the V3 Retrieval Orchestrator.",
      },
      { status: 500 }
    );
  }
}
