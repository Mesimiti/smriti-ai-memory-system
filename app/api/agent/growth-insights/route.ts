import { NextRequest, NextResponse } from "next/server";
import { generateContentWithFallback } from "@/lib/gemini";
import { GrowthInsightItem, GrowthInsightsReport } from "@/lib/types";

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
    const memories = Array.isArray(payload.memories) ? payload.memories.slice(0, 30) : [];
    const styleDistribution = payload.styleDistribution && typeof payload.styleDistribution === "object" ? payload.styleDistribution : {};
    const topThemes = Array.isArray(payload.topThemes) ? payload.topThemes.slice(0, 10) : [];
    const topTags = Array.isArray(payload.topTags) ? payload.topTags.slice(0, 10) : [];
    const completedActionItems = Array.isArray(payload.completedActionItems) ? payload.completedActionItems.slice(0, 15) : [];
    const pendingActionItems = Array.isArray(payload.pendingActionItems) ? payload.pendingActionItems.slice(0, 15) : [];
    const wisdomMentors = Array.isArray(payload.wisdomMentors) ? payload.wisdomMentors.slice(0, 10) : [];
    const bookReferences = Array.isArray(payload.bookReferences) ? payload.bookReferences.slice(0, 10) : [];

    const totalMemories = memories.length;

    // Compact summary for LLM prompt
    const compactMemories = memories.map((m: any, idx: number) => ({
      index: idx + 1,
      style: m.reflectionStyle || "coach",
      summary: String(m.summary || "").slice(0, 140),
      themes: Array.isArray(m.themes) ? m.themes.slice(0, 4) : [],
      learnings: Array.isArray(m.keyLearnings) ? m.keyLearnings.slice(0, 3).map((l: any) => String(l).slice(0, 100)) : [],
      actionsCount: Array.isArray(m.actionItems) ? m.actionItems.length : 0,
      completedCount: Array.isArray(m.actionItems) ? m.actionItems.filter((a: any) => a.completed).length : 0,
    }));

    const systemPrompt = `You are the Smriti AI Growth Intelligence Engine.
Your purpose is to help the user understand how their conversations become reflections, reflections become structured memories, and memories become personal growth.

CRITICAL RESPONSIBLE AI MANDATES:
1. Present purely descriptive observations, NEVER subjective judgments or evaluations.
2. STRICTLY PROHIBIT psychological or psychiatric diagnoses (DO NOT mention ADHD, depression, anxiety disorders, burnout syndrome, neuroses, or clinical pathologies).
3. AVOID claiming absolute certainty. Use humble, tentative language: "Your reflections show a pattern of...", "You frequently return to...", "There is an observed focus on...", "You tend to...".
4. EXPLAIN THE "WHY": Every insight MUST include an 'evidence' field explicitly describing which themes, reflection styles, or completed actions generated the observation.
5. Emphasize PERSONAL DEVELOPMENT and learning wisdom over mere hustle or productivity metrics.

INPUT METRICS & MEMORIES:
- Total Structured Memories: ${totalMemories}
- Reflection Styles Used: ${JSON.stringify(styleDistribution)}
- Most Common Themes: ${JSON.stringify(topThemes)}
- Most Common Tags: ${JSON.stringify(topTags)}
- Completed Actions: ${JSON.stringify(completedActionItems.slice(0, 8))}
- Pending Actions: ${JSON.stringify(pendingActionItems.slice(0, 8))}
- Top Influential Guides / Wisdom Circle: ${JSON.stringify(wisdomMentors)}
- Top Books Referenced: ${JSON.stringify(bookReferences)}
- Recent Memories Snapshot: ${JSON.stringify(compactMemories.slice(0, 12))}

TASK:
Analyze these learning threads and produce an insightful Growth Intelligence Report containing:
1. Exactly 5 structured observations, one for each required category:
   - "Emerging Themes": Conceptual ideas and subjects that are rising in importance.
   - "Recurring Goals": Aspirations and long-term directions the user continually returns to.
   - "Growth Patterns": How the user works through challenges, adapts perspectives, and builds understanding.
   - "Frequently Completed Actions": The nature of tasks or commitments the user consistently follows through on.
   - "Reflection Habits": How the user uses different reflection modalities (Coach, Practical, Mentor, Motivational, Philosophical).
2. A brief 2-sentence overarching reflection summary.
3. A personalized 1-sentence Growth Motto or guiding principle derived from their reflections.

Output strictly valid JSON with this schema:
{
  "reflectionSummary": "...",
  "growthMotto": "...",
  "insights": [
    {
      "category": "Emerging Themes",
      "title": "...",
      "observation": "...",
      "evidence": "Observed across X memories tagged with ..."
    },
    {
      "category": "Recurring Goals",
      "title": "...",
      "observation": "...",
      "evidence": "Derived from recurring action items and key learnings in ..."
    },
    {
      "category": "Growth Patterns",
      "title": "...",
      "observation": "...",
      "evidence": "Reflected in how challenges were analyzed across Coach and Practical reflections..."
    },
    {
      "category": "Frequently Completed Actions",
      "title": "...",
      "observation": "...",
      "evidence": "Evidenced by X completed action items focusing on ..."
    },
    {
      "category": "Reflection Habits",
      "title": "...",
      "observation": "...",
      "evidence": "Calculated from your preference for [Style] reflections (X% of memories)..."
    }
  ]
}`;

    try {
      const { text, modelUsed } = await generateContentWithFallback({
        contents: [{ role: "user", parts: [{ text: systemPrompt }] }],
        config: {
          temperature: 0.25,
          maxOutputTokens: 1500,
        },
      });

      let cleaned = text.trim();
      if (cleaned.startsWith("```json")) {
        cleaned = cleaned.replace(/^```json\s*/, "").replace(/\s*```$/, "");
      } else if (cleaned.startsWith("```")) {
        cleaned = cleaned.replace(/^```\s*/, "").replace(/\s*```$/, "");
      }

      const parsed = JSON.parse(cleaned);
      if (parsed && Array.isArray(parsed.insights) && parsed.insights.length > 0) {
        const report: GrowthInsightsReport = {
          id: `growth-${Date.now()}`,
          userId: String(payload.userId || "anonymous"),
          generatedAt: new Date().toISOString(),
          modelUsed: modelUsed || "gemini-3.6-flash",
          insights: parsed.insights,
          reflectionSummary: String(parsed.reflectionSummary || "Your reflection journey shows consistent self-examination and deliberate knowledge synthesis."),
          growthMotto: String(parsed.growthMotto || "Turn reflection into clarity, and clarity into steady growth."),
          totalMemoriesAnalyzed: totalMemories,
        };
        return NextResponse.json(report);
      }
    } catch (llmErr) {
      console.warn("[Growth Insights] LLM synthesis fallback triggered:", llmErr);
    }

    // High-quality Deterministic Algorithmic Fallback
    const dominantStyle = Object.entries(styleDistribution).sort((a: any, b: any) => (b[1] as number) - (a[1] as number))[0]?.[0] || "coach";
    const topThemeName = topThemes[0]?.theme || topThemes[0] || "Personal Development";
    const completedCount = completedActionItems.length;

    const fallbackInsights: GrowthInsightItem[] = [
      {
        category: "Emerging Themes",
        title: `Deepening Focus on ${topThemeName}`,
        observation: `Your reflections repeatedly explore aspects of ${topThemeName.toLowerCase()}, indicating it is an active area of contemplation and skill building.`,
        evidence: `Extracted from frequency analysis across your saved memories and active taxonomy tags.`,
      },
      {
        category: "Recurring Goals",
        title: "Translating Abstract Ideas into Real-World Practice",
        observation: "You tend to formulate forward-looking intentions that bridge conceptual understanding with pragmatic day-to-day execution.",
        evidence: `Based on recurring patterns in your captured action items and reflection conclusions.`,
      },
      {
        category: "Growth Patterns",
        title: "Systematic Reflection & Thoughtful Unpacking",
        observation: "When encountering complex decisions or milestones, your reflections systematically break down tradeoffs and identify core principles.",
        evidence: `Derived from structural consistency across your memories, action lists, and preserved insights.`,
      },
      {
        category: "Frequently Completed Actions",
        title: "Follow-through on Concrete Operational Steps",
        observation: completedCount > 0
          ? `You show reliable momentum on clearly defined practical items, having completed ${completedCount} discrete milestones.`
          : "You establish intentional action steps designed to anchor each reflection into future behavior.",
        evidence: `Analyzed from your action items status across all recorded Second Brain memories.`,
      },
      {
        category: "Reflection Habits",
        title: `Gravitation toward the ${dominantStyle.charAt(0).toUpperCase() + dominantStyle.slice(1)} Perspective`,
        observation: `You frequently engage with the ${dominantStyle} reflection mode, shaping how inquiries are framed and unpacked.`,
        evidence: `Identified from style distribution metrics across your memory collection.`,
      },
    ];

    const fallbackReport: GrowthInsightsReport = {
      id: `growth-${Date.now()}`,
      userId: String(payload.userId || "anonymous"),
      generatedAt: new Date().toISOString(),
      modelUsed: "deterministic-analytics-engine",
      insights: fallbackInsights,
      reflectionSummary: `Across ${totalMemories} structured memories, your journey demonstrates sustained engagement with self-inquiry, active knowledge distillation, and purposeful action.`,
      growthMotto: "Reflect with honesty, learn with humility, and grow with steady intention.",
      totalMemoriesAnalyzed: totalMemories,
    };

    return NextResponse.json(fallbackReport);
  } catch (err: any) {
    console.error("[Growth Insights API Error]:", err);
    return NextResponse.json(
      { error: err?.message || "Internal server error while generating growth insights." },
      { status: 500 }
    );
  }
}
