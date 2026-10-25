import { NextResponse } from "next/server";

export const runtime = "nodejs";

const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/interactions";
const DEFAULT_MODEL = "gemini-3.8-flash";
const MAX_MESSAGE_CHARS = 4000;
const MAX_HISTORY_TURNS = 10;
const MAX_HISTORY_CHARS = 2500;

type ChatRole = "user" | "assistant";
type ChatTurn = { role: ChatRole; content: string };
type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normaliseHistory(value: unknown): ChatTurn[] {
  if (!Array.isArray(value)) return [];

  return value
    .slice(-MAX_HISTORY_TURNS)
    .map((item: unknown): ChatTurn | null => {
      if (!isRecord(item)) return null;
      const content = String(item.content ?? "").trim().slice(0, MAX_HISTORY_CHARS);
      if (!content) return null;
      return {
        role: item.role === "assistant" ? "assistant" : "user",
        content,
      };
    })
    .filter((item): item is ChatTurn => item !== null);
}

function extractReplyAndSources(data: unknown): {
  reply: string;
  sources: Array<{ title: string; url: string }>;
} {
  if (!isRecord(data) || !Array.isArray(data.steps)) {
    return { reply: "", sources: [] };
  }

  const textParts: string[] = [];
  const sources: Array<{ title: string; url: string }> = [];

  for (const step of data.steps) {
    if (!isRecord(step) || step.type !== "model_output" || !Array.isArray(step.content)) continue;

    for (const block of step.content) {
      if (!isRecord(block)) continue;
      if (block.type === "text" && typeof block.text === "string") {
        textParts.push(block.text);
      }

      if (!Array.isArray(block.annotations)) continue;
      for (const annotation of block.annotations) {
        if (!isRecord(annotation) || annotation.type !== "url_citation") continue;
        const url = typeof annotation.url === "string" ? annotation.url : "";
        if (!url.startsWith("https://") && !url.startsWith("http://")) continue;
        let fallbackTitle = url;
        try {
          fallbackTitle = new URL(url).hostname;
        } catch {
          // Keep the raw URL as a fallback label if the provider returns a malformed citation.
        }
        const title = typeof annotation.title === "string" && annotation.title.trim()
          ? annotation.title.trim()
          : fallbackTitle;
        if (!sources.some((source) => source.url === url)) sources.push({ title, url });
      }
    }
  }

  return { reply: textParts.join("\n\n").trim(), sources };
}

export async function POST(request: Request) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Please send a valid JSON request." }, { status: 400 });
    }

    if (!isRecord(body)) {
      return NextResponse.json({ error: "The request body must be a JSON object." }, { status: 400 });
    }

    const message = String(body.message ?? "").trim();
    const learnerLevel = String(body.grade ?? "learner").trim().slice(0, 60) || "learner";
    const uiLanguage = String(body.language ?? "").trim().slice(0, 60);
    const countryContext = String(body.country ?? "").trim().slice(0, 80);
    const history = normaliseHistory(body.history);

    if (!message) {
      return NextResponse.json({ error: "Please type a question first." }, { status: 400 });
    }
    if (message.length > MAX_MESSAGE_CHARS) {
      return NextResponse.json(
        { error: `Please keep each question under ${MAX_MESSAGE_CHARS.toLocaleString()} characters.` },
        { status: 413 },
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "The AI Tutor is not configured yet. Add GEMINI_API_KEY to your server/Vercel environment variables." },
        { status: 503 },
      );
    }

    const systemInstruction = [
      "You are Literacy Verse Tutor, a globally aware, multilingual AI learning companion for learners of different ages and education levels.",
      "LANGUAGE IS CRITICAL: Detect the language of the latest user message and answer in that same language and writing script. This applies to any language you can understand, not just a predefined list. Do not default to English merely because the website UI is English. If the learner mixes languages, normally reply in the dominant language while keeping useful technical terms in their original form. If the learner explicitly asks for a different response language, follow that request. The UI language hint is only a fallback if the latest message has no clear language preference; it must never override the language of the latest message.",
      `Website UI language hint (weak preference only): ${uiLanguage || "not provided"}.`,
      `Learner level / grade hint: ${learnerLevel}. Adapt vocabulary, pace, examples, and depth without talking down to the learner.`,
      `Country or region context explicitly supplied by the learner: ${countryContext || "not provided"}. Do not infer a learner's country from their language, name, IP address, or other indirect clues.`,
      "GLOBAL EDUCATION AND KNOWLEDGE: Help with literacy, school and university subjects, mathematics, science, computing, technology, languages, world history, geography, cultures, civic knowledge, and education systems across countries. Be culturally respectful, avoid stereotypes, explain unfamiliar local concepts, and use metric/SI units by default while noting local alternatives when useful.",
      "COUNTRY-SPECIFIC ANSWERS: Education curricula, laws, government services, official requirements, public policies, dates, prices, and local practices can differ by country and change over time. Use Google Search when up-to-date or country-specific verification would materially improve the answer. Prefer official government, university, school-system, primary-source, and reputable institutional sources. Do not invent sources or citations. If the country, grade, syllabus, or date matters and is unknown, ask one concise clarifying question or clearly state the assumption.",
      "TEACHING METHOD: Be patient, encouraging, inclusive, and non-judgmental. Explain difficult ideas step by step, use age-appropriate examples, check understanding when useful, and encourage the learner to reason independently instead of only giving an answer. Define specialist terms. For homework, teach the method and give a worked example where useful.",
      "ACCURACY: You may have gaps and search results may be incomplete. Never claim to know everything or that an answer is guaranteed perfect. Be transparent about uncertainty, separate verified facts from estimates/opinions, and correct false premises politely. Do not claim you searched unless search was actually used, and do not pretend to have accessed private databases.",
      "SAFETY AND PRIVACY: Do not ask learners to disclose passwords, exact home addresses, school IDs, or other unnecessary personal data. For medical, legal, financial, abuse, self-harm, or other high-stakes matters, provide cautious general information and recommend an appropriate qualified professional or trusted adult. Never claim to diagnose a learner or know their private psychological state.",
      "Reply naturally in the user's language. Keep answers well-structured and readable; use headings or short lists only when useful.",
    ].join("\n\n");

    // Use an explicit turn list so the current user message is clearly distinguishable
    // from prior conversation. Prior user/assistant content is treated as conversation
    // context, not as instructions that can replace the tutor's system rules.
    const input = [
      ...history.map((turn) => ({
        type: turn.role === "assistant" ? "model_output" : "user_input",
        content: [{ type: "text", text: turn.content }],
      })),
      { type: "user_input", content: [{ type: "text", text: message }] },
    ];

    const response = await fetch(GEMINI_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        model: process.env.GEMINI_MODEL || DEFAULT_MODEL,
        input,
        system_instruction: systemInstruction,
        tools: [{ type: "google_search" }],
        generation_config: {
          max_output_tokens: 1200,
        },
        // Avoid storing student chat data in Gemini's interaction history by default.
        store: false,
      }),
      signal: AbortSignal.timeout(55000),
    });

    const data: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      const providerMessage = isRecord(data) && isRecord(data.error) && typeof data.error.message === "string"
        ? data.error.message
        : response.statusText;
      console.error("Gemini API request failed:", response.status, providerMessage);
      return NextResponse.json(
        {
          error: response.status === 429
            ? "The AI Tutor is receiving too many requests right now. Please try again shortly."
            : "The AI Tutor could not complete that request. Check the Gemini API key, model access, and API quota, then try again.",
        },
        { status: response.status === 429 ? 429 : 502 },
      );
    }

    const { reply, sources } = extractReplyAndSources(data);
    if (!reply) {
      console.error("Gemini returned no readable model output.");
      return NextResponse.json(
        { error: "The AI Tutor did not return a readable answer. Please try again." },
        { status: 502 },
      );
    }

    return NextResponse.json({ reply, demo: false, sources });
  } catch (error) {
    console.error("Literacy Verse Gemini route error:", error);
    const isTimeout = error instanceof Error && error.name === "TimeoutError";
    return NextResponse.json(
      { error: isTimeout
        ? "The AI Tutor took too long to respond. Please try again."
        : "We could not process that question. Please try again." },
      { status: isTimeout ? 504 : 500 },
    );
  }
}
