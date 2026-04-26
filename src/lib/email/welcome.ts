import nodemailer from "nodemailer";

function createTransporter() {
  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });
}

export async function sendWelcomeEmail(to: string, name: string): Promise<void> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const from = process.env.GMAIL_USER;
  if (!from) return;

  const transporter = createTransporter();

  await transporter.sendMail({
    from: `"DrawLint.ai" <${from}>`,
    to,
    subject: "Welcome to DrawLint.ai 🎨",
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0a0a0a; color: #e5e5e5; margin: 0; padding: 40px 20px;">
  <div style="max-width: 520px; margin: 0 auto; background: #111; border: 1px solid #222; border-radius: 16px; padding: 40px;">
    <div style="text-align: center; margin-bottom: 32px;">
      <div style="display: inline-flex; width: 56px; height: 56px; background: linear-gradient(135deg, #7c3aed, #4f46e5); border-radius: 14px; align-items: center; justify-content: center; font-size: 24px; font-weight: bold; color: white; margin-bottom: 12px;">D</div>
      <h1 style="margin: 0; font-size: 22px; font-weight: 700; color: #fff;">DrawLint<span style="background: linear-gradient(90deg, #a78bfa, #67e8f9); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">.ai</span></h1>
    </div>

    <h2 style="margin: 0 0 8px; font-size: 22px; color: #fff;">Welcome, ${name}! 👋</h2>
    <p style="margin: 0 0 24px; color: #999; font-size: 15px; line-height: 1.7;">
      You're all set to practice system design with AI-powered reviews.
    </p>

    <h3 style="margin: 0 0 16px; font-size: 16px; color: #fff;">Here's how to get started:</h3>

    <div style="margin-bottom: 24px;">
      <div style="display: flex; align-items: flex-start; gap: 12px; margin-bottom: 16px;">
        <div style="width: 28px; height: 28px; min-width: 28px; border-radius: 50%; background: rgba(124,58,237,0.15); border: 1px solid rgba(124,58,237,0.3); display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700; color: #a78bfa;">1</div>
        <div>
          <p style="margin: 0; font-size: 14px; color: #fff; font-weight: 600;">Draw your architecture</p>
          <p style="margin: 4px 0 0; font-size: 13px; color: #888;">Use the interactive whiteboard with our structured template</p>
        </div>
      </div>
      <div style="display: flex; align-items: flex-start; gap: 12px; margin-bottom: 16px;">
        <div style="width: 28px; height: 28px; min-width: 28px; border-radius: 50%; background: rgba(124,58,237,0.15); border: 1px solid rgba(124,58,237,0.3); display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700; color: #a78bfa;">2</div>
        <div>
          <p style="margin: 0; font-size: 14px; color: #fff; font-weight: 600;">Submit for AI review</p>
          <p style="margin: 4px 0 0; font-size: 13px; color: #888;">6 specialized reviewers analyze your design in parallel</p>
        </div>
      </div>
      <div style="display: flex; align-items: flex-start; gap: 12px;">
        <div style="width: 28px; height: 28px; min-width: 28px; border-radius: 50%; background: rgba(124,58,237,0.15); border: 1px solid rgba(124,58,237,0.3); display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700; color: #a78bfa;">3</div>
        <div>
          <p style="margin: 0; font-size: 14px; color: #fff; font-weight: 600;">Get your hire signal</p>
          <p style="margin: 4px 0 0; font-size: 13px; color: #888;">From Strong Hire to No Hire — with actionable feedback</p>
        </div>
      </div>
    </div>

    <div style="background: rgba(124,58,237,0.08); border: 1px solid rgba(124,58,237,0.2); border-radius: 10px; padding: 16px; margin-bottom: 24px;">
      <p style="margin: 0; font-size: 13px; color: #a78bfa; font-weight: 600;">🎁 Your free tier includes:</p>
      <p style="margin: 8px 0 0; font-size: 13px; color: #999;">10 AI reviews/month with DrawLint AI — or connect Gemini for unlimited free reviews.</p>
    </div>

    <a href="${appUrl}/canvas" style="display: block; text-align: center; background: linear-gradient(135deg, #7c3aed, #4f46e5); color: white; text-decoration: none; padding: 14px 24px; border-radius: 10px; font-size: 15px; font-weight: 600; margin-bottom: 24px;">
      Start Drawing →
    </a>

    <div style="text-align: center;">
      <a href="${appUrl}/guide" style="color: #7c3aed; font-size: 13px; text-decoration: none;">📖 Read the Drawing Guide</a>
      <span style="color: #333; margin: 0 8px;">·</span>
      <a href="${appUrl}/guide/byo-keys" style="color: #7c3aed; font-size: 13px; text-decoration: none;">⚙️ AI Setup Guide</a>
    </div>

    <hr style="border: none; border-top: 1px solid #222; margin: 24px 0;">
    <p style="margin: 0; color: #555; font-size: 12px; text-align: center;">
      Built for system design interview practice.<br>
      <a href="https://github.com/omsitapara98/drawlint.ai" style="color: #666;">Open source on GitHub</a>
    </p>
  </div>
</body>
</html>`,
    text: `Welcome to DrawLint.ai, ${name}!\n\nYou're all set to practice system design with AI-powered reviews.\n\n1. Draw your architecture\n2. Submit for AI review\n3. Get your hire signal\n\nStart drawing: ${appUrl}/canvas\nDrawing guide: ${appUrl}/guide\nAI setup: ${appUrl}/guide/byo-keys`,
  });
}
