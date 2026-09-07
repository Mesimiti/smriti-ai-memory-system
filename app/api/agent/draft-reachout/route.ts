import { NextRequest, NextResponse } from "next/server";
import { generateContentWithFallback } from "@/lib/gemini";
import { ReachoutDraftResponse } from "@/lib/types";

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
    const contactObj = payload.contact && typeof payload.contact === "object" ? payload.contact : {};
    const contactName = String(payload.contactName || contactObj.name || "Friend").trim().slice(0, 80);
    const relationship = String(payload.relationship || contactObj.relationship || "Friend").trim().slice(0, 50);
    const whyTheyMatter = String(
      payload.whyTheyMatter ||
      contactObj.whyTheyMatter ||
      "You're someone whose presence and perspective I trust."
    ).trim().slice(0, 300);
    const preferredMethod = String(
      payload.preferredMethod ||
      contactObj.preferredMethod ||
      "Text / SMS"
    ).trim();
    const userExperience = String(payload.userExperience || "I've been feeling overwhelmed lately.").trim().slice(0, 800);
    const supportSeeking = String(payload.supportSeeking || "Just someone to talk to or listen for a few minutes.").trim().slice(0, 400);
    const tone = String(payload.tone || "Gentle & Vulnerable").trim();

    if (!userExperience) {
      return NextResponse.json(
        { error: "Please provide context on what you are experiencing." },
        { status: 400 }
      );
    }

    const isShortFormat = preferredMethod.includes("Text") || preferredMethod.includes("SMS");

    const systemPrompt = `You are Smriti AI's Human Connection Bridge & Trusted Circle Assistant.
Your core mission is to help the user reconnect with real people they trust during difficult or reflective periods.

CRITICAL RESPONSIBLE AI PRINCIPLES:
1. HUMAN CONSENT & FREEDOM: This draft will be reviewed, edited, and sent manually by the user. Smriti AI NEVER sends messages automatically.
2. NO EMOTIONAL MANIPULATION: Draft with dignity, calm honesty, and clear, low-pressure expectations. Never write guilt-inducing or manipulative language. Always include low-pressure respect (e.g., "No rush to reply," "Whenever you have a chance").
3. THREE-PART STRUCTURE REQUIRED:
   - PART 1: What the user is experiencing (honest, grounded, not overly dramatic).
   - PART 2: What support they are seeking (clear, simple, specific ask, e.g. a 10-minute phone call, a walk, coffee, or just a listening ear).
   - PART 3: Why they are reaching out to this specific person (acknowledging their relationship and trust).

INPUT DATA:
- Trusted Person's Name: ${contactName}
- Relationship: ${relationship}
- Why This Person Matters: ${whyTheyMatter}
- Preferred Channel: ${preferredMethod} (format accordingly: ${isShortFormat ? "concise text message" : "thoughtful message/email"})
- What User Is Experiencing: ${userExperience}
- Support User Is Seeking: ${supportSeeking}
- Desired Tone: ${tone}

TASK:
Generate a compassionate, authentic, and easily editable message draft that the user can adapt and send to ${contactName}.
Also provide a 1-sentence breakdown of each element and 2 practical tips.

Output strictly valid JSON in the following format:
{
  "draftMessage": "Hey ${contactName}, ...",
  "experienceSummary": "Articulates your current feeling of ...",
  "supportSummary": "Asks for ...",
  "reachoutReason": "Reminds them that you value their ...",
  "tips": [
    "Tip 1 on sending with confidence",
    "Tip 2 on personalizing"
  ]
}`;

    try {
      const { text } = await generateContentWithFallback({
        contents: [{ role: "user", parts: [{ text: systemPrompt }] }],
        config: {
          temperature: 0.3,
          maxOutputTokens: 1200,
        },
      });

      let cleaned = text.trim();
      if (cleaned.startsWith("```json")) {
        cleaned = cleaned.replace(/^```json\s*/, "").replace(/\s*```$/, "");
      } else if (cleaned.startsWith("```")) {
        cleaned = cleaned.replace(/^```\s*/, "").replace(/\s*```$/, "");
      }

      const parsed: any = JSON.parse(cleaned);
      if (parsed && typeof parsed.draftMessage === "string") {
        return NextResponse.json({
          ...parsed,
          whatExperiencing: parsed.whatExperiencing || parsed.experienceSummary || userExperience,
          supportSeeking: parsed.supportSeeking || parsed.supportSummary || supportSeeking,
          whyReachingOut: parsed.whyReachingOut || parsed.reachoutReason || `Values connection with ${contactName}`,
          modelUsed: "gemini-3.6-flash",
        });
      }
    } catch (llmErr) {
      console.warn("LLM draft-reachout fallback triggered:", llmErr);
    }

    // Algorithmic Fallback to guarantee resilience
    const fallbackGreeting = `Hey ${contactName},`;
    const fallbackExp = userExperience.endsWith(".") ? userExperience : `${userExperience}.`;
    const fallbackSupport = supportSeeking.endsWith(".") ? supportSeeking : `${supportSeeking}.`;
    const fallbackReason = whyTheyMatter
      ? `You came to mind because ${whyTheyMatter.toLowerCase().startsWith("you") ? whyTheyMatter : `I really value ${whyTheyMatter}`}.`
      : `I've always valued your friendship and perspective.`;

    let fallbackDraft = "";
    if (isShortFormat) {
      fallbackDraft = `${fallbackGreeting} hope you're doing well. I've been feeling a bit overwhelmed lately (${fallbackExp.slice(0, 120)}). ${fallbackReason} Would you be open to catching up or having a quick call sometime this week? (${fallbackSupport}) Absolutely no pressure if you're busy!`;
    } else {
      fallbackDraft = `${fallbackGreeting}

I hope you've been having a peaceful week.

I wanted to reach out because things have felt a bit heavy on my end recently: ${fallbackExp}

${fallbackReason}

I was wondering if we might be able to connect sometime soon—even just for ${fallbackSupport.toLowerCase().replace(/^(just|someone to)\s*/, "")} Having your presence would mean a lot to me.

There is zero pressure to reply right away; whenever you have a free moment is great.

Warmly,`;
    }

    const fallbackResponse: ReachoutDraftResponse = {
      draftMessage: fallbackDraft,
      experienceSummary: `Shared your experience: "${userExperience.slice(0, 80)}..."`,
      supportSummary: `Requested support: "${supportSeeking.slice(0, 80)}..."`,
      reachoutReason: `Affirmed why ${contactName} is in your Trusted Circle.`,
      whatExperiencing: userExperience.slice(0, 120),
      supportSeeking: supportSeeking.slice(0, 120),
      whyReachingOut: whyTheyMatter ? whyTheyMatter.slice(0, 120) : `Deep trust in ${contactName}`,
      modelUsed: "deterministic-algorithmic-fallback",
      tips: [
        "Take a deep breath before sending—reaching out to trusted people is an act of courage, not weakness.",
        "Feel free to modify or delete any sentences so it sounds 100% like your natural voice.",
      ],
    };

    return NextResponse.json(fallbackResponse);
  } catch (err: any) {
    console.error("[Draft Reachout API Route Error]:", err);
    // Safe graceful recovery response to prevent crash
    const safeResponse: ReachoutDraftResponse = {
      draftMessage: "Hey, I've had a lot on my mind recently and was thinking of you. Would you be free for a quick chat sometime soon? No rush at all.",
      experienceSummary: "Connecting with trusted circle",
      supportSummary: "Friendly catch up",
      reachoutReason: "Reaching out to a trusted contact",
      whatExperiencing: "Reflecting on recent events",
      supportSeeking: "Conversation and connection",
      whyReachingOut: "Trusted relationship",
      modelUsed: "deterministic-failsafe",
      tips: ["Adjust the text to your own voice before sending."],
    };
    return NextResponse.json(safeResponse, { status: 200 });
  }
}
