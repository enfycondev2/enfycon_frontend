import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, RefreshCw, Layers, Users, BriefcaseBusiness, CalendarCheck } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface LastJob {
  jobCode: string;
  jobTitle: string;
  assignedAt: string;
}

interface PodCycleEntry {
  id: string;
  name: string;
  isAvailableForAssignment: boolean;
  slotStatus: "AVAILABLE" | "USED_THIS_CYCLE";
  totalJobsAllTime: number;
  recruiterCount: number;
  podHead: string | null;
  lastJobAssigned: LastJob | null;
}

interface CycleStatusSummary {
  totalPods: number;
  availableForAssignment: number;
  usedThisCycle: number;
  cycleProgressPercent: number;
  cycleComplete: boolean;
  status: "FRESH_CYCLE" | "IN_PROGRESS" | "CYCLE_COMPLETE_WILL_AUTO_RESET" | "NO_PODS";
}

export interface CycleStatusData {
  summary: CycleStatusSummary;
  pods: PodCycleEntry[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const STATUS_META: Record<
  CycleStatusSummary["status"],
  { label: string; className: string }
> = {
  FRESH_CYCLE: {
    label: "Fresh Cycle",
    className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  },
  IN_PROGRESS: {
    label: "In Progress",
    className: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  },
  CYCLE_COMPLETE_WILL_AUTO_RESET: {
    label: "Cycle Complete — Auto-Reset Pending",
    className: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  },
  NO_PODS: {
    label: "No Pods",
    className: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  },
};

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  data: CycleStatusData | null;
}

export default function PodCycleStatusPanel({ data }: Props) {
  if (!data) return null;

  const { summary, pods } = data;
  const meta = STATUS_META[summary.status] ?? STATUS_META.NO_PODS;
  const progress = Math.min(100, Math.max(0, summary.cycleProgressPercent));

  // Progress bar color
  const progressBarColor =
    summary.status === "FRESH_CYCLE"
      ? "bg-emerald-500"
      : summary.status === "IN_PROGRESS"
        ? "bg-amber-500"
        : summary.status === "CYCLE_COMPLETE_WILL_AUTO_RESET"
          ? "bg-red-500"
          : "bg-gray-400";

  return (
    <Card className="border border-gray-200 dark:border-neutral-700 bg-white dark:bg-slate-800 rounded-md shadow-none">
      <CardContent className="p-6 space-y-5">
        {/* ── Header ── */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-primary" />
            <h6 className="font-semibold text-lg text-neutral-900 dark:text-white">
              Pod Assignment Cycle Status
            </h6>
          </div>
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${meta.className}`}
          >
            {summary.status === "FRESH_CYCLE" && <CheckCircle2 className="h-3.5 w-3.5" />}
            {summary.status === "IN_PROGRESS" && <Clock className="h-3.5 w-3.5" />}
            {summary.status === "CYCLE_COMPLETE_WILL_AUTO_RESET" && (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            {meta.label}
          </span>
        </div>

        {/* ── Summary Stats ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            {
              icon: <Layers className="h-4 w-4" />,
              label: "Total Pods",
              value: summary.totalPods,
              color: "text-blue-600 dark:text-blue-400",
              bg: "bg-blue-50 dark:bg-blue-900/20",
            },
            {
              icon: <CheckCircle2 className="h-4 w-4" />,
              label: "Available",
              value: summary.availableForAssignment,
              color: "text-emerald-600 dark:text-emerald-400",
              bg: "bg-emerald-50 dark:bg-emerald-900/20",
            },
            {
              icon: <Clock className="h-4 w-4" />,
              label: "Used This Cycle",
              value: summary.usedThisCycle,
              color: "text-amber-600 dark:text-amber-400",
              bg: "bg-amber-50 dark:bg-amber-900/20",
            },
            {
              icon: <RefreshCw className="h-4 w-4" />,
              label: "Cycle Progress",
              value: `${progress}%`,
              color: "text-purple-600 dark:text-purple-400",
              bg: "bg-purple-50 dark:bg-purple-900/20",
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className={`flex items-center gap-3 p-3 rounded-lg ${stat.bg}`}
            >
              <span className={stat.color}>{stat.icon}</span>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground truncate">{stat.label}</p>
                <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Progress Bar ── */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Cycle Progress</span>
            <span>{progress}% complete</span>
          </div>
          <div className="h-2.5 w-full bg-gray-100 dark:bg-neutral-700 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${progressBarColor}`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* ── Per-pod Grid ── */}
        {pods.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Pod Slot Status
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {pods.map((pod) => {
                const available = pod.slotStatus === "AVAILABLE";
                return (
                  <div
                    key={pod.id}
                    className={`relative rounded-lg border p-4 space-y-2 transition-colors ${available
                        ? "border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-900/10"
                        : "border-orange-200 dark:border-orange-800 bg-orange-50/50 dark:bg-orange-900/10"
                      }`}
                  >
                    {/* Pod name + slot badge */}
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold text-sm text-neutral-900 dark:text-white leading-snug">
                        {pod.name}
                      </p>
                      <span
                        className={`shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${available
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300"
                            : "bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300"
                          }`}
                      >
                        {available ? (
                          <CheckCircle2 className="h-3 w-3" />
                        ) : (
                          <Clock className="h-3 w-3" />
                        )}
                        {available ? "Available" : "Used"}
                      </span>
                    </div>

                    {/* Pod meta */}
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" />
                        {pod.recruiterCount} recruiter{pod.recruiterCount !== 1 ? "s" : ""}
                      </span>
                      <span className="flex items-center gap-1">
                        <BriefcaseBusiness className="h-3.5 w-3.5" />
                        {pod.totalJobsAllTime} job{pod.totalJobsAllTime !== 1 ? "s" : ""} total
                      </span>
                    </div>

                    {pod.podHead && (
                      <p className="text-xs text-muted-foreground truncate">
                        <span className="font-medium">Pod Head:</span> {pod.podHead || "No Head Assigned"}
                      </p>
                    )}

                    {/* Last job assigned */}
                    {pod.lastJobAssigned ? (
                      <div className="pt-1 border-t border-current/10">
                        <p className="text-[11px] font-medium text-neutral-600 dark:text-neutral-400 truncate">
                          <CalendarCheck className="inline h-3 w-3 mr-1 -mt-0.5" />
                          Last: [{pod.lastJobAssigned.jobCode}]{" "}
                          {pod.lastJobAssigned.jobTitle}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {formatDate(pod.lastJobAssigned.assignedAt)}
                        </p>
                      </div>
                    ) : (
                      <p className="text-[11px] text-muted-foreground pt-1 border-t border-current/10">
                        No jobs assigned yet
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {pods.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No pods found. Create your first pod to start the assignment cycle.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
