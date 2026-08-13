import { beforeEach, describe, expect, it } from "vitest";

import { eq } from "drizzle-orm";

import { db } from "@UnifiedAttendance/db";
import { branches, people, roles, user, userRoles } from "@UnifiedAttendance/db/schema/index";

import {
  createEmployee,
  createWorkforceDocument,
  deleteWorkforceDocument,
  finalizeWorkforceDocument,
} from "../../../src/modules/workforce/service";
import { resetDatabase, testContext } from "../../fixtures";

const context = testContext("admin");

describe("workforce documents", () => {
  let branchId: string;

  beforeEach(async () => {
    await resetDatabase();
    await db.insert(user).values({
      id: "admin",
      name: "Admin",
      email: "admin@example.test",
      emailVerified: true,
    });
    const [adminRole] = await db.select().from(roles).where(eq(roles.name, "Admin")).limit(1);
    await db.insert(userRoles).values({ userId: "admin", roleId: adminRole!.id });
    const [branch] = await db
      .insert(branches)
      .values({ name: "Head Office", code: "HQ" })
      .returning();
    branchId = branch!.id;
  });

  async function personOnFile(personId: string) {
    const [person] = await db.select().from(people).where(eq(people.id, personId)).limit(1);
    return person!;
  }

  it("keeps the person's photo pointer on the current finalized document", async () => {
    const created = await createEmployee(context, {
      person: {
        firstName: "Aster",
        middleName: "T.",
        lastName: "Mekonnen",
        gender: "female",
        emergencyContactName: "Marta Mekonnen",
        emergencyContactPhone: "+251911000000",
      },
      employee: {
        branchId,
        employeeCode: "EMP-100",
        employmentType: "permanent",
        hireDate: "2026-01-01",
      },
    });
    const personId = created.person.id;
    // The person's own fields land as given.
    expect(created.person).toMatchObject({
      middleName: "T.",
      gender: "female",
      emergencyContactName: "Marta Mekonnen",
    });
    expect(created.person.profilePhotoUrl).toBeNull();

    // An unfinalized upload changes nothing.
    const first = await createWorkforceDocument(context, {
      personId,
      kind: "profile_photo",
      contentType: "image/jpeg",
      contentLength: 120_000,
    });
    expect((await personOnFile(personId)).profilePhotoUrl).toBeNull();

    // Finalizing points the person at the file, extension included.
    await finalizeWorkforceDocument(context, first!.id);
    expect((await personOnFile(personId)).profilePhotoUrl).toBe(`${first!.storageKey}.jpg`);

    // A replacement upload moves the pointer once finalized.
    const second = await createWorkforceDocument(context, {
      personId,
      kind: "profile_photo",
      contentType: "image/webp",
      contentLength: 80_000,
    });
    await finalizeWorkforceDocument(context, second!.id);
    expect((await personOnFile(personId)).profilePhotoUrl).toBe(`${second!.storageKey}.webp`);

    // Deleting the superseded file leaves the current pointer alone…
    await deleteWorkforceDocument(context, first!.id);
    expect((await personOnFile(personId)).profilePhotoUrl).toBe(`${second!.storageKey}.webp`);

    // …and deleting the current one clears it.
    await deleteWorkforceDocument(context, second!.id);
    expect((await personOnFile(personId)).profilePhotoUrl).toBeNull();
  });

  it("leaves the person untouched by documents of other kinds", async () => {
    const created = await createEmployee(context, {
      person: { firstName: "Nahom", lastName: "Desta" },
      employee: {
        branchId,
        employeeCode: "EMP-101",
        employmentType: "permanent",
        hireDate: "2026-01-01",
      },
    });
    const front = await createWorkforceDocument(context, {
      personId: created.person.id,
      kind: "national_id_front",
      contentType: "application/pdf",
      contentLength: 300_000,
    });
    await finalizeWorkforceDocument(context, front!.id);
    expect((await personOnFile(created.person.id)).profilePhotoUrl).toBeNull();
  });
});
