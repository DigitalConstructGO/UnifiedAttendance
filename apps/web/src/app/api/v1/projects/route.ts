import { createProject, listProjects } from "@UnifiedAttendance/api";
import { createProjectInput, listProjectsInput } from "@UnifiedAttendance/api/validations/clients";
import { route } from "@/lib/route";

export const GET = route({
  input: listProjectsInput,
  handler: ({ ctx, input }) => listProjects(ctx, input),
});

export const POST = route({
  input: createProjectInput,
  status: 201,
  handler: ({ ctx, input }) => createProject(ctx, input),
});
