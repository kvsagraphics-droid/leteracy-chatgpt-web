import { NextResponse } from "next/server";

export const runtime = "nodejs";

const languageNames: Record<string, string> = { 
  en: "English", si: "Sinhala", ta: "Tamil", es: "Spanish", fr: "French", 
  ar: "Arabic", hi: "Hindi", pt: "Portuguese", zh: "Chinese"
};

export async function POST(request: Request) { 
  try { 
    const body = await request.json(); 
    const message = String(body?.message ?? "").trim(); 
    const language = languageNames[String(body?.language ?? "en")] ?? "English"; 
    const grade = String(body?.grade ?? "learner").slice(0, 60); 
    
    // Gemini API එකට ගැලපෙන ලෙස Chat History එක සකස් කිරීම (role එක user සහ model ලෙස විය යුතුය)
    const history = Array.isArray(body?.history) ? body.history.slice(-8).map((item: any) => ({ 
      role: item?.role === "assistant" ? "model" : "user", 
      parts: [{ text: String(item?.content ?? "").slice(0, 2500) }] 
    })) : []; 

    if (!message) return NextResponse.json({ error: "Please type a question first." }, { status: 400 }); 
    if (message.length > 4000) return NextResponse.json({ error: "Please keep each question under 4,000 characters." }, { status: 413 }); 

    // Vercel එකේ ඔයා සෙට් කරපු GEMINI_API_KEY එක මෙතනට ගන්නවා
    const apiKey = process.env.GEMINI_API_KEY; 
    
    if (!apiKey) { 
      const fallback = language === "Sinhala" 
        ? "Demo AI Tutor: ඔබේ ප්‍රශ්නයට ස්තුතියි! සම්පූර්ණ AI පිළිතුරු සක්‍රිය කිරීමට Vercel හි GEMINI_API_KEY එක සකසන්න." 
        : language === "Tamil" 
          ? "Demo AI Tutor: உங்கள் கேள்விக்கு நன்றி! முழுமையான AI பதில்களுக்கு Vercel இல் GEMINI_API_KEY அமைக்கவும்." 
          : "Demo AI Tutor: Thanks for your question! To enable live AI answers, add GEMINI_API_KEY in Vercel."; 
      return NextResponse.json({ reply: fallback, demo: true }); 
    } 

    // ලෝක මට්ටමේ දැනුම (Global Knowledge) සහ ඕනෑම භාෂාවකින් චැට් කිරීමේ හැකියාව ලබා දෙන System Prompt එක
    const system = `You are Literacy Verse Tutor, a patient, encouraging, age-aware educational AI tutor with vast global knowledge covering all countries, cultures, and subjects.
    CRITICAL LANGUAGE RULE: Carefully detect the language and script of the user's message. You MUST reply in the EXACT SAME language and script that the user uses to chat with you (e.g., if they type in Sinhala, reply in Sinhala; if they type in Tamil, reply in Tamil; if English, reply in English; if they mix languages like Singlish, respond in a natural, helpful way matching their style).
    Adapt explanations to learner level: ${grade}. Ask gentle clarifying questions when needed; explain step by step; use simple examples and avoid shaming. Encourage independent thinking rather than only giving final answers. 
    Never claim you know a learner's private psychological state. For medical, safety, legal, or crisis matters, give cautious general information and advise a trusted adult or qualified professional as appropriate. 
    Do not invent citations or pretend to have live internet access. Say clearly when unsure. Keep the response readable and suitable for a global audience.`; 

    // Google Gemini API එක සෘජුවම Fetch මඟින් කෝල් කිරීම
    const response = await fetch(`https://googleapis.com{apiKey}`, { 
      method: "POST", 
      headers: { "Content-Type": "application/json" }, 
      body: JSON.stringify({ 
        contents: [
          ...history,
          { role: "user", parts: [{ text: message }] }
        ],
        systemInstruction: {
          parts: [{ text: system }]
        },
        generationConfig: { 
          temperature: 0.5, 
          maxOutputTokens: 900 
        } 
      }), 
      signal: AbortSignal.timeout(30000) 
    }); 

    const data = await response.json(); 
    
    if (!response.ok) { 
      console.error("Gemini provider error:", data?.error?.message || response.statusText); 
      return NextResponse.json({ error: "The tutor is temporarily unavailable. Please try again shortly." }, { status: 502 }); 
    } 

    // Gemini response ව්‍යුහයෙන් පිළිතුර ලබා ගැනීම
    const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text; 
    
    if (!reply) return NextResponse.json({ error: "The tutor did not return an answer. Please try again." }, { status: 502 }); 
    
    // Frontend එක බලාපොරොත්තු වන 'reply' කියන කී එකෙන්ම response එක යැවීම
    return NextResponse.json({ reply, demo: false }); 
  } catch (error) { 
    console.error("AI route error:", error); 
    return NextResponse.json({ error: "We couldn't process that question. Please try again." }, { status: 500 }); 
  } 
}
