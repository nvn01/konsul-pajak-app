// src/lib/email.ts
import { Resend } from "resend";

/**
 * Get Resend client instance with API key validation
 */
function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    throw new Error(
      "RESEND_API_KEY is not set in environment variables. " +
      "Please add it to your .env file. " +
      "Get your API key from https://resend.com"
    );
  }

  return new Resend(apiKey);
}

/**
 * Sends an OTP verification email to the user
 */
export async function sendOTPEmail(email: string, code: string): Promise<void> {
  const resend = getResendClient();
  try {
    const { data, error } = await resend.emails.send({
      from: "Konsul Pajak <onboarding@resend.dev>",
      to: [email],
      subject: "Kode Verifikasi Login - Konsul Pajak",
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
              }
              .container {
                background-color: #ffffff;
                border-radius: 8px;
                padding: 40px;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
              }
              .header {
                text-align: center;
                margin-bottom: 30px;
              }
              .logo {
                background-color: #2563eb;
                color: white;
                width: 64px;
                height: 64px;
                border-radius: 8px;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                font-size: 24px;
                font-weight: bold;
                margin-bottom: 20px;
              }
              h1 {
                color: #1f2937;
                margin: 0;
                font-size: 24px;
              }
              .otp-code {
                background-color: #f3f4f6;
                border: 2px dashed #d1d5db;
                border-radius: 8px;
                padding: 20px;
                text-align: center;
                margin: 30px 0;
              }
              .otp-code-value {
                font-size: 36px;
                font-weight: bold;
                letter-spacing: 8px;
                color: #2563eb;
                font-family: 'Courier New', monospace;
              }
              .message {
                color: #6b7280;
                margin: 20px 0;
              }
              .warning {
                background-color: #fef3c7;
                border-left: 4px solid #f59e0b;
                padding: 12px 16px;
                margin: 20px 0;
                border-radius: 4px;
              }
              .footer {
                text-align: center;
                margin-top: 30px;
                padding-top: 20px;
                border-top: 1px solid #e5e7eb;
                color: #9ca3af;
                font-size: 14px;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <div class="logo">KP</div>
                <h1>Kode Verifikasi Login</h1>
              </div>
              
              <p class="message">
                Halo! Terima kasih telah menggunakan <strong>Konsul Pajak</strong>.
              </p>
              
              <p class="message">
                Gunakan kode verifikasi berikut untuk menyelesaikan proses login:
              </p>
              
              <div class="otp-code">
                <div class="otp-code-value">${code}</div>
              </div>
              
              <div class="warning">
                <strong>⚠️ Penting:</strong><br>
                • Kode ini akan kedaluwarsa dalam <strong>10 menit</strong><br>
                • Jangan bagikan kode ini kepada siapapun<br>
                • Jika Anda tidak meminta kode ini, abaikan email ini
              </div>
              
              <p class="message">
                Masukkan kode di atas pada halaman login untuk melanjutkan.
              </p>
              
              <div class="footer">
                <p>Email ini dikirim secara otomatis oleh sistem Konsul Pajak.</p>
                <p>Jika Anda memiliki pertanyaan, silakan hubungi tim dukungan kami.</p>
              </div>
            </div>
          </body>
        </html>
      `,
    });

    if (error) {
      console.error("Error sending email:", error);
      throw new Error(`Failed to send email: ${error.message}`);
    }

    console.log("Email sent successfully:", data);
  } catch (error) {
    console.error("Error in sendOTPEmail:", error);
    throw error;
  }
}
