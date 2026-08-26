import { beforeEach, describe, expect, it, vi } from "vitest";

const sent: { to: string; subject: string; body: string }[] = [];
vi.mock("@UnifiedAttendance/mailer", () => ({
  createMailer: () => ({
    send: async (input: { to: string; subject: string; body: string }) => {
      sent.push(input);
    },
  }),
}));

import { auth } from "@UnifiedAttendance/auth";
import { db } from "@UnifiedAttendance/db";
import { roles } from "@UnifiedAttendance/db/schema/index";
import { eq } from "drizzle-orm";

import { createUser } from "../../../src/modules/access/service";
import { resetDatabase, testContext } from "../../fixtures";

const EMAIL = "hr.person@example.test";
const PASSWORD = "Original-Pass-123";

async function seedSuperAdminAndHr() {
  await db.insert((await import("@UnifiedAttendance/db/schema/index")).user).values({
    id: "super",
    name: "Super",
    email: "super@example.test",
    emailVerified: true,
  });
  const [superRole] = await db
    .select()
    .from(roles)
    .where(eq(roles.name, "Super Administrator"))
    .limit(1);
  const [hrRole] = await db.select().from(roles).where(eq(roles.name, "HR")).limit(1);
  await db
    .insert((await import("@UnifiedAttendance/db/schema/index")).userRoles)
    .values({ userId: "super", roleId: superRole!.id });
  return createUser(testContext("super"), {
    name: "HR Person",
    email: EMAIL,
    password: PASSWORD,
    roleId: hrRole!.id,
  });
}

function resetLinkFrom(body: string) {
  const match = body.match(/https?:\/\/\S+\/reset-password\?token=([A-Za-z0-9._-]+)/);
  return match ? { url: match[0], token: match[1]! } : null;
}

describe("password reset", () => {
  beforeEach(async () => {
    await resetDatabase();
    sent.length = 0;
  });

  it("emails a reset link to the account's address", async () => {
    await seedSuperAdminAndHr();

    await auth.api.requestPasswordReset({ body: { email: EMAIL, redirectTo: "/reset-password" } });

    expect(sent).toHaveLength(1);
    expect(sent[0]!.to).toBe(EMAIL);
    expect(resetLinkFrom(sent[0]!.body)).not.toBeNull();
  });

  it("stays silent for an unknown address, so nobody can probe which emails exist", async () => {
    await seedSuperAdminAndHr();

    await expect(
      auth.api.requestPasswordReset({
        body: { email: "nobody@example.test", redirectTo: "/reset-password" },
      }),
    ).resolves.toBeDefined();

    expect(sent).toHaveLength(0);
  });

  it("lets the new password in and shuts the old one out", async () => {
    await seedSuperAdminAndHr();
    await auth.api.requestPasswordReset({ body: { email: EMAIL, redirectTo: "/reset-password" } });
    const { token } = resetLinkFrom(sent[0]!.body)!;

    await auth.api.resetPassword({ body: { token, newPassword: "Brand-New-Pass-456" } });

    await expect(
      auth.api.signInEmail({ body: { email: EMAIL, password: "Brand-New-Pass-456" } }),
    ).resolves.toMatchObject({ user: { email: EMAIL } });
    await expect(
      auth.api.signInEmail({ body: { email: EMAIL, password: PASSWORD } }),
    ).rejects.toMatchObject({ status: "UNAUTHORIZED" });
  });

  it("signs the account out everywhere else once the password changes", async () => {
    await seedSuperAdminAndHr();
    // A session that existed before the reset — e.g. whoever stole the old password.
    const signedIn = await auth.api.signInEmail({
      body: { email: EMAIL, password: PASSWORD },
      asResponse: true,
    });
    const cookie = signedIn.headers.get("set-cookie")!.split(";")[0]!;
    await expect(auth.api.getSession({ headers: new Headers({ cookie }) })).resolves.toMatchObject({
      user: { email: EMAIL },
    });

    await auth.api.requestPasswordReset({ body: { email: EMAIL, redirectTo: "/reset-password" } });
    const { token } = resetLinkFrom(sent[0]!.body)!;
    await auth.api.resetPassword({ body: { token, newPassword: "Brand-New-Pass-456" } });

    await expect(auth.api.getSession({ headers: new Headers({ cookie }) })).resolves.toBeNull();
  });

  it("refuses a token a second time", async () => {
    await seedSuperAdminAndHr();
    await auth.api.requestPasswordReset({ body: { email: EMAIL, redirectTo: "/reset-password" } });
    const { token } = resetLinkFrom(sent[0]!.body)!;
    await auth.api.resetPassword({ body: { token, newPassword: "Brand-New-Pass-456" } });

    await expect(
      auth.api.resetPassword({ body: { token, newPassword: "Another-Pass-789" } }),
    ).rejects.toMatchObject({ status: "BAD_REQUEST" });
  });
});
