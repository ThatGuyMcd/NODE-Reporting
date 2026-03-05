import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "../create-context";
import { generateQuotePdf } from "../../utils/pdf-generator";
import type { QuotePdfData } from "../../utils/pdf-generator";

const quoteItemSchema = z.object({
  id: z.string(),
  description: z.string(),
  quantity: z.number(),
  unitPrice: z.number(),
  total: z.number(),
});

const smtpSettingsSchema = z.object({
  host: z.string(),
  port: z.number(),
  secure: z.boolean(),
  username: z.string(),
  password: z.string(),
  fromEmail: z.string(),
  fromName: z.string(),
});

const resendSettingsSchema = z.object({
  apiKey: z.string(),
  fromEmail: z.string(),
  fromName: z.string(),
});

const emailSettingsSchema = z.object({
  provider: z.enum(['smtp', 'resend']),
  smtp: smtpSettingsSchema,
  resend: resendSettingsSchema,
  isConfigured: z.boolean(),
});

const sendQuoteSchema = z.object({
  quoteNumber: z.string(),
  clientName: z.string(),
  clientEmail: z.string(),
  items: z.array(quoteItemSchema),
  subtotal: z.number(),
  vatAmount: z.number(),
  total: z.number(),
  vatRate: z.number(),
  issueDate: z.string(),
  validUntil: z.string(),
  notes: z.string().optional(),
  businessName: z.string(),
  businessEmail: z.string(),
  businessAddress: z.string(),
  businessPhone: z.string().optional(),
  vatNumber: z.string().optional(),
  emailSettings: emailSettingsSchema,
});

const generateQuoteHtml = (data: z.infer<typeof sendQuoteSchema>) => {
  const itemsHtml = data.items
    .map(
      (item) => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${item.description}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.quantity}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">£${item.unitPrice.toFixed(2)}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">£${item.total.toFixed(2)}</td>
      </tr>
    `
    )
    .join("");

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f3f4f6;">
      <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="background-color: white; border-radius: 12px; padding: 40px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          
          <div style="text-align: center; margin-bottom: 32px;">
            <h1 style="color: #3b82f6; font-size: 28px; margin: 0;">QUOTE</h1>
            <p style="color: #6b7280; margin: 8px 0 0 0;">#${data.quoteNumber}</p>
          </div>

          <div style="display: flex; justify-content: space-between; margin-bottom: 32px;">
            <div>
              <p style="color: #6b7280; font-size: 12px; margin: 0 0 4px 0; text-transform: uppercase;">From</p>
              <p style="color: #111827; font-weight: 600; margin: 0;">${data.businessName}</p>
              <p style="color: #6b7280; margin: 4px 0 0 0; font-size: 14px;">${data.businessAddress.replace(/\n/g, "<br>")}</p>
              ${data.businessPhone ? `<p style="color: #6b7280; margin: 4px 0 0 0; font-size: 14px;">${data.businessPhone}</p>` : ""}
              <p style="color: #6b7280; margin: 4px 0 0 0; font-size: 14px;">${data.businessEmail}</p>
              ${data.vatNumber ? `<p style="color: #6b7280; margin: 4px 0 0 0; font-size: 14px;">VAT: ${data.vatNumber}</p>` : ""}
            </div>
            <div style="text-align: right;">
              <p style="color: #6b7280; font-size: 12px; margin: 0 0 4px 0; text-transform: uppercase;">Quote For</p>
              <p style="color: #111827; font-weight: 600; margin: 0;">${data.clientName}</p>
              <p style="color: #6b7280; margin: 4px 0 0 0; font-size: 14px;">${data.clientEmail}</p>
            </div>
          </div>

          <div style="background-color: #f9fafb; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
            <div style="display: flex; justify-content: space-between;">
              <div>
                <p style="color: #6b7280; font-size: 12px; margin: 0;">Issue Date</p>
                <p style="color: #111827; font-weight: 500; margin: 4px 0 0 0;">${data.issueDate}</p>
              </div>
              <div style="text-align: right;">
                <p style="color: #6b7280; font-size: 12px; margin: 0;">Valid Until</p>
                <p style="color: #111827; font-weight: 500; margin: 4px 0 0 0;">${data.validUntil}</p>
              </div>
            </div>
          </div>

          <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
            <thead>
              <tr style="background-color: #f9fafb;">
                <th style="padding: 12px; text-align: left; font-size: 12px; color: #6b7280; text-transform: uppercase;">Description</th>
                <th style="padding: 12px; text-align: center; font-size: 12px; color: #6b7280; text-transform: uppercase;">Qty</th>
                <th style="padding: 12px; text-align: right; font-size: 12px; color: #6b7280; text-transform: uppercase;">Price</th>
                <th style="padding: 12px; text-align: right; font-size: 12px; color: #6b7280; text-transform: uppercase;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <div style="border-top: 2px solid #e5e7eb; padding-top: 16px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span style="color: #6b7280;">Subtotal</span>
              <span style="color: #111827;">£${data.subtotal.toFixed(2)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span style="color: #6b7280;">VAT (${data.vatRate === 0 ? 'Mixed' : `${data.vatRate}%`})</span>
              <span style="color: #111827;">£${data.vatAmount.toFixed(2)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding-top: 12px; border-top: 1px solid #e5e7eb;">
              <span style="color: #111827; font-weight: 600; font-size: 18px;">Total</span>
              <span style="color: #3b82f6; font-weight: 700; font-size: 24px;">£${data.total.toFixed(2)}</span>
            </div>
          </div>

          ${
            data.notes
              ? `
          <div style="margin-top: 24px; padding: 16px; background-color: #dbeafe; border-radius: 8px;">
            <p style="color: #1e40af; font-size: 12px; margin: 0 0 4px 0; text-transform: uppercase;">Notes</p>
            <p style="color: #1e3a8a; margin: 0; font-size: 14px;">${data.notes}</p>
          </div>
          `
              : ""
          }

          <div style="margin-top: 24px; padding: 16px; background-color: #fef3c7; border-radius: 8px; text-align: center;">
            <p style="color: #92400e; font-size: 14px; margin: 0;">
              This quote is valid until <strong>${data.validUntil}</strong>
            </p>
          </div>

          <div style="margin-top: 32px; text-align: center; color: #9ca3af; font-size: 12px;">
            <p style="margin: 0;">Thank you for considering our services!</p>
          </div>

        </div>
      </div>
    </body>
    </html>
  `;
};

const getResendApiKey = (emailSettings: z.infer<typeof emailSettingsSchema>): string => {
  const serverApiKey = process.env.RESEND_API_KEY;
  const userApiKey = emailSettings.resend?.apiKey;
  const apiKey = serverApiKey || userApiKey;
  if (!apiKey) {
    throw new Error("No Resend API key available. Please configure your email settings in Settings > Email.");
  }
  return apiKey;
};

const sendViaResend = async (input: z.infer<typeof sendQuoteSchema>, html: string, pdfAttachment?: { filename: string; content: Buffer }) => {
  const { emailSettings, businessName, clientEmail, quoteNumber, businessEmail } = input;
  const apiKey = getResendApiKey(emailSettings);
  const fromName = emailSettings.resend.fromName || businessName;
  const fromEmail = emailSettings.resend.fromEmail || businessEmail || 'onboarding@resend.dev';

  console.log(`Sending quote via Resend to ${clientEmail}`);

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: `${fromName} <${fromEmail}>`,
      to: [clientEmail],
      subject: `Quote #${quoteNumber} from ${businessName}`,
      html,
      ...(pdfAttachment ? {
        attachments: [{
          filename: pdfAttachment.filename,
          content: Buffer.from(pdfAttachment.content).toString('base64'),
        }],
      } : {}),
    }),
  });

  const responseText = await response.text();
  console.log(`[sendViaResend] Response: ${response.status} ${responseText}`);

  if (!response.ok) {
    let errorMessage = `Resend API error (HTTP ${response.status})`;
    try {
      const errorData = JSON.parse(responseText);
      errorMessage = errorData.message || errorData.error || errorMessage;
    } catch { /* ignore */ }
    throw new Error(errorMessage);
  }

  let data: { id?: string } = {};
  try { data = JSON.parse(responseText); } catch { /* ignore */ }
  return { emailId: data?.id };
};

const sendViaSMTP = async (input: z.infer<typeof sendQuoteSchema>, html: string, pdfAttachment?: { filename: string; content: Buffer }) => {
  const { emailSettings, businessName, clientEmail, quoteNumber } = input;
  const smtp = emailSettings.smtp;

  if (!smtp.host || !smtp.username || !smtp.password) {
    throw new Error("SMTP settings not configured. Please check your SMTP host, username, and password.");
  }

  console.log(`[sendViaSMTP] Sending quote via SMTP to ${clientEmail}, host: ${smtp.host}, port: ${smtp.port}, secure: ${smtp.secure}`);

  let mailer: any;
  try {
    const nodemailerModule = await import("nodemailer");
    mailer = nodemailerModule.default || nodemailerModule;
  } catch (importErr) {
    console.error("[sendViaSMTP] Failed to load nodemailer:", importErr);
    console.log("[sendViaSMTP] Falling back to Resend API for email delivery");
    return sendViaSMTPFallback(input, html, pdfAttachment);
  }

  try {
    const transporter = mailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.secure,
      auth: {
        user: smtp.username,
        pass: smtp.password,
      },
      tls: {
        rejectUnauthorized: false,
      },
      connectionTimeout: 15000,
      greetingTimeout: 15000,
      socketTimeout: 30000,
    });

    const fromName = smtp.fromName || businessName;
    const fromEmail = smtp.fromEmail;

    const mailOptions: Record<string, unknown> = {
      from: `"${fromName}" <${fromEmail}>`,
      to: clientEmail,
      subject: `Quote #${quoteNumber} from ${businessName}`,
      html,
    };

    if (pdfAttachment) {
      mailOptions.attachments = [{
        filename: pdfAttachment.filename,
        content: pdfAttachment.content,
        contentType: 'application/pdf',
      }];
    }

    const info = await transporter.sendMail(mailOptions);

    console.log("SMTP message sent:", info.messageId);
    return { emailId: info.messageId };
  } catch (smtpErr) {
    console.error("[sendViaSMTP] SMTP send failed:", smtpErr);
    console.log("[sendViaSMTP] Falling back to Resend API for email delivery");
    return sendViaSMTPFallback(input, html, pdfAttachment);
  }
};

const sendViaSMTPFallback = async (input: z.infer<typeof sendQuoteSchema>, html: string, pdfAttachment?: { filename: string; content: Buffer }) => {
  const { businessName, clientEmail, quoteNumber, businessEmail, emailSettings } = input;
  const serverApiKey = process.env.RESEND_API_KEY;
  const userApiKey = emailSettings.resend?.apiKey;
  const apiKey = serverApiKey || userApiKey;

  if (!apiKey) {
    throw new Error("SMTP is unavailable in this environment and no Resend API key is configured as fallback. Please configure Resend in Settings > Email.");
  }

  console.log(`[sendViaSMTPFallback] Using Resend API as fallback for quote ${quoteNumber}`);
  const fromName = emailSettings.smtp?.fromName || businessName;
  const fromEmail = emailSettings.resend?.fromEmail || businessEmail || 'onboarding@resend.dev';

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: `${fromName} <${fromEmail}>`,
      to: [clientEmail],
      subject: `Quote #${quoteNumber} from ${businessName}`,
      html,
      ...(pdfAttachment ? {
        attachments: [{
          filename: pdfAttachment.filename,
          content: Buffer.from(pdfAttachment.content).toString('base64'),
        }],
      } : {}),
    }),
  });

  const responseText = await response.text();
  if (!response.ok) {
    let errorMessage = `Resend fallback API error (HTTP ${response.status})`;
    try {
      const errorData = JSON.parse(responseText);
      errorMessage = errorData.message || errorData.error || errorMessage;
    } catch { /* ignore */ }
    console.error("[sendViaSMTPFallback] Resend error:", errorMessage);
    throw new Error(`Failed to send email via fallback: ${errorMessage}`);
  }

  let data: { id?: string } = {};
  try { data = JSON.parse(responseText); } catch { /* ignore */ }
  console.log(`[sendViaSMTPFallback] Email sent via Resend fallback. ID: ${data?.id}`);
  return { emailId: data?.id };
};

export const quoteRouter = createTRPCRouter({
  sendQuote: publicProcedure
    .input(sendQuoteSchema)
    .mutation(async ({ input }) => {
      const { emailSettings, clientEmail, quoteNumber } = input;

      if (!emailSettings.isConfigured) {
        console.error("Email settings not configured");
        throw new Error("Email service not configured. Please configure email settings.");
      }

      if (!clientEmail) {
        throw new Error("Client email is required to send quote");
      }

      const html = generateQuoteHtml(input);

      console.log(`[sendQuote] Generating PDF for quote ${quoteNumber}`);
      const pdfData: QuotePdfData = {
        quoteNumber: input.quoteNumber,
        clientName: input.clientName,
        clientEmail: input.clientEmail,
        items: input.items,
        subtotal: input.subtotal,
        vatAmount: input.vatAmount,
        total: input.total,
        vatRate: input.vatRate,
        issueDate: input.issueDate,
        validUntil: input.validUntil,
        notes: input.notes,
        businessName: input.businessName,
        businessEmail: input.businessEmail,
        businessAddress: input.businessAddress,
        businessPhone: input.businessPhone,
        vatNumber: input.vatNumber,
      };
      const pdfBytes = await generateQuotePdf(pdfData);
      const pdfAttachment = {
        filename: `Quote-${quoteNumber}.pdf`,
        content: Buffer.from(pdfBytes),
      };
      console.log(`[sendQuote] PDF generated, size: ${pdfBytes.length} bytes`);

      console.log(`Sending quote ${quoteNumber} to ${clientEmail} via ${emailSettings.provider}`);

      let result;
      if (emailSettings.provider === 'smtp') {
        result = await sendViaSMTP(input, html, pdfAttachment);
      } else {
        result = await sendViaResend(input, html, pdfAttachment);
      }

      console.log(`Quote email sent successfully. ID: ${result.emailId}`);

      return {
        success: true,
        emailId: result.emailId,
        message: `Quote sent to ${clientEmail}`,
      };
    }),
});
