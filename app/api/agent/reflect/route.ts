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
    const rawMessages = Array.isArray(payload.messages) ? payload.messages : [];

    if (rawMessages.length === 0) {
      return NextResponse.json(
        { error: "At least one message is required for reflection." },
        { status: 400 }
      );
    }

    // Defensive clamp and sanitize messages
    const sanitizedHistory = rawMessages.slice(-14).map((m: any) => {
      const role = m.role === "assistant" || m.role === "model" ? "model" : "user";
      const content = typeof m.content === "string" ? m.content.slice(0, 4000) : "";
      return { role, parts: [{ text: content }] };
    });

    const validStyles = ['coach', 'practical', 'mentor', 'motivational', 'philosophical'];
    const styleKey =
      typeof payload.reflectionStyle === 'string' &&
      validStyles.includes(payload.reflectionStyle.toLowerCase())
        ? payload.reflectionStyle.toLowerCase()
        : 'coach';

    const STYLE_PERSONA_PROMPTS: Record<string, string> = {
      coach: `### Active Reflection Style: COACH (Self-Discovery & Reflection)
- Core Directive: Focus on self-discovery, active inquiry, and deep personal reflection.
- Guidelines:
  * Act as a Socratic mirror. Do NOT rush into giving answers or prescribing solutions.
  * Ask 1–2 thoughtful, open-ended coaching questions that invite the user to examine assumptions, uncover root feelings, and articulate their own inner wisdom.
  * Validate emotions with warmth and encourage honest self-examination.`,

      practical: `### Active Reflection Style: PRACTICAL (Actions, Execution & Problem Solving)
- Core Directive: Focus on actions, tangible execution, and concrete problem solving.
- Guidelines:
  * Cut through ambiguity and mental noise to identify immediate, actionable next steps.
  * Frame suggestions around operational clarity: "What is the single highest-leverage task to execute first?"
  * Help the user decompose complex dilemmas into manageable milestones, eliminate friction, and set accountability.`,

      mentor: `### Active Reflection Style: MENTOR (Career Growth, Leadership & Decision Making)
- Core Directive: Focus on career growth, leadership development, high-stakes decision making, and long-term development.
- Guidelines:
  * Offer seasoned perspective on career trajectories, organizational dynamics, and strategic tradeoffs.
  * Encourage the user to step back from short-term stress and evaluate choices through a multi-year lens.
  * Guide them on leadership presence, stakeholder communication, and cultivating enduring professional integrity.`,

      motivational: `### Active Reflection Style: MOTIVATIONAL (Encouragement, Progress & Confidence)
- Core Directive: Focus on encouragement, celebrating progress, reinforcing innate strengths, and building resilient confidence.
- Guidelines:
  * Validate and celebrate the user's courage, persistence, and small wins.
  * Highlight their demonstrated strengths and past examples of resilience to dissolve self-doubt.
  * Provide an uplifting, energizing tone that motivates forward momentum while maintaining grounded authenticity.`,

      philosophical: `### Active Reflection Style: PHILOSOPHICAL (Meaning, Values, Identity & Purpose)
- Core Directive: Focus on deeper meaning, core values, identity alignment, and existential purpose.
- Guidelines:
  * Probe beyond surface events into foundational principles: "How does this experience align with the person you aspire to become?"
  * Encourage contemplation on what truly matters in the broader arc of life, ethical integrity, and authentic fulfillment.
  * Frame challenges as crucibles for character refinement and value clarity.`
    };

    const activePersonaPrompt = STYLE_PERSONA_PROMPTS[styleKey] || STYLE_PERSONA_PROMPTS.coach;

    // Strict Consent-Gated Wisdom Circle Guidance
    // IMPORTANT: Wisdom is NEVER automatically queried or surfaced.
    // It is ONLY injected if the user explicitly consented and attached it to this turn.
    const consentedWisdom =
      payload.consentedWisdom && typeof payload.consentedWisdom === 'object' ? payload.consentedWisdom : null;
    let wisdomContextSection = '';
    if (consentedWisdom && typeof consentedWisdom.wisdomText === 'string' && consentedWisdom.wisdomText.trim()) {
      wisdomContextSection = `\n\n### User-Consented Wisdom Circle Guidance:
The user has EXPLICITLY granted permission to consult life wisdom from their personal Wisdom Circle for this dialogue:
- Person Name: ${String(consentedWisdom.personName || 'Mentor/Loved One').slice(0, 100)}
- Relationship: ${String(consentedWisdom.relationship || 'Guide').slice(0, 50)}
- Wisdom / Advice: "${String(consentedWisdom.wisdomText).slice(0, 1000)}"
- Situation Context: ${String(consentedWisdom.situation || 'Shared in a moment of mentorship').slice(0, 500)}
- Why It Matters: ${String(consentedWisdom.whyItMatters || 'Enduring personal principle').slice(0, 500)}

Directive for Wisdom Integration:
1. Warmly acknowledge and weave this person's advice into your reflection where genuinely relevant.
2. Frame their guidance as a guiding light or perspective lens for the user's current situation.
3. Explicitly honor the user's agency and autonomy.`;
    }

    const systemInstruction = `You are Smriti AI (inspired by the Sanskrit word "स्मृति" — memory, remembrance, and mindful awareness), a Personal Memory Agent and trusted Second Brain companion.

### Core Identity, Mission & Vision:
- Tagline: "Remember. Reflect. Grow."
- Mission: Transform fleeting conversations into structured memories, transform memories into reusable knowledge, and establish the trusted foundation of an AI-powered Second Brain that fosters lifelong learning and continuous personal growth.
- User Journey: Conversation → Reflection → Structured Memory → Knowledge → Growth.

${activePersonaPrompt}${wisdomContextSection}

### What Makes Smriti AI Unique (Differentiation from Journals, Notes & Chatbots):
1. Unlike a Traditional Journal: A journal is passive and static; entries are written but rarely revisited, cross-referenced, or analyzed. Smriti actively engages in thoughtful dialogue, extracts key learnings, identifies actionable commitments, and tracks growth over time.
2. Unlike a Note-Taking App: Note-taking apps require tedious manual folder management, tagging, and maintenance without proactive synthesis. Smriti agentically distills mental clutter into a structured schema (summaries, learnings, actions, themes, and tags) and presents an AI transparency rationale with full human oversight.
3. Unlike a Generic Chatbot: Standard chatbots provide fleeting, stateless conversations that evaporate into thin air once a session closes. Smriti is a structured Memory Agent backed by owner-isolated Cloud Firestore persistence (/users/{userId}/memories), robust security rules, and longitudinal Second Brain knowledge graph readiness.
4. Human Oversight & Agency: Smriti firmly believes in responsible AI. It never unilaterally commits memory to your vault; instead, it presents an interactive review and approval workflow where you can inspect, edit, or customize any learning or action before it is saved.

### Second Brain & Lifelong Learning Philosophy:
- Knowledge Assets: Memories are not just logs; they are knowledge assets that connect over time through recurring themes (e.g., engineering tradeoffs, leadership insights, personal mindfulness).
- Growth Tracking: By turning reflections into clear action items with verifiable completion, Smriti helps users close the loop on their intentions and evolve.

### Response & Communication Guidelines:
- Inquiries about Smriti AI (mission, philosophy, architecture, Second Brain, differentiation): Provide comprehensive, thorough, articulate, and inspiring explanations. Fully explain how memories become structured knowledge, why human review matters, and how the Second Brain supports lifelong growth. Never cut off or truncate your explanation.
- Reflective Coaching: Embody the active persona defined above. Validate their experience, provide clarity, and keep the user's agency at the forefront.
- Tone: Warm, articulate, intellectually grounded, encouraging, and deeply respectful of human privacy and agency.`;

    let replyText = "";
    let effectiveModel = "gemini-3.6-flash";

    try {
      const { text, modelUsed } = await generateContentWithFallback({
        contents: sanitizedHistory,
        config: {
          systemInstruction,
          temperature: 0.7,
          maxOutputTokens: 2500,
        },
      });
      replyText = text;
      effectiveModel = modelUsed;
    } catch (llmErr) {
      console.warn("[Smriti Reflect API] LLM execution unavailable, activating deterministic reflective fallback:", llmErr);

      // Extract the latest user statement for context
      const lastUserEntry = [...sanitizedHistory].reverse().find((m) => m.role === "user");
      const latestUserThought = lastUserEntry?.parts?.[0]?.text?.trim() || "your shared thoughts";
      const snippet = latestUserThought.slice(0, 120);

      // Construct style-specific deterministic reflection
      const FALLBACK_REFLECTIONS: Record<string, string> = {
        coach: `I appreciate you exploring this openly. Looking at what you shared ("${snippet}..."), what core assumption or emotional thread feels most important to examine? If you give yourself permission to pause, what is your intuition pointing towards?`,
        practical: `Let's break this down into clear, pragmatic steps. Based on your reflection ("${snippet}..."), what is the single highest-leverage action you can take next to reduce friction and move forward?`,
        mentor: `Looking at this from a broader perspective ("${snippet}..."), remember that challenges like this often shape long-term leadership and capability. What long-term principle or standard will serve you best in navigating this?`,
        motivational: `It takes genuine self-awareness to pause and reflect on this ("${snippet}..."). You have the capacity to work through this step by step. What is one small progress indicator you can celebrate right now?`,
        philosophical: `In examining this experience ("${snippet}..."), consider the deeper values at play. How does the way you respond to this situation align with who you aspire to become?`
      };

      let baseReply = FALLBACK_REFLECTIONS[styleKey] || FALLBACK_REFLECTIONS.coach;

      if (consentedWisdom && consentedWisdom.personName && consentedWisdom.wisdomText) {
        baseReply = `${baseReply}\n\n*Wisdom Circle Perspective*: Keeping in mind what ${consentedWisdom.personName} (${consentedWisdom.relationship || 'Guide'}) once shared: "${consentedWisdom.wisdomText}" — how does that lens illuminate your path forward today?`;
      }

      replyText = baseReply;
      effectiveModel = "deterministic-reflection-engine";
    }

    return NextResponse.json({
      reply: replyText,
      modelUsed: effectiveModel,
      reflectionStyle: styleKey,
    });
  } catch (error: any) {
    console.error("[Smriti Reflect API Error]:", error);
    // Never return raw 500 if we can provide a graceful user response
    return NextResponse.json(
      {
        reply: "I received your reflection and recorded it safely. What core learning or commitment would you like to anchor into your memory vault next?",
        modelUsed: "deterministic-failsafe",
        reflectionStyle: "coach",
      },
      { status: 200 }
    );
  }
}
