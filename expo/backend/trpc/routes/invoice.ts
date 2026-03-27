import { z } from "zod";
import nodemailer from "nodemailer";

import { createTRPCRouter, publicProcedure } from "../create-context";
import { generateInvoicePdf, generateReceiptPdf } from "../../utils/pdf-generator";
import type { InvoicePdfData, ReceiptPdfData } from "../../utils/pdf-generator";

const invoiceItemSchema = z.object({
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

const sendInvoiceSchema = z.object({
  invoiceNumber: z.string(),
  clientName: z.string(),
  clientEmail: z.string(),
  items: z.array(invoiceItemSchema),
  subtotal: z.number(),
  vatAmount: z.number(),
  total: z.number(),
  vatRate: z.number(),
  issueDate: z.string(),
  dueDate: z.string(),
  notes: z.string().optional(),
  businessName: z.string(),
  businessEmail: z.string(),
  businessAddress: z.string(),
  businessPhone: z.string().optional(),
  vatNumber: z.string().optional(),
  emailSettings: emailSettingsSchema,
});

const generateInvoiceHtml = (data: z.infer<typeof sendInvoiceSchema>) => {
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
            <h1 style="color: #10b981; font-size: 28px; margin: 0;">INVOICE</h1>
            <p style="color: #6b7280; margin: 8px 0 0 0;">#${data.invoiceNumber}</p>
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
              <p style="color: #6b7280; font-size: 12px; margin: 0 0 4px 0; text-transform: uppercase;">Bill To</p>
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
                <p style="color: #6b7280; font-size: 12px; margin: 0;">Due Date</p>
                <p style="color: #111827; font-weight: 500; margin: 4px 0 0 0;">${data.dueDate}</p>
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
              <span style="color: #111827; font-weight: 600; font-size: 18px;">Total Due</span>
              <span style="color: #10b981; font-weight: 700; font-size: 24px;">£${data.total.toFixed(2)}</span>
            </div>
          </div>

          ${
            data.notes
              ? `
          <div style="margin-top: 24px; padding: 16px; background-color: #fef3c7; border-radius: 8px;">
            <p style="color: #92400e; font-size: 12px; margin: 0 0 4px 0; text-transform: uppercase;">Notes</p>
            <p style="color: #78350f; margin: 0; font-size: 14px;">${data.notes}</p>
          </div>
          `
              : ""
          }

          <div style="margin-top: 32px; text-align: center; color: #9ca3af; font-size: 12px;">
            <p style="margin: 0;">Thank you for your business!</p>
          </div>

        </div>
      </div>
    </body>
    </html>
  `;
};

const sendReceiptSchema = z.object({
  invoiceNumber: z.string(),
  clientName: z.string(),
  clientEmail: z.string(),
  items: z.array(invoiceItemSchema),
  subtotal: z.number(),
  vatAmount: z.number(),
  total: z.number(),
  vatRate: z.number(),
  issueDate: z.string(),
  dueDate: z.string(),
  paidDate: z.string(),
  paymentMethod: z.string().optional(),
  notes: z.string().optional(),
  businessName: z.string(),
  businessEmail: z.string(),
  businessAddress: z.string(),
  businessPhone: z.string().optional(),
  vatNumber: z.string().optional(),
  emailSettings: emailSettingsSchema,
});

const generateReceiptHtml = (data: z.infer<typeof sendReceiptSchema>) => {
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
          
          <div style="text-align: center; margin-bottom: 24px;">
            <div style="display: inline-block; background-color: #d1fae5; border-radius: 50%; width: 56px; height: 56px; line-height: 56px; text-align: center; margin-bottom: 12px;">
              <span style="font-size: 28px;">✓</span>
            </div>
            <h1 style="color: #059669; font-size: 28px; margin: 0;">PAYMENT RECEIPT</h1>
            <p style="color: #6b7280; margin: 8px 0 0 0;">Invoice #${data.invoiceNumber}</p>
          </div>

          <div style="background-color: #ecfdf5; border-radius: 8px; padding: 16px; margin-bottom: 24px; text-align: center;">
            <p style="color: #059669; font-weight: 600; font-size: 14px; margin: 0 0 4px 0;">Payment Received</p>
            <p style="color: #047857; font-weight: 700; font-size: 28px; margin: 0;">£${data.total.toFixed(2)}</p>
            <p style="color: #6b7280; font-size: 13px; margin: 8px 0 0 0;">Paid on ${data.paidDate}${data.paymentMethod ? ` via ${data.paymentMethod}` : ''}</p>
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
              <p style="color: #6b7280; font-size: 12px; margin: 0 0 4px 0; text-transform: uppercase;">Paid By</p>
              <p style="color: #111827; font-weight: 600; margin: 0;">${data.clientName}</p>
              <p style="color: #6b7280; margin: 4px 0 0 0; font-size: 14px;">${data.clientEmail}</p>
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
              <span style="color: #111827; font-weight: 600; font-size: 18px;">Total Paid</span>
              <span style="color: #059669; font-weight: 700; font-size: 24px;">£${data.total.toFixed(2)}</span>
            </div>
          </div>

          ${data.notes ? `
          <div style="margin-top: 24px; padding: 16px; background-color: #fef3c7; border-radius: 8px;">
            <p style="color: #92400e; font-size: 12px; margin: 0 0 4px 0; text-transform: uppercase;">Notes</p>
            <p style="color: #78350f; margin: 0; font-size: 14px;">${data.notes}</p>
          </div>
          ` : ""}

          <div style="margin-top: 32px; text-align: center; color: #9ca3af; font-size: 12px;">
            <p style="margin: 0;">Thank you for your payment!</p>
            <p style="margin: 4px 0 0 0;">This receipt confirms your payment has been received in full.</p>
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
  clientEmail: string,
  subject: string,
  html: string,
  pdfAttachment?: { filename: string; content: Buffer },
): Promise<{ emailId: string | undefined }> => {
  const smtp = emailSettings.smtp;
  if (!smtp.host || !smtp.username || !smtp.password) {
    throw new Error("SMTP settings incomplete. Please check host, username, and password.");
  }

  console.log(`[sendViaSmtp] host: ${smtp.host}, port: ${smtp.port}, secure: ${smtp.secure}, user: ${smtp.username}`);

  const transporter = nodemailer.createTransport({
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
    to: clientEmail,
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

  console.log(`[sendViaSmtp] Message sent: ${info.messageId}`);
  return { emailId: info.messageId };
};

const sendViaResend = async (
  emailSettings: z.infer<typeof emailSettingsSchema>,
  businessName: string,
  businessEmail: string,
  clientEmail: string,
  subject: string,
  html: string,
  pdfAttachment?: { filename: string; content: Buffer },
): Promise<{ emailId: string | undefined }> => {
  const apiKey = getResendApiKey(emailSettings);
  const { fromName, fromEmail } = resolveFrom(emailSettings, businessName, businessEmail);

  console.log(`[sendViaResend] Sending to ${clientEmail} from "${fromName}" <${fromEmail}>`);

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: `${fromName} <${fromEmail}>`,
      to: [clientEmail],
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
  clientEmail: string,
  subject: string,
  html: string,
  label: string,
  pdfAttachment?: { filename: string; content: Buffer },
): Promise<{ emailId: string | undefined }> => {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`[sendEmail] Attempt ${attempt}/${MAX_RETRIES} for ${label} to ${clientEmail} via ${emailSettings.provider}`);

      const result = emailSettings.provider === 'smtp'
        ? await sendViaSmtp(emailSettings, businessName, businessEmail, clientEmail, subject, html, pdfAttachment)
        : await sendViaResend(emailSettings, businessName, businessEmail, clientEmail, subject, html, pdfAttachment);

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
          resend: {
            ...emailSettings.resend,
            apiKey: fallbackKey,
          },
        };
        const result = await sendViaResend(fallbackSettings, businessName, businessEmail, clientEmail, subject, html, pdfAttachment);
        console.log(`[sendEmail] Resend fallback succeeded. ID: ${result.emailId}`);
        return result;
      } catch (resendError: unknown) {
        console.error(`[sendEmail] Resend fallback also failed:`, resendError instanceof Error ? resendError.message : resendError);
      }
    }
  }

  throw lastError ?? new Error('All retry attempts failed');
};

export const invoiceRouter = createTRPCRouter({
  sendInvoice: publicProcedure
    .input(sendInvoiceSchema)
    .mutation(async ({ input }) => {
      const { emailSettings, clientEmail, invoiceNumber } = input;

      console.log(`[sendInvoice] Starting for invoice ${invoiceNumber}, provider: ${emailSettings.provider}, configured: ${emailSettings.isConfigured}`);

      if (!emailSettings.isConfigured) {
        throw new Error("Email service not configured. Please configure email settings in Settings > Email.");
      }
      if (!clientEmail) {
        throw new Error("Client email is required to send invoice.");
      }

      try {
        const html = generateInvoiceHtml(input);
        const subject = `Invoice #${invoiceNumber} from ${input.businessName}`;

        console.log(`[sendInvoice] Generating PDF for invoice ${invoiceNumber}`);
        const pdfData: InvoicePdfData = {
          invoiceNumber: input.invoiceNumber,
          clientName: input.clientName,
          clientEmail: input.clientEmail,
          items: input.items,
          subtotal: input.subtotal,
          vatAmount: input.vatAmount,
          total: input.total,
          vatRate: input.vatRate,
          issueDate: input.issueDate,
          dueDate: input.dueDate,
          notes: input.notes,
          businessName: input.businessName,
          businessEmail: input.businessEmail,
          businessAddress: input.businessAddress,
          businessPhone: input.businessPhone,
          vatNumber: input.vatNumber,
        };
        const pdfBytes = await generateInvoicePdf(pdfData);
        const pdfAttachment = {
          filename: `Invoice-${invoiceNumber}.pdf`,
          content: Buffer.from(pdfBytes),
        };
        console.log(`[sendInvoice] PDF generated, size: ${pdfBytes.length} bytes`);

        const result = await sendEmailWithRetry(
          emailSettings, input.businessName, input.businessEmail,
          clientEmail, subject, html, `invoice ${invoiceNumber}`, pdfAttachment,
        );

        console.log(`[sendInvoice] Success. ID: ${result.emailId}`);
        return { success: true, emailId: result.emailId, message: `Invoice sent to ${clientEmail}` };
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : 'Unknown error';
        console.error(`[sendInvoice] Failed after ${MAX_RETRIES} attempts:`, msg);
        throw new Error(`Failed to send invoice email: ${msg}`);
      }
    }),

  sendReceipt: publicProcedure
    .input(sendReceiptSchema)
    .mutation(async ({ input }) => {
      const { emailSettings, clientEmail, invoiceNumber } = input;

      console.log(`[sendReceipt] Starting for invoice ${invoiceNumber}, provider: ${emailSettings.provider}, configured: ${emailSettings.isConfigured}`);

      if (!emailSettings.isConfigured) {
        throw new Error("Email service not configured. Please configure email settings in Settings > Email.");
      }
      if (!clientEmail) {
        throw new Error("Client email is required to send receipt.");
      }

      try {
        const html = generateReceiptHtml(input);
        const subject = `Payment Receipt for Invoice #${invoiceNumber} from ${input.businessName}`;

        console.log(`[sendReceipt] Generating PDF for receipt ${invoiceNumber}`);
        const receiptPdfData: ReceiptPdfData = {
          invoiceNumber: input.invoiceNumber,
          clientName: input.clientName,
          clientEmail: input.clientEmail,
          items: input.items,
          subtotal: input.subtotal,
          vatAmount: input.vatAmount,
          total: input.total,
          vatRate: input.vatRate,
          issueDate: input.issueDate,
          dueDate: input.dueDate,
          paidDate: input.paidDate,
          paymentMethod: input.paymentMethod,
          notes: input.notes,
          businessName: input.businessName,
          businessEmail: input.businessEmail,
          businessAddress: input.businessAddress,
          businessPhone: input.businessPhone,
          vatNumber: input.vatNumber,
        };
        const receiptPdfBytes = await generateReceiptPdf(receiptPdfData);
        const receiptPdfAttachment = {
          filename: `Receipt-${invoiceNumber}.pdf`,
          content: Buffer.from(receiptPdfBytes),
        };
        console.log(`[sendReceipt] PDF generated, size: ${receiptPdfBytes.length} bytes`);

        const result = await sendEmailWithRetry(
          emailSettings, input.businessName, input.businessEmail,
          clientEmail, subject, html, `receipt for ${invoiceNumber}`, receiptPdfAttachment,
        );

        console.log(`[sendReceipt] Success. ID: ${result.emailId}`);
        return { success: true, emailId: result.emailId, message: `Receipt sent to ${clientEmail}` };
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : 'Unknown error';
        console.error(`[sendReceipt] Failed after ${MAX_RETRIES} attempts:`, msg);
        throw new Error(`Failed to send receipt email: ${msg}`);
      }
    }),
});
