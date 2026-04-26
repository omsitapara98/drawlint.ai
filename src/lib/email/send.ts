import nodemailer from "nodemailer";
import crypto from "crypto";

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

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

export async function sendVerificationEmail(to: string, token: string): Promise<void> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const verifyUrl = `${appUrl}/verify-email?token=${token}`;
  const from = process.env.GMAIL_USER;

  const transporter = createTransporter();

  await transporter.sendMail({
    from: `"DrawLint.ai" <${from}>`,
    to,
    subject: "Verify your DrawLint.ai email",
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0a0a0a; color: #e5e5e5; margin: 0; padding: 40px 20px;">
  <div style="max-width: 480px; margin: 0 auto; background: #111; border: 1px solid #222; border-radius: 16px; padding: 40px;">
    <div style="text-align: center; margin-bottom: 32px;">
      <div style="display: inline-flex; width: 56px; height: 56px; background: linear-gradient(135deg, #7c3aed, #4f46e5); border-radius: 14px; align-items: center; justify-content: center; font-size: 24px; font-weight: bold; color: white; margin-bottom: 12px;">D</div>
      <h1 style="margin: 0; font-size: 22px; font-weight: 700; color: #fff;">DrawLint<span style="background: linear-gradient(90deg, #a78bfa, #67e8f9); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">.ai</span></h1>
    </div>
    <h2 style="margin: 0 0 8px; font-size: 20px; color: #fff;">Verify your email</h2>
    <p style="margin: 0 0 28px; color: #999; font-size: 15px; line-height: 1.6;">Click the button below to verify your email address and unlock DrawLint AI reviews.</p>
    <a href="${verifyUrl}" style="display: block; text-align: center; background: linear-gradient(135deg, #7c3aed, #4f46e5); color: white; text-decoration: none; padding: 14px 24px; border-radius: 10px; font-size: 15px; font-weight: 600; margin-bottom: 24px;">Verify Email Address</a>
    <p style="margin: 0 0 8px; color: #666; font-size: 13px;">This link expires in 24 hours. If you didn't create a DrawLint.ai account, you can safely ignore this email.</p>
    <hr style="border: none; border-top: 1px solid #222; margin: 24px 0;">
    <p style="margin: 0; color: #555; font-size: 12px; word-break: break-all;">If the button above doesn't work, copy and paste this link:<br><a href="${verifyUrl}" style="color: #7c3aed;">${verifyUrl}</a></p>
    <p style="margin: 12px 0 0; color: #444; font-size: 11px; text-align: center; line-height: 1.5;">
      DrawLint.ai · <a href="${appUrl}/privacy" style="color: #555;">Privacy Policy</a> · <a href="${appUrl}/terms" style="color: #555;">Terms of Service</a><br>
      You received this email because an account was created with this address. This is a transactional email.
    </p>
  </div>
</body>
</html>`,
    text: `Verify your DrawLint.ai email\n\nClick this link to verify your email:\n${verifyUrl}\n\nThis link expires in 24 hours.`,
  });
}
