import nodemailer from 'nodemailer';

let transporter = null;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: Number(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_EMAIL,
        pass: process.env.SMTP_PASSWORD
      }
    });
  }
  return transporter;
}

/**
 * Generic transactional email. Used by the queue's `email` worker so SMTP I/O
 * never blocks the request path. When SMTP is not configured we fail soft —
 * there is nothing to send and retrying would only add noise.
 */
export async function sendEmail({ to, subject, text = null, html = null }) {
  if (!to || !subject) {
    throw new Error('sendEmail requires both "to" and "subject".');
  }
  if (!process.env.SMTP_EMAIL || !process.env.SMTP_PASSWORD) {
    console.warn('[EmailService] SMTP not configured — skipping email to', to, `(${subject})`);
    return null;
  }
  const info = await getTransporter().sendMail({
    from: `"ServeGo" <${process.env.SMTP_EMAIL}>`,
    to,
    subject,
    text: text || undefined,
    html: html || undefined
  });
  return info;
}

export async function sendPasswordResetEmail(toEmail, resetToken) {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const resetLink = `${frontendUrl}/reset-password?token=${resetToken}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin:0;padding:0;background-color:#f8fafc;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
      <div style="max-width:480px;margin:40px auto;background:#ffffff;border-radius:16px;border:1px solid #e2e8f0;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
        <div style="background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:32px 24px;text-align:center;">
          <h1 style="color:#ffffff;font-size:24px;margin:0;font-weight:800;letter-spacing:-0.5px;">ServeGo</h1>
          <p style="color:rgba(255,255,255,0.85);font-size:13px;margin:8px 0 0;">Password Reset Request</p>
        </div>
        <div style="padding:32px 24px;">
          <p style="color:#334155;font-size:14px;line-height:1.6;margin:0 0 16px;">
            We received a request to reset your password. Click the button below to set a new password.
          </p>
          <p style="color:#334155;font-size:14px;line-height:1.6;margin:0 0 24px;">
            This link will expire in <strong>15 minutes</strong>.
          </p>
          <div style="text-align:center;margin:0 0 24px;">
            <a href="${resetLink}" style="display:inline-block;background:#4f46e5;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;padding:14px 32px;border-radius:10px;letter-spacing:0.3px;">
              Reset My Password
            </a>
          </div>
          <p style="color:#94a3b8;font-size:12px;line-height:1.5;margin:0 0 8px;">
            If you didn't request this, you can safely ignore this email. Your password will remain unchanged.
          </p>
          <p style="color:#94a3b8;font-size:11px;margin:0;">
            Button not working? Copy and paste this link into your browser:<br>
            <a href="${resetLink}" style="color:#6366f1;word-break:break-all;">${resetLink}</a>
          </p>
        </div>
        <div style="padding:16px 24px;background:#f8fafc;border-top:1px solid #e2e8f0;text-align:center;">
          <p style="color:#94a3b8;font-size:11px;margin:0;">
            &copy; ${new Date().getFullYear()} ServeGo. All rights reserved.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  const info = await getTransporter().sendMail({
    from: `"ServeGo" <${process.env.SMTP_EMAIL}>`,
    to: toEmail,
    subject: 'Reset Your ServeGo Password',
    html
  });

  return info;
}

function bookingEmailHtml({ heading, lines, footer }) {
  const body = (lines || [])
    .map((line) => `<p style="color:#334155;font-size:14px;line-height:1.6;margin:0 0 12px;">${line}</p>`)
    .join('');
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin:0;padding:0;background-color:#f8fafc;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
      <div style="max-width:480px;margin:40px auto;background:#ffffff;border-radius:16px;border:1px solid #e2e8f0;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
        <div style="background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:32px 24px;text-align:center;">
          <h1 style="color:#ffffff;font-size:24px;margin:0;font-weight:800;letter-spacing:-0.5px;">ServeGo</h1>
          <p style="color:rgba(255,255,255,0.85);font-size:13px;margin:8px 0 0;">${heading}</p>
        </div>
        <div style="padding:32px 24px;">${body}</div>
        <div style="padding:16px 24px;background:#f8fafc;border-top:1px solid #e2e8f0;text-align:center;">
          <p style="color:#94a3b8;font-size:11px;margin:0;">${footer || `&copy; ${new Date().getFullYear()} ServeGo. All rights reserved.`}</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/** Booking request received — sent after the customer books a service. */
export function bookingRequestEmail({ customerName, bookingId, serviceCategory, amount }) {
  const name = customerName || 'there';
  const lines = [
    `Hi ${name},`,
    `We received your <strong>${serviceCategory || 'service'}</strong> booking request <strong>${bookingId}</strong>.`,
    ...(amount ? [`Amount: <strong>&#8377;${Number(amount).toLocaleString('en-IN')}</strong>`] : []),
    `We're matching you with the best available provider right now. You'll be notified the moment one accepts your request.`
  ];
  return {
    subject: `Booking request received — ${bookingId}`,
    text: lines.map((l) => l.replace(/<[^>]+>/g, '')).join('\n'),
    html: bookingEmailHtml({ heading: 'Booking Request Received', lines })
  };
}

/** Booking completed — receipt-style email to the customer. */
export function bookingCompletedEmail({ customerName, bookingId, serviceCategory, amount }) {
  const name = customerName || 'there';
  const lines = [
    `Hi ${name},`,
    `Your <strong>${serviceCategory || 'service'}</strong> booking <strong>${bookingId}</strong> has been completed. Thank you for using ServeGo!`,
    ...(amount ? [`Amount: <strong>&#8377;${Number(amount).toLocaleString('en-IN')}</strong>`] : []),
    `An invoice for this booking has been generated and is available in your account.`
  ];
  return {
    subject: `Your booking ${bookingId} is completed`,
    text: lines.map((l) => l.replace(/<[^>]+>/g, '')).join('\n'),
    html: bookingEmailHtml({ heading: 'Booking Completed', lines })
  };
}
