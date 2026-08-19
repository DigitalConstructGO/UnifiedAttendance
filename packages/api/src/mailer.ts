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
  const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
  });

  return {
    async send({ to, subject, body }) {
      await transporter.sendMail({
        from: env.SMTP_FROM,
        to,
        subject,
        text: body,
      });
    },
  };
}
