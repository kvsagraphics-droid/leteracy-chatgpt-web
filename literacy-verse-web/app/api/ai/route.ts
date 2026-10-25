import { NextResponse } from "next/server";

export const runtime = "nodejs";

const languageNames: Record<string, string> = {
  en: "English", si: "Sinhala", ta: "Tamil", es: "Spanish", fr: "French", ar: "Arabic", hi: "Hindi", pt: "Portuguese", zh: "Chinese"
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const message = String(body?.message ?? "").trim();
    const language = languageNames[String(body?.language ?? "en")] ?? "English";
    const grade = String(body?.grade ?? "learner").slice(0, 60);
    const history = Array.isArray(body?.history) ? body.history.slice(-8).map((item: any) => ({
      role: item?.role === "assistant" ? "assistant" : "user",
      content: String(item?.content ?? "").slice(0, 2500)
    })) : [];

    if (!message) return NextResponse.json({ error: "Please type a question first." }, { status: 400 });
    if (message.length > 4000) return NextResponse.json({ error: "Please keep each question under 4,000 characters." }, { status: 413 });

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      const fallback = language === "Sinhala"
        ? "Demo AI Tutor: ඔබේ ප්‍රශ්නයට ස්තුතියි! සම්පූර්ණ AI පිළිතුරු සක්‍රිය කිරීමට Vercel හි OPENAI_API_KEY එක සකසන්න. මේ අතර, ප්‍රශ්නය කුඩා කොටස්වලට බෙදා බලන්න: (1) ඔබ දන්නා දේ ලියන්න, (2) තේරුම් නොගත් කොටස හඳුනාගන්න, (3) එක් උදාහරණයක් ඉල්ලන්න."
        : language === "Tamil"
          ? "Demo AI Tutor: உங்கள் கேள்விக்கு நன்றி! முழுமையான AI பதில்களுக்கு Vercel இல் OPENAI_API_KEY அமைக்கவும். இப்போது கேள்வியை சிறு பகுதிகளாகப் பிரித்து, ஒரு எடுத்துக்காட்டைக் கேளுங்கள்."
          : "Demo AI Tutor: Thanks for your question! To enable live AI answers, add OPENAI_API_KEY in Vercel. For now, break the question into smaller parts, identify what you already know, and ask for one worked example.";
      return NextResponse.json({ reply: fallback, demo: true });
    }

    const system = `You are Literacy Verse Tutor, a patient, encouraging, age-aware educational AI tutor. Reply in ${language}. Adapt explanations to learner level: ${grade}. Ask gentle clarifying questions when needed; explain step by step; use simple examples and avoid shaming. Encourage independent thinking rather than only giving final answers. Never claim you know a learner's private psychological state. For medical, safety, legal, or crisis matters, give cautious general information and advise a trusted adult or qualified professional as appropriate. Do not invent citations or pretend to have live internet access. Say clearly when unsure. Keep the response readable and suitable for a global audience.`;
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        messages: [{ role: "system", content: system }, ...history, { role: "user", content: message }],
        temperature: 0.5,
        max_tokens: 900
      }),
      signal: AbortSignal.timeout(30000)
    });
    const data = await response.json();
    if (!response.ok) {
      console.error("AI provider error:", data?.error?.message || response.statusText);
      return NextResponse.json({ error: "The tutor is temporarily unavailable. Please try again shortly." }, { status: 502 });
    }
    const reply = data?.choices?.[0]?.message?.content;
    if (!reply) return NextResponse.json({ error: "The tutor did not return an answer. Please try again." }, { status: 502 });
    return NextResponse.json({ reply, demo: false });
  } catch (error) {
    console.error("AI route error:", error);
    return NextResponse.json({ error: "We couldn't process that question. Please try again." }, { status: 500 });
  }
}
