import {
  StructuredMemory,
  WisdomEntry,
  BookWisdomEntry,
  RetrievedMemoryItem,
  CandidateWisdomItem,
  RetrievedBookItem,
  RetrievalRankingFactors,
  RetrievalProvenance,
} from "./types";

/**
 * Standard English Stopwords for High-Precision Lexical Tokenization
 */
const STOP_WORDS = new Set([
  "a", "about", "above", "after", "again", "against", "all", "am", "an", "and",
  "any", "are", "aren't", "as", "at", "be", "because", "been", "before", "being",
  "below", "between", "both", "but", "by", "can't", "cannot", "could", "couldn't",
  "did", "didn't", "do", "does", "doesn't", "doing", "don't", "down", "during",
  "each", "few", "for", "from", "further", "had", "hadn't", "has", "hasn't",
  "have", "haven't", "having", "he", "he'd", "he'll", "he's", "her", "here",
  "here's", "hers", "herself", "him", "himself", "his", "how", "how's", "i",
  "i'd", "i'll", "i'm", "i've", "if", "in", "into", "is", "isn't", "it", "it's",
  "its", "itself", "let's", "me", "more", "most", "mustn't", "my", "myself",
  "no", "nor", "not", "of", "off", "on", "once", "only", "or", "other", "ought",
  "our", "ours", "ourselves", "out", "over", "own", "same", "shan't", "she",
  "she'd", "she'll", "she's", "should", "shouldn't", "so", "some", "such", "than",
  "that", "that's", "the", "their", "theirs", "them", "themselves", "then", "there",
  "there's", "these", "they", "they'd", "they'll", "they're", "they've", "this",
  "those", "through", "to", "too", "under", "until", "up", "very", "was", "wasn't",
  "we", "we'd", "we'll", "we're", "we've", "were", "weren't", "what", "what's",
  "when", "when's", "where", "where's", "which", "while", "who", "who's", "whom",
  "why", "why's", "with", "won't", "would", "wouldn't", "you", "you'd", "you'll",
  "you're", "you've", "your", "yours", "yourself", "yourselves", "today", "felt", "feel"
]);

/**
 * Tokenize and normalize text into unique meaningful words
 */
export function extractKeywords(text: string): string[] {
  if (!text) return [];
  return Array.from(
    new Set(
      text
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter((w) => w.length > 2 && !STOP_WORDS.has(w))
    )
  );
}

/**
 * Computes multi-factor hybrid relevance score between reflection query and target document
 * Formula: FinalScore = 0.35 * S_lex + 0.25 * S_thm + 0.15 * S_tag + 0.15 * S_rec + 0.10 * S_act
 */
export function calculateRankingFactors(params: {
  queryKeywords: string[];
  docText: string;
  docThemes: string[];
  docTags: string[];
  createdAt: string;
  actionItemTexts?: string[];
}): RetrievalRankingFactors {
  const { queryKeywords = [], docText = "", docThemes = [], docTags = [], createdAt, actionItemTexts = [] } = params;

  if (!queryKeywords || queryKeywords.length === 0) {
    return {
      lexicalScore: 0,
      thematicBonus: 0,
      tagOverlapBonus: 0,
      recencyWeight: 0.5,
      actionabilityWeight: 0,
      finalScore: 0,
    };
  }

  const normalizedDocText = (docText || "").toLowerCase();

  // 1. Lexical Score (S_lex) [0.0 - 1.0]
  let matchedKeywordCount = 0;
  for (const kw of queryKeywords) {
    if (kw && normalizedDocText.includes(kw)) {
      matchedKeywordCount++;
    }
  }
  const lexicalScore = Math.min(1.0, matchedKeywordCount / Math.max(1, queryKeywords.length * 0.6));

  // 2. Thematic Bonus (S_thm) [0.0 - 1.0]
  let themeMatches = 0;
  const normalizedThemes = (Array.isArray(docThemes) ? docThemes : []).map((t) => (t || "").toLowerCase());
  for (const kw of queryKeywords) {
    if (kw && normalizedThemes.some((thm) => thm && (thm.includes(kw) || kw.includes(thm)))) {
      themeMatches++;
    }
  }
  const thematicBonus = Math.min(1.0, themeMatches * 0.5);

  // 3. Tag Overlap Bonus (S_tag) [0.0 - 1.0]
  let tagMatches = 0;
  const normalizedTags = (Array.isArray(docTags) ? docTags : []).map((t) => (t || "").toLowerCase());
  for (const kw of queryKeywords) {
    if (kw && normalizedTags.some((tag) => tag && (tag.includes(kw) || kw.includes(tag)))) {
      tagMatches++;
    }
  }
  const tagOverlapBonus = Math.min(1.0, tagMatches * 0.4);

  // 4. Recency Decay (S_rec) [0.2 - 1.0]
  let recencyWeight = 0.5;
  try {
    const docTime = createdAt ? new Date(createdAt).getTime() : Date.now();
    const now = Date.now();
    const ageInDays = Math.max(0, (now - docTime) / (1000 * 60 * 60 * 24));
    recencyWeight = Math.max(0.25, Math.exp(-ageInDays / 60));
  } catch {
    recencyWeight = 0.5;
  }

  // 5. Actionability Score (S_act) [0.0 - 1.0]
  let actionabilityWeight = 0;
  if (Array.isArray(actionItemTexts) && actionItemTexts.length > 0) {
    const joinedActions = actionItemTexts.filter(Boolean).join(" ").toLowerCase();
    const actionMatches = queryKeywords.filter((kw) => kw && joinedActions.includes(kw)).length;
    actionabilityWeight = Math.min(1.0, actionMatches * 0.35 + 0.2);
  }

  // Aggregate Composite Formula
  const finalScore = Number(
    (
      0.35 * lexicalScore +
      0.25 * thematicBonus +
      0.15 * tagOverlapBonus +
      0.15 * recencyWeight +
      0.10 * actionabilityWeight
    ).toFixed(3)
  );

  return {
    lexicalScore: Number(lexicalScore.toFixed(3)),
    thematicBonus: Number(thematicBonus.toFixed(3)),
    thematicScore: Number(thematicBonus.toFixed(3)),
    tagOverlapBonus: Number(tagOverlapBonus.toFixed(3)),
    tagScore: Number(tagOverlapBonus.toFixed(3)),
    recencyWeight: Number(recencyWeight.toFixed(3)),
    recencyScore: Number(recencyWeight.toFixed(3)),
    actionabilityWeight: Number(actionabilityWeight.toFixed(3)),
    actionabilityScore: Number(actionabilityWeight.toFixed(3)),
    finalScore,
  };
}

/**
 * Automatically Ranks and Retrieves Relevant Memories from the Memory Vault
 * V3 Rule: Memory retrieval MAY happen automatically.
 */
export function rankMemories(
  query: string,
  memories: StructuredMemory[],
  threshold = 0.35,
  maxResults = 3
): RetrievedMemoryItem[] {
  if (!query.trim() || !Array.isArray(memories) || memories.length === 0) {
    return [];
  }

  const queryKeywords = extractKeywords(query);
  const candidates: RetrievedMemoryItem[] = [];

  for (const m of memories) {
    const fullText = `${m.summary || ""} ${(m.keyLearnings || []).join(" ")} ${m.reflectionNotes || ""} ${(m.tags || []).join(" ")} ${(m.themes || []).join(" ")}`;
    const actionTexts = (m.actionItems || []).map((a) => a.text);

    const rankingFactors = calculateRankingFactors({
      queryKeywords,
      docText: fullText,
      docThemes: m.themes || [],
      docTags: m.tags || [],
      createdAt: m.createdAt || new Date().toISOString(),
      actionItemTexts: actionTexts,
    });

    if (rankingFactors.finalScore >= threshold) {
      // Formulate relationship explanation
      const matchingThemes = (m.themes || []).filter((thm) =>
        queryKeywords.some((kw) => thm.toLowerCase().includes(kw))
      );
      const relationshipReason =
        matchingThemes.length > 0
          ? `Shares thematic alignment on "${matchingThemes.join(", ")}"`
          : `Connects with key learnings from past reflection on "${(m.summary || "").slice(0, 50)}..."`;

      candidates.push({
        id: m.id,
        summary: m.summary || "Structured Memory",
        keyLearnings: Array.isArray(m.keyLearnings) ? m.keyLearnings.slice(0, 3) : [],
        actionItems: Array.isArray(m.actionItems) ? m.actionItems.slice(0, 2) : [],
        tags: Array.isArray(m.tags) ? m.tags.slice(0, 5) : [],
        themes: Array.isArray(m.themes) ? m.themes.slice(0, 3) : [],
        createdAt: m.createdAt || "",
        relevanceScore: rankingFactors.finalScore,
        rankingFactors,
        relationshipReason,
        automaticallyIncluded: true,
      });
    }
  }

  // Sort descending by finalScore
  candidates.sort((a, b) => b.relevanceScore - a.relevanceScore);
  return candidates.slice(0, maxResults);
}

/**
 * Ranks Candidate Wisdom from Wisdom Circle.
 * V3 Rule: NEVER automatically retrieve Wisdom Circle entries.
 * Always ask for user consent before using Wisdom Circle content. Wisdom retrieval must remain opt-in.
 */
export function rankWisdomCandidates(
  query: string,
  wisdomList: WisdomEntry[],
  consentedWisdomIds: string[] = [],
  threshold = 0.38,
  maxResults = 3
): CandidateWisdomItem[] {
  if (!query.trim() || !Array.isArray(wisdomList) || wisdomList.length === 0) {
    return [];
  }

  const queryKeywords = extractKeywords(query);
  const candidates: CandidateWisdomItem[] = [];

  for (const w of wisdomList) {
    const fullText = `${w.personName || ""} ${w.relationship || ""} ${w.wisdomText || ""} ${w.situation || ""} ${w.whyItMatters || ""} ${(w.tags || []).join(" ")} ${(w.themes || []).join(" ")}`;

    const rankingFactors = calculateRankingFactors({
      queryKeywords,
      docText: fullText,
      docThemes: w.themes || [],
      docTags: w.tags || [],
      createdAt: w.createdAt || new Date().toISOString(),
    });

    if (rankingFactors.finalScore >= threshold) {
      const isConsented = consentedWisdomIds.includes(w.id);

      const relationshipReason = `Mentorship counsel from ${w.personName} (${w.relationship}) regarding ${(w.themes?.[0] || w.tags?.[0] || "life perspective")}`;

      candidates.push({
        id: w.id,
        personName: w.personName || "Mentor",
        relationship: w.relationship || "Guide",
        wisdomText: w.wisdomText || "",
        situation: w.situation || "",
        whyItMatters: w.whyItMatters || "",
        tags: Array.isArray(w.tags) ? w.tags.slice(0, 5) : [],
        themes: Array.isArray(w.themes) ? w.themes.slice(0, 3) : [],
        relevanceScore: rankingFactors.finalScore,
        rankingFactors,
        relationshipReason,
        isConsented,
        consentTimestamp: isConsented ? new Date().toISOString() : undefined,
      });
    }
  }

  candidates.sort((a, b) => b.relevanceScore - a.relevanceScore);
  return candidates.slice(0, maxResults);
}

/**
 * Ranks Book Wisdom entries using multi-factor hybrid relevance.
 * Book insights provide literature grounding, core ideas, and timeless quotes for problem-solving.
 */
export function rankBookWisdom(
  query: string,
  books: BookWisdomEntry[],
  threshold = 0.28,
  maxResults = 3
): RetrievedBookItem[] {
  if (!query.trim() || !Array.isArray(books) || books.length === 0) {
    return [];
  }

  const queryKeywords = extractKeywords(query);
  const candidates: RetrievedBookItem[] = [];

  for (const b of books) {
    const fullText = `${b.bookTitle || ""} ${b.author || ""} ${b.keyIdea || ""} ${b.quote || ""} ${b.personalReflection || ""} ${(b.tags || []).join(" ")} ${(b.themes || []).join(" ")}`;

    const rankingFactors = calculateRankingFactors({
      queryKeywords,
      docText: fullText,
      docThemes: b.themes || [],
      docTags: b.tags || [],
      createdAt: b.createdAt || new Date().toISOString(),
    });

    if (rankingFactors.finalScore >= threshold) {
      const relationshipReason = `Literature insight from "${b.bookTitle}" by ${b.author} addressing ${(b.themes?.[0] || b.tags?.[0] || "core principles")}`;

      candidates.push({
        id: b.id,
        bookTitle: b.bookTitle || "Untitled Book",
        author: b.author || "Unknown Author",
        keyIdea: b.keyIdea || "",
        quote: b.quote || "",
        personalReflection: b.personalReflection || "",
        tags: Array.isArray(b.tags) ? b.tags.slice(0, 5) : [],
        themes: Array.isArray(b.themes) ? b.themes.slice(0, 3) : [],
        createdAt: b.createdAt || new Date().toISOString(),
        relevanceScore: rankingFactors.finalScore,
        rankingFactors,
        relationshipReason,
        automaticallyIncluded: true,
      });
    }
  }

  candidates.sort((a, b) => b.relevanceScore - a.relevanceScore);
  return candidates.slice(0, maxResults);
}

/**
 * Builds the Structured Context Section for Gemini Reflection Synthesis
 * Enforces strict boundary: Unconsented wisdom is NEVER passed into the prompt.
 * Seamlessly integrates retrieved memories, user-consented wisdom, and literature insights from Book Wisdom.
 */
export function buildRetrievalPromptContext(
  retrievedMemories: RetrievedMemoryItem[],
  consentedWisdom: CandidateWisdomItem[],
  retrievedBooks: RetrievedBookItem[] = []
): {
  promptSection: string;
  provenance: RetrievalProvenance;
} {
  let promptSection = "";

  // 1. Memories Section (Automatically Retrieved)
  if (retrievedMemories.length > 0) {
    promptSection += "\n\n### Automatically Retrieved Past Memories from Second Brain:\n";
    promptSection += "The following relevant memories from the user's personal vault were retrieved by the V3 Retrieval Orchestrator to provide continuity:\n";
    retrievedMemories.forEach((m, idx) => {
      promptSection += `\n[Memory #${idx + 1}] (Relevance: ${Math.round(m.relevanceScore * 100)}%)\n`;
      promptSection += `- Summary: "${m.summary}"\n`;
      if (m.keyLearnings.length > 0) {
        promptSection += `- Key Realizations: ${m.keyLearnings.map((l) => `"${l}"`).join("; ")}\n`;
      }
      if (m.themes.length > 0) {
        promptSection += `- Themes: ${m.themes.join(", ")}\n`;
      }
    });

    promptSection += "\nDirective for Memory Weaving:\n";
    promptSection += "- Seamlessly weave references to these past realizations into your reflection where genuinely relevant.\n";
    promptSection += "- Remind the user of their own prior wisdom: e.g., 'This echoes the realization you reached earlier regarding...'\n";
    promptSection += "- DO NOT invent facts outside these excerpts. Maintain strict fidelity to what was recorded.\n";
  }

  // 2. Wisdom Circle Section (STRICT OPT-IN CONSENT ONLY)
  // Verify that ONLY consented wisdom is appended
  const verifiedConsentedWisdom = consentedWisdom.filter((w) => w.isConsented);
  if (verifiedConsentedWisdom.length > 0) {
    promptSection += "\n\n### User-Consented Wisdom Circle Guidance (Opt-In Approved):\n";
    promptSection += "The user has EXPLICITLY consented to weaving advice from their Wisdom Circle mentors into this dialogue:\n";
    verifiedConsentedWisdom.forEach((w, idx) => {
      promptSection += `\n[Wisdom Advisor #${idx + 1}] ${w.personName} (${w.relationship})\n`;
      promptSection += `- Advice / Principle: "${w.wisdomText}"\n`;
      promptSection += `- Context: "${w.situation}"\n`;
      promptSection += `- Relevance Reason: ${w.relationshipReason}\n`;
    });

    promptSection += "\nDirective for Consented Wisdom Integration:\n";
    promptSection += "- Warmly honor and acknowledge the mentor's guidance as a supportive lens for the user's dilemma.\n";
    promptSection += "- Always preserve the user's ultimate agency: 'How does [Mentor Name]'s perspective sit with what you are facing today?'\n";
  }

  // 3. Book Wisdom Section (Literature Insights from Second Brain)
  if (retrievedBooks.length > 0) {
    promptSection += "\n\n### Automatically Retrieved Book Wisdom & Literature Insights:\n";
    promptSection += "The user has recorded key ideas and memorable quotes from influential books in their Second Brain. Weave these in when solving problems or reflecting:\n";
    retrievedBooks.forEach((b, idx) => {
      promptSection += `\n[Book Insight #${idx + 1}] "${b.bookTitle}" by ${b.author} (Relevance: ${Math.round(b.relevanceScore * 100)}%)\n`;
      promptSection += `- Core Principle: "${b.keyIdea}"\n`;
      if (b.quote && b.quote !== "No quote specified") {
        promptSection += `- Notable Quote: "${b.quote}"\n`;
      }
      if (b.personalReflection) {
        promptSection += `- User's Personal Application: "${b.personalReflection}"\n`;
      }
      promptSection += `- Context: ${b.relationshipReason}\n`;
    });

    promptSection += "\nDirective for Book Insights Integration:\n";
    promptSection += "- Thoughtfully reference the book's core principle and author to ground the reflection in enduring literature wisdom.\n";
    promptSection += "- Connect the book's framework or quote to help the user reflect or solve their current challenge.\n";
  }

  // Build Provenance Object
  const provenance: RetrievalProvenance = {
    memoriesUsed: retrievedMemories.map((m) => ({
      id: m.id,
      summary: m.summary,
      relevancePercent: Math.round(m.relevanceScore * 100),
      relevanceScore: m.relevanceScore,
      rankingFactors: m.rankingFactors,
      relationshipReason: m.relationshipReason,
    })),
    wisdomUsed: verifiedConsentedWisdom.map((w) => ({
      id: w.id,
      personName: w.personName,
      relationship: w.relationship,
      wisdomText: w.wisdomText,
      relevancePercent: Math.round(w.relevanceScore * 100),
      relevanceScore: w.relevanceScore,
      rankingFactors: w.rankingFactors,
      consentVerified: true,
    })),
    booksUsed: retrievedBooks.map((b) => ({
      id: b.id,
      bookTitle: b.bookTitle,
      author: b.author,
      keyIdea: b.keyIdea,
      quote: b.quote,
      relevancePercent: Math.round(b.relevanceScore * 100),
      relevanceScore: b.relevanceScore,
      rankingFactors: b.rankingFactors,
      relationshipReason: b.relationshipReason,
    })),
    transparencyRationale:
      retrievedMemories.length > 0 || verifiedConsentedWisdom.length > 0 || retrievedBooks.length > 0
        ? `Retrieved ${retrievedMemories.length} past memory/memories, ${retrievedBooks.length} book insight/insights, and incorporated ${verifiedConsentedWisdom.length} user-consented Wisdom Circle entry/entries.`
        : "No past memories, book insights, or consented wisdom met the relevance threshold for this reflection turn.",
  };

  return { promptSection, provenance };
}
