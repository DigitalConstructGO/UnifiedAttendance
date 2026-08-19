import { beforeEach, describe, expect, it, vi } from "vitest";

const { sendMail, createTransport } = vi.hoisted(() => {
  const sendMail = vi.fn().mockResolvedValue({ messageId: "test-message-id" });
  const createTransport = vi.fn(() => ({ sendMail }));
  return { sendMail, createTransport };
});

vi.mock("nodemailer", () => ({
  default: { createTransport },
}));

import { createMailer } from "../../../src/mailer";

describe("createMailer", () => {
  beforeEach(() => {
    sendMail.mockClear();
    createTransport.mockClear();
  });

  it("builds the SMTP transport from env config", () => {
    createMailer();

    expect(createTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        host: expect.any(String),
        port: expect.any(Number),
        auth: expect.objectContaining({ user: expect.any(String), pass: expect.any(String) }),
      }),
    );
  });

  it("sends mail with the given to/subject/body as a plain-text message", async () => {
    const mailer = createMailer();

    await mailer.send({ to: "someone@example.test", subject: "Hello", body: "Hi there" });

    expect(sendMail).toHaveBeenCalledTimes(1);
    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "someone@example.test",
        subject: "Hello",
        text: "Hi there",
        from: expect.any(String),
      }),
    );
  });

  it("never attempts a real network connection — sendMail is fully mocked", async () => {
    const mailer = createMailer();
    await mailer.send({ to: "a@b.test", subject: "s", body: "b" });

    // The only way this resolves without a real SMTP server is that nodemailer itself
    // was replaced by the mock above.
    expect(sendMail).toHaveBeenCalled();
  });
});
