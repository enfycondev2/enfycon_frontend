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
  id: string;
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
  postedJobs: number;
  activeJobs: number;
  totalPositions: number;
  submissions: number;
  closures: number;
  closureRate: number;
}

interface AccountManagerProductivityTableProps {
  rows: AccountManagerTableRow[];
  isLoading?: boolean;
}

export default function AccountManagerProductivityTable({
  rows,
  isLoading = false
}: AccountManagerProductivityTableProps) {
  const [query, setQuery] = useState("");
  const [timeFilter, setTimeFilter] = useState<"all" | "day" | "week" | "month" | "quarter" | "year">("all");

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      const q = query.trim().toLowerCase();
      const matchesQuery =
        !q ||
        row.name.toLowerCase().includes(q) ||
        row.email.toLowerCase().includes(q);

      return matchesQuery;
    });
  }, [rows, query]);

  const clearFilters = () => {
    setQuery("");
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
            Time Range
          </label>
          <Select value={timeFilter} onValueChange={(v) => setTimeFilter(v as typeof timeFilter)}>
            <SelectTrigger className="w-[170px] h-10 bg-white dark:bg-slate-900 border-neutral-200 dark:border-slate-600 rounded-lg">
              <SelectValue placeholder="All Time" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="day">Today</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="quarter">This Quarter</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {(query || timeFilter !== "all") && (
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
              <TableHead className="bg-slate-100/80 dark:bg-slate-700/90 text-[13px] font-bold uppercase tracking-wider px-4 h-12 border-b border-neutral-200 dark:border-slate-600 text-start">
                Account Manager
              </TableHead>
              <TableHead className="bg-slate-100/80 dark:bg-slate-700/90 text-[13px] font-bold uppercase tracking-wider px-4 h-12 border-b border-neutral-200 dark:border-slate-600 text-center">
                Posted Jobs
              </TableHead>
              <TableHead className="bg-slate-100/80 dark:bg-slate-700/90 text-[13px] font-bold uppercase tracking-wider px-4 h-12 border-b border-neutral-200 dark:border-slate-600 text-center">
                Active
              </TableHead>
              <TableHead className="bg-slate-100/80 dark:bg-slate-700/90 text-[13px] font-bold uppercase tracking-wider px-4 h-12 border-b border-neutral-200 dark:border-slate-600 text-center">
                Position
              </TableHead>
              <TableHead className="bg-slate-100/80 dark:bg-slate-700/90 text-[13px] font-bold uppercase tracking-wider px-4 h-12 border-b border-neutral-200 dark:border-slate-600 text-center">
                Submission
              </TableHead>
              <TableHead className="bg-slate-100/80 dark:bg-slate-700/90 text-[13px] font-bold uppercase tracking-wider px-4 h-12 border-b border-neutral-200 dark:border-slate-600 text-center">
                Closure
              </TableHead>
              <TableHead className="bg-slate-100/80 dark:bg-slate-700/90 text-[13px] font-bold uppercase tracking-wider px-4 h-12 border-b border-neutral-200 dark:border-slate-600 text-center">
                Closure Rate
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
               <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  Loading productivity data...
                </TableCell>
               </TableRow>
            ) : filteredRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground italic">
                  No account manager data matches current filters.
                </TableCell>
              </TableRow>
            ) : (
              filteredRows.map((row, index) => {
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
                      <span className="font-semibold text-sm">{row.name}</span>
                      <span className="text-xs text-muted-foreground">{row.email}</span>
                    </div>
                  </TableCell>
                  <TableCell className="py-3 px-4 border-b border-neutral-200 dark:border-slate-600 text-center">
                    <Badge variant="outline" className="font-bold">{current.postedJobs}</Badge>
                  </TableCell>
                  <TableCell className="py-3 px-4 border-b border-neutral-200 dark:border-slate-600 text-center text-sm font-medium">
                    {current.activeJobs}
                  </TableCell>
                  <TableCell className="py-3 px-4 border-b border-neutral-200 dark:border-slate-600 text-center text-sm font-medium">
                    {current.totalPositions}
                  </TableCell>
                  <TableCell className="py-3 px-4 border-b border-neutral-200 dark:border-slate-600 text-center text-sm font-medium">
                    {current.submissions}
                  </TableCell>
                  <TableCell className="py-3 px-4 border-b border-neutral-200 dark:border-slate-600 text-center">
                    <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-none px-2">{current.closures}</Badge>
                  </TableCell>
                  <TableCell className="py-3 px-4 border-b border-neutral-200 dark:border-slate-600 text-center">
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-sm font-bold">{current.closureRate}%</span>
                      <div className="w-16 h-1.5 bg-neutral-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div 
                           className="h-full bg-blue-600 transition-all duration-500" 
                           style={{ width: `${Math.min(100, current.closureRate)}%` }}
                        />
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
                  );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
