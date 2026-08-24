import { relations, sql } from "drizzle-orm";
import {
  boolean,
  index,
  sqliteTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  now,
} from "./columns";

import { user } from "./auth";

export const roles = sqliteTable(
  "roles",
  {
    id: uuid("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    name: text("name").notNull(),
    code: text("code"),
    description: text("description"),
    isSystem: boolean("is_system").notNull().default(false),
    archivedAt: timestamp("archived_at"),
    createdAt: timestamp("created_at").default(now).notNull(),
  },

  (table) => [
    uniqueIndex("roles_name_active_idx")
      .on(table.name)
      .where(sql`${table.archivedAt} is null`),
    uniqueIndex("roles_code_active_idx")
      .on(table.code)
      .where(sql`${table.archivedAt} is null`),
  ],
);

export const permissions = sqliteTable("permissions", {
  id: uuid("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  code: text("code").notNull().unique(),
  createdAt: timestamp("created_at").default(now).notNull(),
});

export const rolePermissions = sqliteTable(
  "role_permissions",
  {
    roleId: uuid("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
    permissionId: uuid("permission_id")
      .notNull()
      .references(() => permissions.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.roleId, table.permissionId] })],
);

export const userRoles = sqliteTable(
  "user_roles",
  {
    userId: text("user_id")
      .notNull()
      .primaryKey()
      .references(() => user.id, { onDelete: "cascade" }),
    roleId: uuid("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
    assignedAt: timestamp("assigned_at").default(now).notNull(),
    assignedBy: text("assigned_by").references(() => user.id, { onDelete: "set null" }),
  },
  (table) => [index("user_roles_role_idx").on(table.roleId)],
);

export const rolesRelations = relations(roles, ({ many }) => ({
  rolePermissions: many(rolePermissions),
  userRoles: many(userRoles),
}));

export const permissionsRelations = relations(permissions, ({ many }) => ({
  rolePermissions: many(rolePermissions),
}));

export const rolePermissionsRelations = relations(rolePermissions, ({ one }) => ({
  role: one(roles, { fields: [rolePermissions.roleId], references: [roles.id] }),
  permission: one(permissions, {
    fields: [rolePermissions.permissionId],
    references: [permissions.id],
  }),
}));

export const userRolesRelations = relations(userRoles, ({ one }) => ({
  user: one(user, { fields: [userRoles.userId], references: [user.id] }),
  role: one(roles, { fields: [userRoles.roleId], references: [roles.id] }),
  assigner: one(user, { fields: [userRoles.assignedBy], references: [user.id] }),
}));
