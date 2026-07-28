import { eq, inArray } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { db } from "@UnifiedAttendance/db";
import { permissions, rolePermissions, roles, userRoles } from "@UnifiedAttendance/db/schema/index";

import { ROLES, isRole } from "../rbac/permissions";
import { protectedProcedure, router } from "../index";
import { requireSessionUser, requireSuperAdmin } from "./shared";

const id = z.uuid();
const permissionCode = z.string().min(1);

const roleNames = Object.values(ROLES);

export const accessRouter = router({
  me: protectedProcedure.query(async ({ ctx }) => {
    const userId = requireSessionUser(ctx);
    return db
      .select({
        roleId: roles.id,
        roleName: roles.name,
        permission: permissions.code,
      })
      .from(userRoles)
      .innerJoin(roles, eq(userRoles.roleId, roles.id))
      .leftJoin(rolePermissions, eq(rolePermissions.roleId, roles.id))
      .leftJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
      .where(eq(userRoles.userId, userId));
  }),

  permissions: protectedProcedure.query(async ({ ctx }) => {
    await requireSuperAdmin(ctx);
    return db.select().from(permissions).orderBy(permissions.code);
  }),

  roles: protectedProcedure.query(async ({ ctx }) => {
    await requireSuperAdmin(ctx);
    return db.select().from(roles).where(inArray(roles.name, roleNames)).orderBy(roles.name);
  }),

  updateRolePermissions: protectedProcedure
    .input(z.object({ roleId: id, permissionCodes: z.array(permissionCode) }))
    .mutation(async ({ ctx, input }) => {
      await requireSuperAdmin(ctx);
      const [role] = await db.select().from(roles).where(eq(roles.id, input.roleId)).limit(1);
      if (!role || !isRole(role.name)) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Role not found" });
      }

      const selectedPermissions = input.permissionCodes.length === 0
        ? []
        : await db.select().from(permissions).where(inArray(permissions.code, input.permissionCodes));
      if (selectedPermissions.length !== input.permissionCodes.length) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "One or more permission codes are not in the seeded catalog",
        });
      }

      await db.transaction(async (tx) => {
        await tx.delete(rolePermissions).where(eq(rolePermissions.roleId, role.id));
        if (selectedPermissions.length > 0) {
          await tx.insert(rolePermissions).values(
            selectedPermissions.map((permission) => ({ roleId: role.id, permissionId: permission.id })),
          );
        }
      });
      return role;
    }),

  assignments: protectedProcedure.query(async ({ ctx }) => {
    await requireSuperAdmin(ctx);
    return db
      .select({ userId: userRoles.userId, roleId: userRoles.roleId, roleName: roles.name, assignedAt: userRoles.assignedAt, assignedBy: userRoles.assignedBy })
      .from(userRoles)
      .innerJoin(roles, eq(userRoles.roleId, roles.id));
  }),

  assignRole: protectedProcedure
    .input(z.object({ userId: z.string().min(1), roleId: id }))
    .mutation(async ({ ctx, input }) => {
      await requireSuperAdmin(ctx);
      const [role] = await db.select().from(roles).where(eq(roles.id, input.roleId)).limit(1);
      if (!role || !isRole(role.name)) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Role not found" });
      }
      const assignedBy = requireSessionUser(ctx);
      const [assignment] = await db
        .insert(userRoles)
        .values({ userId: input.userId, roleId: role.id, assignedBy })
        .onConflictDoUpdate({
          target: userRoles.userId,
          set: { roleId: role.id, assignedAt: new Date(), assignedBy },
        })
        .returning();
      return assignment;
    }),
});
