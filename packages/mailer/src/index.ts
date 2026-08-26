import nodemailer from "nodemailer";

import { env } from "@UnifiedAttendance/env/server";

export type SendEmailInput = {
  to: string;
  subject: string;
  body: string;
};

export type Mailer = {
  send(input: SendEmailInput): Promise<void>;
};

export function createMailer(): Mailer {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM } = env;
  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS || !SMTP_FROM) {
    throw new Error(
      "SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, and SMTP_FROM must all be set to send email",
    );
  }

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });

  return {
    async send({ to, subject, body }) {
      await transporter.sendMail({
        from: SMTP_FROM,
        to,
        subject,
        text: body,
      });
    },
  };
}
