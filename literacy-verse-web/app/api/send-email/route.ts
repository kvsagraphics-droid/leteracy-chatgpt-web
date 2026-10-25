import { NextResponse } from "next/server";
import { Resend } from "resend";

export const runtime = "nodejs";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userEmail, userName } = body;
    const verifyLink = body?.verifyLink || "https://vercel.app";

    if (!userEmail) {
      return NextResponse.json({ error: "Receiver email is required." }, { status: 400 });
    }

    // Resend එකේ ඔයා හදපු "welcome-email" ටෙම්ප්ලේට් එක කෝල් කිරීම
    const data = await resend.emails.send({
      from: "Literacy Verse <onboarding@resend.dev>",
      to: [userEmail],
      subject: `Verify your account, ${userName}! ✦`,
      templateId: "welcome-email", // ඔයාගේ Resend Template Alias එක
    });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Resend Email Error:", error);
    return NextResponse.json({ error: "Failed to send email." }, { status: 500 });
  }
}
