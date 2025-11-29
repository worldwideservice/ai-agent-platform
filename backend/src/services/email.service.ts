import nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';
import logger from '../utils/logger';

// Email configuration interface
interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  from: string;
}

// Email options interface
interface EmailOptions {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  attachments?: Array<{
    filename: string;
    path?: string;
    content?: Buffer | string;
    contentType?: string;
  }>;
  replyTo?: string;
}

// Document delivery options
interface DocumentDeliveryOptions {
  recipientEmail: string;
  recipientName?: string;
  documents: Array<{
    fileName: string;
    filePath: string;
    mimeType: string;
  }>;
  agentName: string;
  message?: string;
}

class EmailService {
  private transporter: Transporter | null = null;
  private config: EmailConfig | null = null;
  private isConfigured: boolean = false;

  constructor() {
    this.initialize();
  }

  private initialize() {
    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT || '587');
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const from = process.env.SMTP_FROM;

    if (!host || !user || !pass || !from) {
      logger.warn('Email service not configured - missing SMTP credentials');
      this.isConfigured = false;
      return;
    }

    this.config = {
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
      from,
    };

    this.transporter = nodemailer.createTransport({
      host: this.config.host,
      port: this.config.port,
      secure: this.config.secure,
      auth: this.config.auth,
      pool: true,
      maxConnections: 5,
      maxMessages: 100,
      rateDelta: 1000,
      rateLimit: 10,
    });

    // Verify connection
    this.transporter.verify((error) => {
      if (error) {
        logger.error('Email service connection failed', { error: error.message });
        this.isConfigured = false;
      } else {
        logger.info('Email service connected successfully');
        this.isConfigured = true;
      }
    });
  }

  /**
   * Check if email service is configured and ready
   */
  isReady(): boolean {
    return this.isConfigured && this.transporter !== null;
  }

  /**
   * Send a basic email
   */
  async sendEmail(options: EmailOptions): Promise<boolean> {
    if (!this.isReady()) {
      logger.warn('Email service not ready, skipping email', {
        to: options.to,
        subject: options.subject,
      });
      return false;
    }

    try {
      const mailOptions = {
        from: this.config!.from,
        to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
        attachments: options.attachments,
        replyTo: options.replyTo,
      };

      const result = await this.transporter!.sendMail(mailOptions);

      logger.info('Email sent successfully', {
        messageId: result.messageId,
        to: options.to,
        subject: options.subject,
      });

      return true;
    } catch (error: any) {
      logger.error('Failed to send email', {
        error: error.message,
        to: options.to,
        subject: options.subject,
      });
      return false;
    }
  }

  /**
   * Send documents to a recipient
   */
  async sendDocuments(options: DocumentDeliveryOptions): Promise<boolean> {
    const { recipientEmail, recipientName, documents, agentName, message } = options;

    const attachments = documents.map((doc) => ({
      filename: doc.fileName,
      path: doc.filePath,
      contentType: doc.mimeType,
    }));

    const documentList = documents.map((d) => `• ${d.fileName}`).join('\n');

    const emailOptions: EmailOptions = {
      to: recipientEmail,
      subject: `Документы от ${agentName}`,
      text: `
Здравствуйте${recipientName ? `, ${recipientName}` : ''}!

${message || `${agentName} отправил вам документы:`}

${documentList}

Документы прикреплены к этому письму.

---
Это автоматическое сообщение от AI Agent Platform.
      `.trim(),
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
    .document-list { background: white; padding: 15px; border-radius: 4px; margin: 15px 0; }
    .document-item { padding: 8px 0; border-bottom: 1px solid #eee; }
    .document-item:last-child { border-bottom: none; }
    .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2 style="margin: 0;">Документы от ${agentName}</h2>
    </div>
    <div class="content">
      <p>Здравствуйте${recipientName ? `, <strong>${recipientName}</strong>` : ''}!</p>
      <p>${message || `${agentName} отправил вам документы:`}</p>
      <div class="document-list">
        ${documents.map((d) => `<div class="document-item">📎 ${d.fileName}</div>`).join('')}
      </div>
      <p>Документы прикреплены к этому письму.</p>
    </div>
    <div class="footer">
      <p>Это автоматическое сообщение от AI Agent Platform</p>
    </div>
  </div>
</body>
</html>
      `.trim(),
      attachments,
    };

    return this.sendEmail(emailOptions);
  }

  /**
   * Send a notification email
   */
  async sendNotification(
    to: string,
    subject: string,
    title: string,
    message: string,
    actionUrl?: string,
    actionText?: string
  ): Promise<boolean> {
    const emailOptions: EmailOptions = {
      to,
      subject,
      text: `${title}\n\n${message}${actionUrl ? `\n\nСсылка: ${actionUrl}` : ''}`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .card { background: white; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); overflow: hidden; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; }
    .content { padding: 20px; }
    .button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; border-radius: 4px; text-decoration: none; margin-top: 15px; }
    .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="header">
        <h2 style="margin: 0;">${title}</h2>
      </div>
      <div class="content">
        <p>${message}</p>
        ${actionUrl ? `<a href="${actionUrl}" class="button">${actionText || 'Перейти'}</a>` : ''}
      </div>
    </div>
    <div class="footer">
      <p>AI Agent Platform</p>
    </div>
  </div>
</body>
</html>
      `.trim(),
    };

    return this.sendEmail(emailOptions);
  }

  /**
   * Send subscription notification
   */
  async sendSubscriptionNotification(
    to: string,
    event: 'trial_ending' | 'subscription_ending' | 'payment_failed' | 'plan_changed',
    data: {
      userName?: string;
      plan?: string;
      daysRemaining?: number;
      newPlan?: string;
    }
  ): Promise<boolean> {
    let subject = '';
    let title = '';
    let message = '';

    switch (event) {
      case 'trial_ending':
        subject = `Пробный период заканчивается через ${data.daysRemaining} дн.`;
        title = 'Пробный период скоро закончится';
        message = `Ваш пробный период заканчивается через ${data.daysRemaining} дней. Оформите подписку, чтобы продолжить использование платформы.`;
        break;

      case 'subscription_ending':
        subject = 'Подписка скоро закончится';
        title = 'Напоминание о подписке';
        message = `Ваша подписка "${data.plan}" заканчивается через ${data.daysRemaining} дней. Продлите подписку, чтобы не потерять доступ.`;
        break;

      case 'payment_failed':
        subject = 'Ошибка оплаты подписки';
        title = 'Не удалось списать оплату';
        message = 'При попытке продлить вашу подписку произошла ошибка. Пожалуйста, проверьте платежные данные.';
        break;

      case 'plan_changed':
        subject = `План изменен на "${data.newPlan}"`;
        title = 'Тарифный план изменен';
        message = `Ваш тарифный план успешно изменен на "${data.newPlan}".`;
        break;
    }

    return this.sendNotification(
      to,
      subject,
      title,
      message,
      process.env.APP_URL ? `${process.env.APP_URL}/billing` : undefined,
      'Управление подпиской'
    );
  }
}

// Export singleton instance
const emailService = new EmailService();
export default emailService;
