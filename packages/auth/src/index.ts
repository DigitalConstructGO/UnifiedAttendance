import { db } from "@UnifiedAttendance/db";
import * as schema from "@UnifiedAttendance/db/schema/auth";
import { env } from "@UnifiedAttendance/env/server";
import { createMailer, type Mailer } from "@UnifiedAttendance/mailer";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";

// Built on first use: `createMailer()` opens an SMTP transport eagerly and requires the
// SMTP env vars, which must not be a condition of merely importing `auth`.
let mailer: Mailer | undefined;
function sendMail(input: Parameters<Mailer["send"]>[0]) {
  mailer ??= createMailer();
  return mailer.send(input);
}

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "sqlite",

    schema: schema,
  }),
  trustedOrigins: [env.CORS_ORIGIN],
  emailAndPassword: {
    enabled: true,
    resetPasswordTokenExpiresIn: 60 * 60,
    // A reset usually means the old password leaked; whoever holds it loses their session.
    revokeSessionsOnPasswordReset: true,
    // The link goes straight to our own page, which submits the token to
    // `resetPassword`; better-auth's default URL would bounce through /api/auth first.
    sendResetPassword: async ({ user, token }) => {
      const url = `${env.BETTER_AUTH_URL}/reset-password?token=${encodeURIComponent(token)}`;
      await sendMail({
        to: user.email,
        subject: "Reset your password",
        body:
          `Hi ${user.name},\n\n` +
          `Someone asked to reset the password for this account. If that was you, open the ` +
          `link below within the next hour to choose a new password:\n\n${url}\n\n` +
          `If you did not ask for this, you can ignore this email — your password stays as it is.`,
      });
    },
  },
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,
    },
  },
  plugins: [nextCookies()],
});
