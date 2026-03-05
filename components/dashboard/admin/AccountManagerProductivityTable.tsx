"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, X } from "lucide-react";

export interface AccountManagerTableRow {
  email: string;
  name: string;
  metrics: {
    all: AccountManagerMetrics;
    day: AccountManagerMetrics;
    week: AccountManagerMetrics;
    month: AccountManagerMetrics;
    quarter: AccountManagerMetrics;
    year: AccountManagerMetrics;
  };
}

interface AccountManagerMetrics {
  jobs: number;
  active: number;
  filled: number;
  blocked: number;
  fillRate: number;
}

interface AccountManagerProductivityTableProps {
  rows: AccountManagerTableRow[];
}

export default function AccountManagerProductivityTable({
  rows,
}: AccountManagerProductivityTableProps) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [timeFilter, setTimeFilter] = useState<"all" | "day" | "week" | "month" | "quarter" | "year">("all");

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      const q = query.trim().toLowerCase();
      const matchesQuery =
        !q ||
        row.name.toLowerCase().includes(q) ||
        row.email.toLowerCase().includes(q);

      const current = row.metrics[timeFilter];
      let matchesStatus = true;
      if (statusFilter === "active") matchesStatus = current.active > 0;
      if (statusFilter === "filled") matchesStatus = current.filled > 0;
      if (statusFilter === "on-hold") matchesStatus = current.blocked > 0;
      if (statusFilter === "no-open") matchesStatus = current.active === 0;

      return matchesQuery && matchesStatus;
    });
  }, [rows, query, statusFilter, timeFilter]);

  const clearFilters = () => {
    setQuery("");
    setStatusFilter("all");
    setTimeFilter("all");
  };

  return (
    <div className="space-y-4">
      <div className="bg-neutral-50 dark:bg-slate-800/40 p-4 rounded-xl border border-neutral-200 dark:border-slate-700 flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-[220px] flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider ml-1">
            Search
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
            <Input
              placeholder="Name or email..."
              className="pl-9 h-10 bg-white dark:bg-slate-900 border-neutral-200 dark:border-slate-600 rounded-lg"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider ml-1">
            Status
          </label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[170px] h-10 bg-white dark:bg-slate-900 border-neutral-200 dark:border-slate-600 rounded-lg">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="active">Has Active Jobs</SelectItem>
              <SelectItem value="filled">Has Filled Jobs</SelectItem>
              <SelectItem value="on-hold">Has On Hold Jobs</SelectItem>
              <SelectItem value="no-open">No Open Jobs</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider ml-1">
            Time Range
          </label>
          <Select value={timeFilter} onValueChange={(v) => setTimeFilter(v as typeof timeFilter)}>
            <SelectTrigger className="w-[170px] h-10 bg-white dark:bg-slate-900 border-neutral-200 dark:border-slate-600 rounded-lg">
              <SelectValue placeholder="All Time" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="day">Daily</SelectItem>
              <SelectItem value="week">Weekly</SelectItem>
              <SelectItem value="month">Monthly</SelectItem>
              <SelectItem value="quarter">Quarterly</SelectItem>
              <SelectItem value="year">Yearly</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {(query || statusFilter !== "all" || timeFilter !== "all") && (
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 text-neutral-500 hover:text-destructive hover:bg-destructive/10"
            onClick={clearFilters}
            title="Clear Filters"
          >
            <X className="h-5 w-5" />
          </Button>
        )}
      </div>

      <div className="rounded-lg border border-neutral-200 dark:border-slate-600 overflow-hidden bg-white dark:bg-slate-900/40">
        <Table className="table-grid-lines table-auto border-spacing-0 border-separate min-w-full">
          <TableHeader>
            <TableRow className="border-0">
              <TableHead className="bg-slate-100/80 dark:bg-slate-700/90 text-base px-4 h-12 border-b border-neutral-200 dark:border-slate-600 text-start">
                Account Manager
              </TableHead>
              <TableHead className="bg-slate-100/80 dark:bg-slate-700/90 text-base px-4 h-12 border-b border-neutral-200 dark:border-slate-600 text-center">
                Posted Jobs
              </TableHead>
              <TableHead className="bg-slate-100/80 dark:bg-slate-700/90 text-base px-4 h-12 border-b border-neutral-200 dark:border-slate-600 text-center">
                Active
              </TableHead>
              <TableHead className="bg-slate-100/80 dark:bg-slate-700/90 text-base px-4 h-12 border-b border-neutral-200 dark:border-slate-600 text-center">
                Filled
              </TableHead>
              <TableHead className="bg-slate-100/80 dark:bg-slate-700/90 text-base px-4 h-12 border-b border-neutral-200 dark:border-slate-600 text-center">
                On Hold
              </TableHead>
              <TableHead className="bg-slate-100/80 dark:bg-slate-700/90 text-base px-4 h-12 border-b border-neutral-200 dark:border-slate-600 text-center">
                Fill Rate
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground italic">
                  No account manager data matches current filters.
                </TableCell>
              </TableRow>
            ) : (
              filteredRows.map((row, index) => (
                (() => {
                  const current = row.metrics[timeFilter];
                  return (
                <TableRow
                  key={row.email}
                  className={`transition-colors ${
                    index % 2 === 0
                      ? "bg-white dark:bg-slate-900/20 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                      : "bg-slate-50/70 dark:bg-slate-800/35 hover:bg-slate-100/70 dark:hover:bg-slate-800/75"
                  }`}
                >
                  <TableCell className="py-3 px-4 border-b border-neutral-200 dark:border-slate-600 text-start">
                    <div className="flex flex-col">
                      <span className="font-medium text-sm">{row.name}</span>
                      <span className="text-xs text-muted-foreground">{row.email}</span>
                    </div>
                  </TableCell>
                  <TableCell className="py-3 px-4 border-b border-neutral-200 dark:border-slate-600 text-center">
                    <Badge variant="secondary">{current.jobs}</Badge>
                  </TableCell>
                  <TableCell className="py-3 px-4 border-b border-neutral-200 dark:border-slate-600 text-center">
                    {current.active}
                  </TableCell>
                  <TableCell className="py-3 px-4 border-b border-neutral-200 dark:border-slate-600 text-center">
                    {current.filled}
                  </TableCell>
                  <TableCell className="py-3 px-4 border-b border-neutral-200 dark:border-slate-600 text-center">
                    {current.blocked}
                  </TableCell>
                  <TableCell className="py-3 px-4 border-b border-neutral-200 dark:border-slate-600 text-center">
                    {current.fillRate}%
                  </TableCell>
                </TableRow>
                  );
                })()
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
