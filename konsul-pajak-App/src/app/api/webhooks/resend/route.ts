import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

export async function POST(req: NextRequest) {
  try {
    const payload = await req.text();

    // Webhook signature verification headers
    const sig =
      req.headers.get("svix-signature") || req.headers.get("Svix-Signature");
    const id = req.headers.get("svix-id") || req.headers.get("Svix-Id");
    const timestamp =
      req.headers.get("svix-timestamp") || req.headers.get("Svix-Timestamp");

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.error(
        "RESEND_API_KEY is not configured in environment variables.",
      );
      return NextResponse.json(
        { error: "RESEND_API_KEY is not set." },
        { status: 500 },
      );
    }

    const resend = new Resend(apiKey);
    const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;

    // Cryptographically verify the webhook signature if a secret is provided
    if (webhookSecret) {
      if (!sig || !id || !timestamp) {
        console.error("Missing webhook signature headers for verification.");
        return NextResponse.json(
          { error: "Missing webhook signature headers" },
          { status: 400 },
        );
      }

      try {
        resend.webhooks.verify({
          payload,
          headers: {
            id,
            timestamp,
            signature: sig,
          },
          webhookSecret,
        });
      } catch (err) {
        console.error("Webhook signature verification failed:", err);
        return NextResponse.json(
          { error: "Invalid webhook signature" },
          { status: 400 },
        );
      }
    } else {
      console.warn(
        "RESEND_WEBHOOK_SECRET is not set. Webhook signature verification skipped. " +
          "Please configure RESEND_WEBHOOK_SECRET in production environments for secure routing.",
      );
    }

    // Parse webhook payload
    let body;
    try {
      body = JSON.parse(payload);
    } catch (parseErr) {
      console.error("Failed to parse webhook JSON payload:", parseErr);
      return NextResponse.json(
        { error: "Invalid JSON payload" },
        { status: 400 },
      );
    }

    // Handle the email.received event
    if (body.type === "email.received") {
      const emailId = body.data?.email_id;
      if (!emailId) {
        console.error("Inbound webhook: No email_id found in data.");
        return NextResponse.json(
          { error: "No email ID found in webhook payload" },
          { status: 400 },
        );
      }

      console.log(`Processing inbound email ID: ${emailId}`);

      // Fetch the complete received email via Resend's Inbound Get API
      const { data: originalEmail, error: fetchError } =
        await resend.emails.receiving.get(emailId);

      if (fetchError || !originalEmail) {
        console.error(
          `Error fetching received email (ID: ${emailId}) from Resend:`,
          fetchError,
        );
        return NextResponse.json(
          {
            error: `Failed to fetch email: ${fetchError?.message || "unknown"}`,
          },
          { status: 500 },
        );
      }

      // Check where to forward the email
      const forwardTo = process.env.FORWARD_TO_EMAIL;
      if (!forwardTo) {
        console.error(
          "FORWARD_TO_EMAIL environment variable is not configured.",
        );
        return NextResponse.json(
          { error: "Forward destination email is not configured." },
          { status: 500 },
        );
      }

      // Format sender details
      const subject = `[Inbound] ${originalEmail.subject || "(No Subject)"}`;
      const fromName =
        originalEmail.from.split("<")[0]?.trim() || originalEmail.from;
      const fromEmail = originalEmail.from.includes("<")
        ? originalEmail.from.match(/<([^>]+)>/)?.[1]
        : originalEmail.from;

      const receivedDateStr = originalEmail.created_at
        ? new Date(originalEmail.created_at).toLocaleString("id-ID", {
            timeZone: "Asia/Jakarta",
          })
        : new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" });

      // Compose premium forwarded email layout
      const htmlBody = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                line-height: 1.6;
                color: #1f2937;
                background-color: #f3f4f6;
                margin: 0;
                padding: 10px;
              }
              .wrapper {
                max-width: 650px;
                margin: 20px auto;
                background-color: #ffffff;
                border-radius: 12px;
                overflow: hidden;
                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
                border: 1px solid #e5e7eb;
              }
              .header {
                background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%);
                color: #ffffff;
                padding: 24px;
              }
              .header-title {
                margin: 0;
                font-size: 20px;
                font-weight: 700;
                letter-spacing: -0.025em;
              }
              .header-subtitle {
                margin: 4px 0 0 0;
                font-size: 13px;
                color: #bfdbfe;
              }
              .meta-box {
                background-color: #f9fafb;
                padding: 18px 24px;
                border-bottom: 1px solid #f3f4f6;
                font-size: 14px;
              }
              .meta-item {
                display: flex;
                margin-bottom: 6px;
              }
              .meta-item:last-child {
                margin-bottom: 0;
              }
              .meta-label {
                width: 90px;
                font-weight: 600;
                color: #4b5563;
                flex-shrink: 0;
              }
              .meta-value {
                color: #111827;
                word-break: break-all;
              }
              .content-box {
                padding: 28px 24px;
                min-height: 150px;
                font-size: 15px;
              }
              .attachment-box {
                margin: 15px 24px 25px 24px;
                padding: 16px;
                background-color: #f0fdf4;
                border: 1px dashed #bbf7d0;
                border-radius: 8px;
                font-size: 13px;
              }
              .attachment-title {
                font-weight: 600;
                color: #166534;
                margin-bottom: 6px;
              }
              .action-area {
                text-align: center;
                padding: 10px 24px 28px 24px;
              }
              .btn-reply {
                display: inline-block;
                background-color: #2563eb;
                color: #ffffff !important;
                text-decoration: none;
                padding: 12px 24px;
                border-radius: 8px;
                font-size: 14px;
                font-weight: 600;
                box-shadow: 0 2px 4px rgba(37, 99, 235, 0.2);
                transition: background-color 0.2s;
              }
              .btn-reply:hover {
                background-color: #1d4ed8;
              }
              .footer {
                background-color: #f9fafb;
                padding: 16px 24px;
                border-top: 1px solid #f3f4f6;
                text-align: center;
                font-size: 12px;
                color: #9ca3af;
                line-height: 1.5;
              }
            </style>
          </head>
          <body>
            <div class="wrapper">
              <div class="header">
                <h1 class="header-title">Pesan Masuk Baru</h1>
                <p class="header-subtitle">Tanya Pajak AI - Inbound Mail Agent</p>
              </div>
              
              <div class="meta-box">
                <div class="meta-item">
                  <span class="meta-label">Pengirim:</span>
                  <span class="meta-value"><strong>${fromName}</strong> &lt;${fromEmail}&gt;</span>
                </div>
                <div style="margin-top: 6px;">
                  <div class="meta-item">
                    <span class="meta-label">Penerima:</span>
                    <span class="meta-value">${originalEmail.to.join(", ")}</span>
                  </div>
                  <div class="meta-item" style="margin-top: 6px;">
                    <span class="meta-label">Tanggal:</span>
                    <span class="meta-value">${receivedDateStr} WIB</span>
                  </div>
                  <div class="meta-item" style="margin-top: 6px;">
                    <span class="meta-label">Subjek:</span>
                    <span class="meta-value"><strong>${originalEmail.subject || "(No Subject)"}</strong></span>
                  </div>
                </div>
              </div>
              
              <div class="content-box">
                ${originalEmail.html || `<div style="white-space: pre-wrap; font-family: inherit;">${originalEmail.text || ""}</div>`}
              </div>
              
              ${
                originalEmail.attachments &&
                originalEmail.attachments.length > 0
                  ? `
                <div class="attachment-box">
                  <div class="attachment-title">📎 Lampiran Terdeteksi (${originalEmail.attachments.length})</div>
                  <ul style="margin: 0; padding-left: 20px; color: #374151;">
                    ${originalEmail.attachments
                      .map(
                        (att) => `
                      <li>
                        <strong>${att.filename}</strong> (${(att.size / 1024).toFixed(1)} KB) 
                        <span style="color: #6b7280; font-size: 11px;">- Tipe: ${att.content_type}</span>
                      </li>
                    `,
                      )
                      .join("")}
                  </ul>
                  <p style="margin: 8px 0 0 0; font-size: 11px; color: #166534;">
                    * Catatan: Untuk mengunduh lampiran, silakan periksa Resend Dashboard (Receiving) menggunakan ID Email: <code>${originalEmail.id}</code>.
                  </p>
                </div>
              `
                  : ""
              }
              
              <div class="action-area">
                <a href="mailto:${fromEmail}" class="btn-reply">Balas Langsung via Email</a>
              </div>
              
              <div class="footer">
                Email ini diteruskan secara otomatis dari endpoint Next.js Anda.<br>
                Anda bisa membalas langsung ke pengirim dengan menekan tombol <strong>Reply/Balas</strong> pada aplikasi email Anda.
              </div>
            </div>
          </body>
        </html>
      `;

      // Forward email to the user-specified personal address
      const { data: sendData, error: sendError } = await resend.emails.send({
        from: "Tanya Pajak Inbound <noreply@tanyapajakai.com>", // Must be verified in Resend domain settings
        to: [forwardTo],
        replyTo: originalEmail.from, // Most important: maps the reply action to original sender!
        subject: subject,
        html: htmlBody,
        headers: {
          "In-Reply-To": originalEmail.message_id,
          References: originalEmail.message_id,
        },
      });

      if (sendError) {
        console.error("Error forwarding inbound email via Resend:", sendError);
        return NextResponse.json(
          { error: `Failed to forward email: ${sendError.message}` },
          { status: 500 },
        );
      }

      console.log(
        `Inbound email forwarded successfully. Message ID: ${sendData?.id}`,
      );
    } else {
      console.log(`Received unhandled webhook event: ${body.type}`);
    }

    // Always acknowledge receipt of webhook with a 200 OK
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Inbound webhook critical error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
