import { NextRequest, NextResponse } from "next/server";
import { generateContentWithFallback } from "@/lib/gemini";
import { RelatedWisdomItem } from "@/lib/types";

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
    const query = typeof payload.query === "string" ? payload.query.trim() : "";
    const memories = Array.isArray(payload.memories) ? payload.memories.slice(0, 15) : [];
    const wisdomList = Array.isArray(payload.wisdomList) ? payload.wisdomList.slice(0, 15) : [];
    const bookWisdomList = Array.isArray(payload.bookWisdomList) ? payload.bookWisdomList.slice(0, 15) : [];

    if (!query) {
      return NextResponse.json({ items: [] });
    }

    const totalCandidates = memories.length + wisdomList.length + bookWisdomList.length;
    if (totalCandidates === 0) {
      return NextResponse.json({ items: [] });
    }

    // Build candidates manifest for Gemini
    const manifest = {
      reflectionQuery: query.slice(0, 1500),
      candidates: [
        ...memories.map((m: any) => ({
          type: "memory",
          id: String(m.id || ""),
          title: String(m.summary || "Structured Memory").slice(0, 120),
          learnings: Array.isArray(m.keyLearnings) ? m.keyLearnings.slice(0, 3) : [],
          tags: Array.isArray(m.tags) ? m.tags.slice(0, 5) : [],
          themes: Array.isArray(m.themes) ? m.themes.slice(0, 3) : [],
        })),
        ...wisdomList.map((w: any) => ({
          type: "wisdom",
          id: String(w.id || ""),
          personName: String(w.personName || "Mentor").slice(0, 60),
          relationship: String(w.relationship || "Guide").slice(0, 40),
          wisdomText: String(w.wisdomText || "").slice(0, 200),
          tags: Array.isArray(w.tags) ? w.tags.slice(0, 5) : [],
          themes: Array.isArray(w.themes) ? w.themes.slice(0, 3) : [],
        })),
        ...bookWisdomList.map((b: any) => ({
          type: "book",
          id: String(b.id || ""),
          bookTitle: String(b.bookTitle || "Book").slice(0, 80),
          author: String(b.author || "Author").slice(0, 60),
          keyIdea: String(b.keyIdea || "").slice(0, 200),
          quote: String(b.quote || "").slice(0, 150),
          tags: Array.isArray(b.tags) ? b.tags.slice(0, 5) : [],
          themes: Array.isArray(b.themes) ? b.themes.slice(0, 3) : [],
        })),
      ],
    };

    const prompt = `You are the Smriti AI Knowledge Graph & Related Wisdom Engine.
Analyze the user's reflection thought against their personal knowledge assets: Memories, Wisdom Circle, and Book Wisdom.

User Reflection Context:
"${manifest.reflectionQuery}"

Available Knowledge Assets:
${JSON.stringify(manifest.candidates, null, 2)}

Task:
Perform multi-source retrieval across all three knowledge indices:
1. Search Memory Vault (past experiences and key learnings).
2. Search Wisdom Circle (guidance and philosophies from mentors).
3. Search Book Wisdom (key ideas, quotes, and reflections from literature).

Identify which items (maximum 4 best matches across the 3 indices) are genuinely relevant to the user's current reflection.
Do NOT return irrelevant matches. A match must have a clear thematic, philosophical, behavioral, or emotional connection.

For each relevant item, return an object formatted as:
{
  "id": "candidate-id",
  "originalId": "candidate-id",
  "sourceType": "memory" | "wisdom" | "book",
  "sourceTitle": "Clean title, e.g. 'Atomic Habits by James Clear' or 'Mom (Teacher)' or 'Memory: Architectural Tradeoffs'",
  "sourceSubtitle": "Memory Vault" | "Wisdom Circle" | "Book Wisdom",
  "contentSnippet": "The core advice, quote, or summary",
  "whyRelevant": "1-2 articulate sentences explaining WHY this wisdom is relevant to what the user is currently reflecting on.",
  "reasonForRetrieval": "Specific, clear justification explaining why this entry was retrieved in the context of the user's reflection problem and how it aids their reflection process.",
  "tags": ["relevant", "tags"],
  "themes": ["Primary Theme"],
  "relevanceScore": 0.88,
  "relationshipType": "Philosophical Alignment" | "Behavioral Strategy" | "Thematic Echo" | "Core Principle" | "Past Precedent"
}

Return ONLY a valid JSON object:
{
  "items": [...]
}
If none of the candidates are meaningfully relevant, return {"items": []}. Do not wrap in markdown quotes if possible, output pure JSON.`;

    try {
      const { text } = await generateContentWithFallback({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: {
          temperature: 0.2,
          maxOutputTokens: 2000,
        },
      });

      // Parse JSON from text
      let cleaned = text.trim();
      if (cleaned.startsWith("```json")) {
        cleaned = cleaned.replace(/^```json\s*/, "").replace(/\s*```$/, "");
      } else if (cleaned.startsWith("```")) {
        cleaned = cleaned.replace(/^```\s*/, "").replace(/\s*```$/, "");
      }

      const parsed = JSON.parse(cleaned);
      if (Array.isArray(parsed.items)) {
        return NextResponse.json({ items: parsed.items });
      }
    } catch (llmErr) {
      console.warn("LLM related-wisdom generation error, applying deterministic fallback:", llmErr);
    }

    // Deterministic fallback matching if LLM fails or returns non-JSON
    const fallbackItems: RelatedWisdomItem[] = [];
    const queryTokens = query
      .toLowerCase()
      .split(/\W+/)
      .filter((t: string) => t.length > 3);

    // Check books
    for (const b of bookWisdomList) {
      const textToSearch = `${b.bookTitle || ""} ${b.author || ""} ${b.keyIdea || ""} ${b.quote || ""} ${(b.tags || []).join(" ")} ${(b.themes || []).join(" ")}`.toLowerCase();
      const matched = queryTokens.filter((token: string) => textToSearch.includes(token));
      if (matched.length > 0 || (b.tags && b.tags.some((t: string) => query.toLowerCase().includes(t.toLowerCase())))) {
        fallbackItems.push({
          id: `rel-${b.id}`,
          originalId: b.id,
          sourceType: "book",
          sourceTitle: `${b.bookTitle} by ${b.author}`,
          sourceSubtitle: "Book Wisdom Vault",
          contentSnippet: b.quote || b.keyIdea || "Principles and lessons from this book",
          whyRelevant: `Connects to your reflection on ${matched.slice(0, 3).join(", ") || "this theme"} through ${b.author}'s core principle on ${b.keyIdea ? b.keyIdea.slice(0, 80) : "mindful action"}.`,
          reasonForRetrieval: `Retrieved from Book Wisdom because ${b.author}'s literature directly addresses the challenges and themes identified in your reflection.`,
          tags: Array.isArray(b.tags) && b.tags.length > 0 ? b.tags : ["wisdom", "reading"],
          themes: Array.isArray(b.themes) && b.themes.length > 0 ? b.themes : ["Personal Growth"],
          relevanceScore: 0.85,
          relationshipType: "Core Principle",
        });
      }
    }

    // Check wisdom circle
    for (const w of wisdomList) {
      const textToSearch = `${w.personName || ""} ${w.relationship || ""} ${w.wisdomText || ""} ${w.situation || ""} ${(w.tags || []).join(" ")} ${(w.themes || []).join(" ")}`.toLowerCase();
      const matched = queryTokens.filter((token: string) => textToSearch.includes(token));
      if (matched.length > 0 || (w.themes && w.themes.some((t: string) => query.toLowerCase().includes(t.toLowerCase())))) {
        fallbackItems.push({
          id: `rel-${w.id}`,
          originalId: w.id,
          sourceType: "wisdom",
          sourceTitle: `${w.personName} (${w.relationship})`,
          sourceSubtitle: "Wisdom Circle Guidance",
          contentSnippet: w.wisdomText,
          whyRelevant: `Reflects the personal counsel of ${w.personName} regarding ${w.themes?.[0] || "resilience and perspective"}.`,
          reasonForRetrieval: `Retrieved from Wisdom Circle because ${w.personName}'s guidance provides real-world human perspective relevant to your situation.`,
          tags: Array.isArray(w.tags) && w.tags.length > 0 ? w.tags : ["guidance", "mentorship"],
          themes: Array.isArray(w.themes) && w.themes.length > 0 ? w.themes : ["Life Philosophy"],
          relevanceScore: 0.82,
          relationshipType: "Personal Guidance",
        });
      }
    }

    // Check memories
    for (const m of memories) {
      const textToSearch = `${m.summary || ""} ${(m.keyLearnings || []).join(" ")} ${(m.tags || []).join(" ")} ${(m.themes || []).join(" ")}`.toLowerCase();
      const matched = queryTokens.filter((token: string) => textToSearch.includes(token));
      if (matched.length > 0) {
        fallbackItems.push({
          id: `rel-${m.id}`,
          originalId: m.id,
          sourceType: "memory",
          sourceTitle: `Memory: ${m.summary ? m.summary.slice(0, 60) : "Structured Vault Entry"}`,
          sourceSubtitle: "Memory Vault",
          contentSnippet: (m.keyLearnings && m.keyLearnings[0]) || m.summary || "Past reflection insight",
          whyRelevant: `Draws on your prior structured learning regarding ${matched.slice(0, 2).join(" & ") || "this challenge"}.`,
          reasonForRetrieval: `Retrieved from Memory Vault because your past reflection notes contain personal precedents and key learnings for this scenario.`,
          tags: Array.isArray(m.tags) && m.tags.length > 0 ? m.tags : ["memory"],
          themes: Array.isArray(m.themes) && m.themes.length > 0 ? m.themes : ["Growth"],
          relevanceScore: 0.8,
          relationshipType: "Past Reflection",
        });
      }
    }

    return NextResponse.json({ items: fallbackItems.slice(0, 4) });
  } catch (err: any) {
    console.error("[Related Wisdom API Route Error]:", err);
    return NextResponse.json({ items: [] }, { status: 200 });
  }
}
