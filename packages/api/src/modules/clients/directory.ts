import { and, eq, inArray, isNull } from "drizzle-orm";

import { db } from "@UnifiedAttendance/db";
import {
  crmActivities,
  invoicePayments,
  invoices,
  opportunities,
  pipelineStages,
  projects,
} from "@UnifiedAttendance/db/schema/index";

import { addCurrencyAmount, moneyMeasure } from "./money";

type ClientDirectorySource = {
  id: string;
  status: "active" | "archived";
};

type DirectoryStatus =
  | { kind: "active_project"; label: "Active project" }
  | { kind: "recurring"; label: "Recurring" }
  | { kind: "pipeline_stage"; label: string; pipelineStageId: string }
  | { kind: "completed"; label: "Completed" }
  | { kind: "active"; label: "Active" }
  | { kind: "archived"; label: "Archived" };

function emptyMetrics() {
  return {
    projects: [] as Array<{ status: string; updatedAt: Date }>,
    openStages: [] as Array<{ id: string; name: string; position: number }>,
    invoiced: new Map<string, bigint>(),
    collected: new Map<string, bigint>(),
    lastActivityAt: null as Date | null,
  };
}

function selectDirectoryStatus(
  client: ClientDirectorySource,
  metrics: ReturnType<typeof emptyMetrics>,
  recurring: boolean,
): DirectoryStatus {
  if (metrics.projects.some((project) => project.status === "in_progress")) {
    return { kind: "active_project", label: "Active project" };
  }

  const stage = metrics.openStages.sort((left, right) => right.position - left.position)[0];
  if (stage) {
    return {
      kind: "pipeline_stage",
      label: stage.name,
      pipelineStageId: stage.id,
    };
  }
  const latestProject = metrics.projects.sort(
    (left, right) => right.updatedAt.getTime() - left.updatedAt.getTime(),
  )[0];
  if (latestProject?.status === "completed") {
    return { kind: "completed", label: "Completed" };
  }
  if (recurring) return { kind: "recurring", label: "Recurring" };
  if (client.status === "archived") return { kind: "archived", label: "Archived" };
  return { kind: "active", label: "Active" };
}

export async function getClientDirectoryMetrics(clientRows: ClientDirectorySource[]) {
  const clientIds = clientRows.map((client) => client.id);
  const result = new Map<string, ReturnType<typeof emptyMetrics>>();
  for (const clientId of clientIds) result.set(clientId, emptyMetrics());
  if (clientIds.length === 0) return new Map();

  const [projectRows, opportunityRows, invoiceRows, paymentRows, activityRows] = await Promise.all([
    db
      .select({
        clientId: projects.clientId,
        status: projects.status,
        updatedAt: projects.updatedAt,
      })
      .from(projects)
      .where(inArray(projects.clientId, clientIds)),
    db
      .select({
        clientId: opportunities.clientId,
        stageId: pipelineStages.id,
        stageName: pipelineStages.name,
        stagePosition: pipelineStages.position,
      })
      .from(opportunities)
      .innerJoin(pipelineStages, eq(opportunities.pipelineStageId, pipelineStages.id))
      .where(
        and(
          inArray(opportunities.clientId, clientIds),
          isNull(opportunities.closedAt),
          eq(pipelineStages.outcome, "open"),
        ),
      ),
    db
      .select({
        clientId: invoices.clientId,
        currency: invoices.currency,
        amount: invoices.totalAmount,
      })
      .from(invoices)
      .where(and(inArray(invoices.clientId, clientIds), eq(invoices.lifecycleStatus, "issued"))),
    db
      .select({
        clientId: invoices.clientId,
        currency: invoicePayments.currency,
        amount: invoicePayments.amount,
      })
      .from(invoicePayments)
      .innerJoin(invoices, eq(invoicePayments.invoiceId, invoices.id))
      .where(and(inArray(invoices.clientId, clientIds), eq(invoices.lifecycleStatus, "issued"))),
    db
      .select({ clientId: crmActivities.clientId, occurredAt: crmActivities.occurredAt })
      .from(crmActivities)
      .where(inArray(crmActivities.clientId, clientIds)),
  ]);

  for (const row of projectRows) {
    result.get(row.clientId)?.projects.push({
      status: row.status,
      updatedAt: row.updatedAt,
    });
  }
  for (const row of opportunityRows) {
    if (!row.clientId) continue;
    result.get(row.clientId)?.openStages.push({
      id: row.stageId,
      name: row.stageName,
      position: row.stagePosition,
    });
  }
  for (const row of invoiceRows) {
    const metrics = result.get(row.clientId);
    if (metrics) addCurrencyAmount(metrics.invoiced, row.currency, row.amount);
  }
  for (const row of paymentRows) {
    const metrics = result.get(row.clientId);
    if (metrics) addCurrencyAmount(metrics.collected, row.currency, row.amount);
  }
  for (const row of activityRows) {
    if (!row.clientId) continue;
    const metrics = result.get(row.clientId);
    if (metrics && (metrics.lastActivityAt === null || row.occurredAt > metrics.lastActivityAt)) {
      metrics.lastActivityAt = row.occurredAt;
    }
  }

  return new Map(
    clientRows.map((client) => {
      const metrics = result.get(client.id) ?? emptyMetrics();
      const recurring =
        metrics.projects.filter(
          (project) => project.status === "in_progress" || project.status === "completed",
        ).length >= 2;
      const outstanding = new Map(metrics.invoiced);
      for (const [currency, amount] of metrics.collected) {
        const balance = (outstanding.get(currency) ?? BigInt(0)) - amount;
        outstanding.set(currency, balance > BigInt(0) ? balance : BigInt(0));
      }
      return [
        client.id,
        {
          directoryStatus: selectDirectoryStatus(client, metrics, recurring),
          invoicedRevenue: moneyMeasure(metrics.invoiced),
          collectedRevenue: moneyMeasure(metrics.collected),
          outstanding: moneyMeasure(outstanding),
          projectCount: metrics.projects.length,
          recurring,
          lastActivityAt: metrics.lastActivityAt,
        },
      ] as const;
    }),
  );
}
