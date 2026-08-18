"use client";

import { useQuery } from "@tanstack/react-query";
import { AlarmClock, ScrollText, UserCheck, UsersRound } from "lucide-react";

import { RequestErrorAlert } from "@/components/request-error-alert";
import { overviewQueries } from "@/lib/api";
import { presentRequestError } from "@/lib/errors";
import { formatDate } from "@/lib/format-date";
import { detectedTimeZone } from "@/lib/timezone";

import { today } from "../attendance/register-presentation";
import { AttendanceTrend } from "./attendance-trend";
import { DeviceHealth } from "./device-health";
import { LiveFeed } from "./live-feed";
import { StatTile } from "./stat-tile";

const EMPTY = {
  headcount: 0,
  branches: 0,
  today: {
    recorded: 0,
    onWorkingDay: 0,
    present: 0,
    onTime: 0,
    late: 0,
    absent: 0,
    missingPunch: 0,
    corrected: 0,
    notRecorded: 0,
  },
  trend: [],
  devices: { total: 0, online: 0, warning: 0, offline: 0, lastSeenAt: null, rows: [] },
  feed: [],
  correctionsThisMonth: 0,
  unmatchedPunches: 0,
};

export function OperationsOverview({ name }: { name: string }) {
  const timeZone = detectedTimeZone();
  const date = today(timeZone);
  const query = useQuery(overviewQueries.operations({ date, feed: 6 }));
  const overview = query.data ?? EMPTY;
  const loading = query.isPending;

  const { headcount } = overview;
  const { present, onTime, late, absent, missingPunch, notRecorded } = overview.today;
  const rate = present + absent > 0 ? Math.round((present / (present + absent)) * 100) : null;

  return (
    <div className="mx-auto w-full max-w-[1240px] space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-muted-foreground">Welcome back, {name}</p>
          <h1 className="text-strong mt-1 font-heading text-2xl font-bold tracking-[-0.03em]">
            Operations today
          </h1>
        </div>
        <p className="font-heading text-xs font-semibold text-muted-foreground tabular-nums">
          {formatDate(date, timeZone)} · {overview.branches}{" "}
          {overview.branches === 1 ? "branch" : "branches"}
        </p>
      </header>

      {query.isError ? (
        <RequestErrorAlert
          error={presentRequestError(query.error, "Could not load today's figures.")}
          onRetry={() => void query.refetch()}
        />
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Today at a glance">
        <StatTile
          label="On shift"
          value={headcount}
          context={`Active employment across ${overview.branches} ${overview.branches === 1 ? "branch" : "branches"}`}
          icon={UsersRound}
          tone="workflow"
          loading={loading}
        />
        <StatTile
          label="Present today"
          value={present}
          unit={`/ ${present + absent}`}
          context={
            rate === null
              ? "No day computed yet — open the register"
              : `${rate}% of the days computed so far`
          }
          icon={UserCheck}
          tone="live"
          loading={loading}
        />
        <StatTile
          label="Late arrivals"
          value={late}
          context={
            missingPunch > 0
              ? `${missingPunch} ${missingPunch === 1 ? "day is" : "days are"} missing a punch`
              : onTime > 0
                ? `${onTime} arrived on time`
                : "Nothing recorded late"
          }
          icon={AlarmClock}
          tone="pending"
          loading={loading}
        />
        <StatTile
          label="Corrections this month"
          value={overview.correctionsThisMonth}
          context={
            notRecorded > 0
              ? `${notRecorded} of today's days not computed yet`
              : "Every day on the books is computed"
          }
          icon={ScrollText}
          tone="action"
          loading={loading}
        />
      </section>

      <div className="grid items-start gap-3 lg:grid-cols-[1.4fr_1fr]">
        <AttendanceTrend trend={overview.trend} loading={loading} />
        <DeviceHealth
          devices={overview.devices}
          unmatchedPunches={overview.unmatchedPunches}
          loading={loading}
          refreshing={query.isRefetching}
          onRefresh={() => void query.refetch()}
        />
      </div>

      <LiveFeed
        feed={overview.feed}
        timeZone={timeZone}
        loading={loading}
        refreshing={query.isRefetching}
        onRefresh={() => void query.refetch()}
      />
    </div>
  );
}
