import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "../create-context";
import { generateTransactionPdf } from "../../utils/pdf-generator";
import type { TransactionPdfData } from "../../utils/pdf-generator";

const lineItemSchema = z.object({
  product: z.string(),
  department: z.string().optional(),
  quantity: z.number(),
  price: z.number(),
  subtotal: z.number(),
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

const sendTransactionSchema = z.object({
  transactionId: z.string(),
  recipientEmail: z.string(),
  description: z.string(),
  type: z.enum(['income', 'expense']),
  amount: z.number(),
  vatAmount: z.number(),
  vatRate: z.number(),
  date: z.string(),
  category: z.string(),
  clientName: z.string().optional(),
  addedBy: z.string().optional(),
  paidBy: z.string().optional(),
  tenderUsed: z.string().optional(),
  lineItems: z.array(lineItemSchema).optional(),
  businessName: z.string(),
  businessEmail: z.string(),
  businessAddress: z.string(),
  businessPhone: z.string().optional(),
  vatNumber: z.string().optional(),
  emailSettings: emailSettingsSchema,
});

const generateTransactionHtml = (data: z.infer<typeof sendTransactionSchema>) => {
  const isIncome = data.type === 'income';
  const accentColor = isIncome ? '#10b981' : '#ef4444';

  const lineItemsHtml = data.lineItems && data.lineItems.length > 0
    ? `
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
        <thead>
          <tr style="background-color: #f9fafb;">
            <th style="padding: 12px; text-align: left; font-size: 12px; color: #6b7280; text-transform: uppercase;">Product</th>
            <th style="padding: 12px; text-align: center; font-size: 12px; color: #6b7280; text-transform: uppercase;">Qty</th>
            <th style="padding: 12px; text-align: right; font-size: 12px; color: #6b7280; text-transform: uppercase;">Price</th>
            <th style="padding: 12px; text-align: right; font-size: 12px; color: #6b7280; text-transform: uppercase;">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          ${data.lineItems.map(item => `
            <tr>
              <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${item.product}${item.department ? `<br><span style="font-size: 11px; color: #9ca3af;">${item.department}</span>` : ''}</td>
              <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.quantity}</td>
              <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">£${item.price.toFixed(2)}</td>
              <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">£${item.subtotal.toFixed(2)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `
    : '';

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
          
          <div style="text-align: center; margin-bottom: 24px;">
            <h1 style="color: ${accentColor}; font-size: 28px; margin: 0;">TRANSACTION</h1>
            <p style="color: #6b7280; margin: 8px 0 0 0;">${data.transactionId}</p>
          </div>

          <div style="background-color: ${isIncome ? '#ecfdf5' : '#fef2f2'}; border-radius: 8px; padding: 16px; margin-bottom: 24px; text-align: center;">
            <p style="color: ${accentColor}; font-weight: 600; font-size: 14px; margin: 0 0 4px 0;">${isIncome ? 'Income' : 'Expense'}</p>
            <p style="color: ${accentColor}; font-weight: 700; font-size: 28px; margin: 0;">${isIncome ? '+' : '-'}£${data.amount.toFixed(2)}</p>
            <p style="color: #6b7280; font-size: 13px; margin: 8px 0 0 0;">${data.date} • ${data.category}</p>
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
          </div>

          ${lineItemsHtml}

          <div style="border-top: 2px solid #e5e7eb; padding-top: 16px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span style="color: #6b7280;">Subtotal</span>
              <span style="color: #111827;">£${(data.amount - data.vatAmount).toFixed(2)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span style="color: #6b7280;">VAT (${data.vatRate}%)</span>
              <span style="color: #111827;">£${data.vatAmount.toFixed(2)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding-top: 12px; border-top: 1px solid #e5e7eb;">
              <span style="color: #111827; font-weight: 600; font-size: 18px;">Total</span>
              <span style="color: ${accentColor}; font-weight: 700; font-size: 24px;">£${data.amount.toFixed(2)}</span>
            </div>
          </div>

          ${data.addedBy || data.paidBy || data.tenderUsed ? `
          <div style="margin-top: 24px; padding: 16px; background-color: #f9fafb; border-radius: 8px;">
            ${data.addedBy ? `<p style="color: #6b7280; font-size: 13px; margin: 0 0 4px 0;">Added By: <strong style="color: #111827;">${data.addedBy}</strong></p>` : ''}
            ${data.paidBy ? `<p style="color: #6b7280; font-size: 13px; margin: 0 0 4px 0;">Paid By: <strong style="color: #111827;">${data.paidBy}</strong></p>` : ''}
            ${data.tenderUsed ? `<p style="color: #6b7280; font-size: 13px; margin: 0;">Payment: <strong style="color: #111827;">${data.tenderUsed}</strong></p>` : ''}
          </div>
          ` : ''}

          <div style="margin-top: 32px; text-align: center; color: #9ca3af; font-size: 12px;">
            <p style="margin: 0;">Transaction record from ${data.businessName}</p>
          </div>

        </div>
      </div>
    </body>
    </html>
  `;
};

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const getResendApiKey = (emailSettings: z.infer<typeof emailSettingsSchema>): string => {
  const serverApiKey = process.env.RESEND_API_KEY;
  const userApiKey = emailSettings.resend?.apiKey;
  const apiKey = serverApiKey || userApiKey;
  if (!apiKey) {
    throw new Error("No Resend API key available. Please configure your email settings in Settings > Email.");
  }
  return apiKey;
};

const resolveFrom = (emailSettings: z.infer<typeof emailSettingsSchema>, businessName: string, businessEmail: string) => {
  const provider = emailSettings.provider;
  const fromName = provider === 'smtp'
    ? (emailSettings.smtp?.fromName || emailSettings.resend?.fromName || businessName)
    : (emailSettings.resend?.fromName || businessName);
  const fromEmail = provider === 'smtp'
    ? (emailSettings.smtp?.fromEmail || emailSettings.resend?.fromEmail || businessEmail || 'onboarding@resend.dev')
    : (emailSettings.resend?.fromEmail || businessEmail || 'onboarding@resend.dev');
  return { fromName, fromEmail };
};

const sendViaSmtp = async (
  emailSettings: z.infer<typeof emailSettingsSchema>,
  businessName: string,
  businessEmail: string,
  recipientEmail: string,
  subject: string,
  html: string,
  pdfAttachment?: { filename: string; content: Buffer },
): Promise<{ emailId: string | undefined }> => {
  const smtp = emailSettings.smtp;
  if (!smtp.host || !smtp.username || !smtp.password) {
    throw new Error("SMTP settings incomplete. Please check host, username, and password.");
  }

  let mailer: any;
  try {
    const nodemailerModule = await import("nodemailer");
    mailer = nodemailerModule.default || nodemailerModule;
  } catch {
    throw new Error("SMTP is unavailable in this environment.");
  }

  const transporter = mailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,
    auth: { user: smtp.username, pass: smtp.password },
    tls: { rejectUnauthorized: false },
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 30000,
  });

  const { fromName, fromEmail } = resolveFrom(emailSettings, businessName, businessEmail);

  const mailOptions: Record<string, unknown> = {
    from: `"${fromName}" <${fromEmail}>`,
    to: recipientEmail,
    subject,
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
  return { emailId: info.messageId };
};

const sendViaResend = async (
  emailSettings: z.infer<typeof emailSettingsSchema>,
  businessName: string,
  businessEmail: string,
  recipientEmail: string,
  subject: string,
  html: string,
  pdfAttachment?: { filename: string; content: Buffer },
): Promise<{ emailId: string | undefined }> => {
  const apiKey = getResendApiKey(emailSettings);
  const { fromName, fromEmail } = resolveFrom(emailSettings, businessName, businessEmail);

  console.log(`[sendViaResend] Sending transaction to ${recipientEmail} from "${fromName}" <${fromEmail}>`);

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: `${fromName} <${fromEmail}>`,
      to: [recipientEmail],
      subject,
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

const sendEmailWithRetry = async (
  emailSettings: z.infer<typeof emailSettingsSchema>,
  businessName: string,
  businessEmail: string,
  recipientEmail: string,
  subject: string,
  html: string,
  label: string,
  pdfAttachment?: { filename: string; content: Buffer },
): Promise<{ emailId: string | undefined }> => {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`[sendEmail] Attempt ${attempt}/${MAX_RETRIES} for ${label} to ${recipientEmail} via ${emailSettings.provider}`);

      const result = emailSettings.provider === 'smtp'
        ? await sendViaSmtp(emailSettings, businessName, businessEmail, recipientEmail, subject, html, pdfAttachment)
        : await sendViaResend(emailSettings, businessName, businessEmail, recipientEmail, subject, html, pdfAttachment);

      console.log(`[sendEmail] Success on attempt ${attempt}. ID: ${result.emailId}`);
      return result;
    } catch (error: unknown) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.error(`[sendEmail] Attempt ${attempt} failed:`, lastError.message);
      if (attempt < MAX_RETRIES) {
        await sleep(RETRY_DELAY_MS * attempt);
      }
    }
  }

  if (emailSettings.provider === 'smtp') {
    const serverResendKey = process.env.RESEND_API_KEY;
    const userResendKey = emailSettings.resend?.apiKey;
    const fallbackKey = serverResendKey || userResendKey;
    if (fallbackKey) {
      console.log(`[sendEmail] SMTP failed after ${MAX_RETRIES} attempts, falling back to Resend API`);
      try {
        const fallbackSettings = {
          ...emailSettings,
          provider: 'resend' as const,
          resend: { ...emailSettings.resend, apiKey: fallbackKey },
        };
        const result = await sendViaResend(fallbackSettings, businessName, businessEmail, recipientEmail, subject, html, pdfAttachment);
        console.log(`[sendEmail] Resend fallback succeeded. ID: ${result.emailId}`);
        return result;
      } catch (resendError: unknown) {
        console.error(`[sendEmail] Resend fallback also failed:`, resendError instanceof Error ? resendError.message : resendError);
      }
    }
  }

  throw lastError ?? new Error('All retry attempts failed');
};

export const transactionRouter = createTRPCRouter({
  sendTransaction: publicProcedure
    .input(sendTransactionSchema)
    .mutation(async ({ input }) => {
      const { emailSettings, recipientEmail, transactionId } = input;

      console.log(`[sendTransaction] Starting for transaction ${transactionId}, provider: ${emailSettings.provider}`);

      if (!emailSettings.isConfigured) {
        throw new Error("Email service not configured. Please configure email settings in Settings > Email.");
      }
      if (!recipientEmail) {
        throw new Error("Recipient email is required to send transaction.");
      }

      try {
        const html = generateTransactionHtml(input);
        const isIncome = input.type === 'income';
        const subject = `Transaction ${isIncome ? 'Receipt' : 'Record'}: ${input.description} - £${input.amount.toFixed(2)} from ${input.businessName}`;

        console.log(`[sendTransaction] Generating PDF for transaction ${transactionId}`);
        const pdfData: TransactionPdfData = {
          transactionId: input.transactionId,
          description: input.description,
          type: input.type,
          amount: input.amount,
          vatAmount: input.vatAmount,
          vatRate: input.vatRate,
          date: input.date,
          category: input.category,
          clientName: input.clientName,
          addedBy: input.addedBy,
          paidBy: input.paidBy,
          tenderUsed: input.tenderUsed,
          lineItems: input.lineItems?.map(li => ({
            product: li.product,
            department: li.department,
            quantity: li.quantity,
            price: li.price,
            subtotal: li.subtotal,
          })),
          businessName: input.businessName,
          businessEmail: input.businessEmail,
          businessAddress: input.businessAddress,
          businessPhone: input.businessPhone,
          vatNumber: input.vatNumber,
        };
        const pdfBytes = await generateTransactionPdf(pdfData);
        const pdfAttachment = {
          filename: `Transaction-${transactionId}.pdf`,
          content: Buffer.from(pdfBytes),
        };
        console.log(`[sendTransaction] PDF generated, size: ${pdfBytes.length} bytes`);

        const result = await sendEmailWithRetry(
          emailSettings, input.businessName, input.businessEmail,
          recipientEmail, subject, html, `transaction ${transactionId}`, pdfAttachment,
        );

        console.log(`[sendTransaction] Success. ID: ${result.emailId}`);
        return { success: true, emailId: result.emailId, message: `Transaction sent to ${recipientEmail}` };
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : 'Unknown error';
        console.error(`[sendTransaction] Failed:`, msg);
        throw new Error(`Failed to send transaction email: ${msg}`);
      }
    }),
});
