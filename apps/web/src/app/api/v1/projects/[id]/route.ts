import { deleteProject, getProject, updateProject } from "@UnifiedAttendance/api";
import {
  clientResourceIdInput,
  updateProjectInput,
} from "@UnifiedAttendance/api/validations/clients";
import { route } from "@/lib/route";

export const GET = route({
  input: clientResourceIdInput,
  handler: ({ ctx, input }) => getProject(ctx, input),
});

export const PATCH = route({
  input: updateProjectInput,
  handler: ({ ctx, input }) => updateProject(ctx, input),
});

export const DELETE = route({
  input: clientResourceIdInput,
  handler: ({ ctx, input }) => deleteProject(ctx, input),
});
