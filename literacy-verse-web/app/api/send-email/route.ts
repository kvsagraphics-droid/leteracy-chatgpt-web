import { NextResponse } from 'next/server';
import { Resend } from 'resend';

// Vercel Environment Variables වලින් API Key එක ලබා ගැනීම
const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const { userEmail, userName, verifyLink } = await request.json();

    // ඊමේල් එක සාර්ථකව යැවීම
    const data = await resend.emails.send({
      from: 'Literacy Verse <onboarding@resend.dev>', // ඔබගේ custom domain එකක් තවම නැත්නම් මෙය භාවිතා කරන්න
      to: [userEmail],
      subject: `Verify your account, ${userName}! ✦`,
      html: `
        <div style="font-family: 'Segoe UI', Helvetica, Arial, sans-serif; background-color: #f8fafc; padding: 40px 15px; color: #1e293b; margin: 0;">
          <div style="max-width: 540px; margin: 0 auto; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 25px rgba(99, 102, 241, 0.05); border: 1px solid #f1f5f9;">
            
            <!-- 🖼️ OFFICIAL LITERACY VERSE LOGO -->
            <div style="text-align: center; padding: 40px 20px 10px 20px;">
              <img src="https://githubusercontent.com" alt="Literacy Verse Global Logo" style="width: 140px; height: auto; display: block; margin: 0 auto;" />
            </div>

            <!-- ✉️ MAIN BODY CONTENT -->
            <div style="padding: 20px 40px 40px 40px; text-align: center;">
              <h3 style="color: #0f172a; font-size: 22px; margin-top: 10px; font-weight: 700; letter-spacing: -0.5px;">Verify your email address</h3>
              
              <p style="font-size: 15px; line-height: 1.6; color: #64748b; margin-top: 15px;">
                Hi ${userName},<br/><br/>
                Thank you for joining Literacy Verse! To finalize your account setup and step into a universe of endless learning, please confirm your email address by clicking the button below.
              </p>
              
              <!-- 🚀 CALL TO ACTION BUTTON (VERIFY LINK) -->
              <div style="margin: 35px 0;">
                <a href="${verifyLink}" target="_blank" style="background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); color: #ffffff; padding: 14px 35px; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 15px; display: inline-block; box-shadow: 0 4px 15px rgba(79, 70, 229, 0.3); letter-spacing: 0.5px;">
                  Verify Account
                </a>
              </div>

              <p style="font-size: 13px; color: #94a3b8; line-height: 1.5; margin-top: 30px; text-align: center;">
                If the button above doesn't work, copy and paste this URL into your browser:<br />
                <a href="${verifyLink}" target="_blank" style="color: #6366f1; text-decoration: none; word-break: break-all; display: inline-block; margin-top: 5px;">${verifyLink}</a>
              </p>
            </div>

            <!-- 🔒 SECURITY NOTE -->
            <div style="background-color: #f8fafc; padding: 20px 40px; text-align: left; border-top: 1px solid #f1f5f9;">
              <p style="margin: 0; font-size: 12px; color: #94a3b8; line-height: 1.5;">
                <strong>Didn't request this?</strong> If you didn't create a Literacy Verse account, you can safely ignore or delete this email.
              </p>
            </div>

            <!-- 🦶 FOOTER -->
            <div style="background-color: #ffffff; padding: 25px; text-align: center; border-top: 1px solid #f1f5f9;">
              <p style="margin: 0; font-size: 12px; color: #94a3b8; font-weight: 500;">
                &copy; 2026 Literacy Verse Global. Built for curious learners everywhere.
              </p>
            </div>

          </div>
        </div>
      `,
    });

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
