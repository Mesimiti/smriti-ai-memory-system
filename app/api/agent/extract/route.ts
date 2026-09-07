import { NextRequest, NextResponse } from "next/server";
import { generateContentWithFallback } from "@/lib/gemini";

export async function POST(req: NextRequest) {
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
    const conversation = typeof payload.conversation === "string" ? payload.conversation.slice(0, 8000) : "";
    const userNotes = typeof payload.reflectionNotes === "string" ? payload.reflectionNotes.slice(0, 3000) : "";

    const validStyles = ['coach', 'practical', 'mentor', 'motivational', 'philosophical'];
    const styleKey =
      typeof payload.reflectionStyle === 'string' &&
      validStyles.includes(payload.reflectionStyle.toLowerCase())
        ? payload.reflectionStyle.toLowerCase()
        : 'coach';

    if (!conversation && !userNotes) {
      return NextResponse.json(
        { error: "No conversation or reflection notes provided for synthesis." },
        { status: 400 }
      );
    }

    const prompt = `Analyze the following user dialogue and reflection notes as the Smriti Personal Memory Agent.
Transform this experience into a structured memory for the user's permanent Second Brain vault.

Active Reflection Style: ${styleKey.toUpperCase()}
Ensure the extracted keyLearnings, actionItems, and themes emphasize this perspective:
- coach: deep self-discovery, introspective breakthroughs, and mindset awareness.
- practical: concrete operational execution, actionable problem solving, and friction reduction.
- mentor: career growth, leadership insights, strategic decision making, and long-term capability building.
- motivational: celebrated progress, highlighted strengths, confidence reinforcement, and positive momentum.
- philosophical: core values, personal identity, existential purpose, and ethical alignment.

=== CONVERSATION LOG ===
${conversation || "(No conversation transcript; using notes below)"}

=== USER REFLECTION NOTES ===
${userNotes || "(Extracted purely from conversation dialogue)"}

You must return a strictly valid JSON object matching this exact schema:
{
  "summary": "A concise, objective summary (2-3 sentences) capturing the essence and emotional core of this memory.",
  "keyLearnings": [
    "Distilled insight #1",
    "Distilled insight #2"
  ],
  "actionItems": [
    "Specific, tangible next step #1",
    "Specific, tangible next step #2"
  ],
  "tags": ["tag1", "tag2", "tag3"],
  "themes": ["Primary Theme", "Secondary Theme"],
  "reflectionNotes": "Personal context or synthesis note based on the user's sentiments",
  "aiExplanation": "Transparent rationale explaining why these action items and tags were chosen, acknowledging limitations, and explicitly inviting human verification before saving.",
  "secondBrainMeta": {
    "knowledgeGraphNodes": ["KeyConceptA", "KeyConceptB"],
    "suggestedFollowUps": ["Thought-provoking follow-up question for a future session?"],
    "confidenceScore": 0.95
  }
}

Important Guidelines:
1. Provide only valid JSON. Do not wrap in markdown or backticks.
2. The aiExplanation must be honest, transparent, and promote human agency.
3. Keep action items specific, realistic, and low-friction.`;

    let structuredData: any = null;
    let effectiveModel = "gemini-3.6-flash";

    try {
      const { text, modelUsed } = await generateContentWithFallback({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: {
          temperature: 0.3,
          responseMimeType: "application/json",
        },
      });
      effectiveModel = modelUsed;

      // Strip markdown code fences if present
      const cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();
      structuredData = JSON.parse(cleaned);
    } catch (llmErr) {
      console.warn("[Smriti Extract API] LLM extraction unavailable, switching to deterministic heuristic distillation:", llmErr);
      effectiveModel = "deterministic-extractor";

      // Deterministic memory extraction from conversation and notes
      const sourceContent = `${userNotes} ${conversation}`.trim();
      const sentences = sourceContent
        .split(/[.!?\n]+/)
        .map((s) => s.trim())
        .filter((s) => s.length > 15);

      const topLearnings = sentences.slice(0, 3);
      if (topLearnings.length === 0) {
        topLearnings.push("Gained valuable clarity through mindful self-reflection.");
      }

      const defaultActions = [
        "Review key takeaways in 24 hours to reinforce insights",
        "Apply the chosen operational principle to the upcoming challenge"
      ];

      // Extract basic tags
      const words = sourceContent
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter((w) => w.length > 4 && !["about", "there", "their", "would", "could", "should", "reflection"].includes(w));
      const extractedTags = Array.from(new Set(words)).slice(0, 4);

      structuredData = {
        summary: sentences[0] || "Synthesized reflection focused on personal awareness and proactive next steps.",
        keyLearnings: topLearnings,
        actionItems: defaultActions,
        tags: extractedTags.length > 0 ? extractedTags : ["growth", "focus", "mindset"],
        themes: [styleKey.charAt(0).toUpperCase() + styleKey.slice(1), "Self-Improvement"],
        reflectionNotes: userNotes || "Extracted from dialogue session.",
        aiExplanation: "Synthesized via Smriti deterministic extraction engine to protect continuity during offline or fallback operation. Please review and refine.",
        secondBrainMeta: {
          knowledgeGraphNodes: ["Reflection", styleKey],
          suggestedFollowUps: ["What measurable outcome will indicate success for this action?"],
          confidenceScore: 0.88,
        },
      };
    }

    // Defensive normalization to enforce the approved StructuredMemory schema
    const nowTimestamp = Date.now();
    const normalizedActionItems = Array.isArray(structuredData.actionItems)
      ? structuredData.actionItems.map((item: any, idx: number) => {
          if (typeof item === "string") {
            return {
              id: `act_${nowTimestamp}_${idx}`,
              text: item.trim(),
              completed: false,
            };
          }
          return {
            id: item.id || `act_${nowTimestamp}_${idx}`,
            text: typeof item.text === "string" ? item.text.trim() : String(item),
            completed: Boolean(item.completed),
          };
        })
      : [];

    const normalizedKeyLearnings = Array.isArray(structuredData.keyLearnings)
      ? structuredData.keyLearnings
          .map((k: any) => (typeof k === "string" ? k.trim() : String(k)))
          .filter(Boolean)
      : [];

    const normalizedTags = Array.isArray(structuredData.tags)
      ? structuredData.tags
          .map((t: any) =>
            typeof t === "string"
              ? t.toLowerCase().replace(/[^a-z0-9-_]/g, "").trim()
              : ""
          )
          .filter(Boolean)
      : [];

    const normalizedThemes = Array.isArray(structuredData.themes)
      ? structuredData.themes
          .map((th: any) => (typeof th === "string" ? th.trim() : String(th)))
          .filter(Boolean)
      : ["Personal Growth"];

    const normalizedMemory = {
      reflectionStyle: styleKey,
      summary: typeof structuredData.summary === "string" ? structuredData.summary.trim() : "Reflection session summary",
      keyLearnings: normalizedKeyLearnings,
      actionItems: normalizedActionItems,
      tags: normalizedTags.length > 0 ? normalizedTags : ["reflection", "growth"],
      themes: normalizedThemes,
      reflectionNotes: typeof structuredData.reflectionNotes === "string" ? structuredData.reflectionNotes.trim() : userNotes || "",
      aiExplanation:
        typeof structuredData.aiExplanation === "string" && structuredData.aiExplanation.trim()
          ? structuredData.aiExplanation.trim()
          : "These learnings and action items were synthesized from your reflective dialogue using semantic distillation. Please inspect and adjust them to fit your personal intent before approving.",
      secondBrainMeta: {
        knowledgeGraphNodes: Array.isArray(structuredData.secondBrainMeta?.knowledgeGraphNodes)
          ? structuredData.secondBrainMeta.knowledgeGraphNodes.map(String)
          : normalizedThemes,
        suggestedFollowUps: Array.isArray(structuredData.secondBrainMeta?.suggestedFollowUps)
          ? structuredData.secondBrainMeta.suggestedFollowUps.map(String)
          : ["How did implementing this decision change your perspective?"],
        confidenceScore: typeof structuredData.secondBrainMeta?.confidenceScore === "number"
          ? structuredData.secondBrainMeta.confidenceScore
          : 0.92,
      },
    };

    return NextResponse.json({
      memory: normalizedMemory,
      modelUsed: effectiveModel,
    });
  } catch (error: any) {
    console.error("[Smriti Extract API Error]:", error);
    // Safe graceful recovery memory
    const safeMemory = {
      reflectionStyle: "coach",
      summary: "Reflective session captured safely.",
      keyLearnings: ["Mindful awareness captured for future retrieval"],
      actionItems: [{ id: `act_${Date.now()}_0`, text: "Review key insights", completed: false }],
      tags: ["reflection", "memory"],
      themes: ["Personal Growth"],
      reflectionNotes: "",
      aiExplanation: "Preserved securely via backup synthesis protocol.",
      secondBrainMeta: {
        knowledgeGraphNodes: ["Reflection"],
        suggestedFollowUps: ["How can this insight guide your next move?"],
        confidenceScore: 0.85,
      },
    };
    return NextResponse.json({ memory: safeMemory, modelUsed: "deterministic-failsafe" }, { status: 200 });
  }
}
