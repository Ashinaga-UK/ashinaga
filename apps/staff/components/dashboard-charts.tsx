'use client';

import { useEffect, useState } from 'react';
import { Cell, Legend, Pie, PieChart } from 'recharts';
import type { RequestStats, Scholar, ScholarStats } from '../lib/api-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from './ui/chart';

interface DashboardChartsProps {
  scholarStats: ScholarStats | null;
  requestStats: RequestStats | null;
  scholars: Scholar[];
  scholarLoading: boolean;
  requestLoading: boolean;
  scholarsLoading: boolean;
}

const COLORS = {
  // Scholar status colors
  active: 'hsl(142, 76%, 36%)', // Emerald Green
  inactive: 'hsl(0, 0%, 63%)', // Muted Gray
  onHold: 'hsl(38, 92%, 50%)', // Amber Orange
  // Request status colors
  pending: 'hsl(38, 92%, 50%)', // Amber Orange
  approved: 'hsl(142, 76%, 36%)', // Emerald Green
  rejected: 'hsl(0, 84%, 60%)', // Red
  reviewed: 'hsl(271, 76%, 53%)', // Violet Purple
  commented: 'hsl(199, 89%, 48%)', // Sky Blue
};

// Year distribution colors
const YEAR_COLORS = [
  'hsl(175, 84%, 32%)', // Teal (Brand Accent)
  'hsl(271, 76%, 53%)', // Violet Purple
  'hsl(199, 89%, 48%)', // Sky Blue
  'hsl(38, 92%, 50%)',  // Amber Orange
  'hsl(346, 84%, 61%)', // Pink/Red
  'hsl(142, 76%, 36%)', // Emerald Green
];

export function DashboardCharts({
  scholarStats,
  requestStats,
  scholars,
  scholarLoading,
  requestLoading,
  scholarsLoading,
}: DashboardChartsProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="h-[300px] flex items-center justify-center border border-border/40">
          <span className="text-xs text-muted-foreground">Loading charts...</span>
        </Card>
        <Card className="h-[300px] flex items-center justify-center border border-border/40">
          <span className="text-xs text-muted-foreground">Loading charts...</span>
        </Card>
        <Card className="h-[300px] flex items-center justify-center border border-border/40">
          <span className="text-xs text-muted-foreground">Loading charts...</span>
        </Card>
      </div>
    );
  }

  // Scholar status chart data
  const scholarData = scholarStats
    ? [
        { name: 'Active', value: scholarStats.active, color: COLORS.active },
        { name: 'On Hold', value: scholarStats.onHold, color: COLORS.onHold },
        { name: 'Inactive', value: scholarStats.inactive, color: COLORS.inactive },
      ].filter((item) => item.value > 0)
    : [];

  // Request chart data
  const requestData = requestStats
    ? [
        { name: 'Pending', value: requestStats.pending, color: COLORS.pending },
        { name: 'Reviewed', value: requestStats.reviewed, color: COLORS.reviewed },
        { name: 'Approved', value: requestStats.approved, color: COLORS.approved },
        { name: 'Commented', value: requestStats.commented, color: COLORS.commented },
        { name: 'Rejected', value: requestStats.rejected, color: COLORS.rejected },
      ].filter((item) => item.value > 0)
    : [];

  // Calculate year distribution
  const YEAR_ORDER = ['Pre-University', 'Year 1', 'Year 2', 'Year 3', 'Year 4', 'Masters', 'PhD'];
  const yearCounts: Record<string, number> = {};
  for (const scholar of (scholars || [])) {
    if (!scholar) continue;
    const rawYear = scholar.year || 'Unknown';
    const rawYearTrim = rawYear.trim();
    const matched = YEAR_ORDER.find((y) => y.toLowerCase() === rawYearTrim.toLowerCase());

    let yearLabel = matched || rawYearTrim;
    if (!matched) {
      if (/^\d+$/.test(rawYearTrim)) {
        yearLabel = `Year ${rawYearTrim}`;
      } else {
        yearLabel = rawYearTrim.charAt(0).toUpperCase() + rawYearTrim.slice(1);
      }
    }

    yearCounts[yearLabel] = (yearCounts[yearLabel] || 0) + 1;
  }

  const sortedYears = Object.keys(yearCounts).sort((a, b) => {
    const idxA = YEAR_ORDER.indexOf(a);
    const idxB = YEAR_ORDER.indexOf(b);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return a.localeCompare(b, undefined, { numeric: true });
  });

  // Year distribution colors
  const yearData = sortedYears.map((year, idx) => ({
    name: year,
    value: yearCounts[year],
    color: YEAR_COLORS[idx % YEAR_COLORS.length] || 'hsl(175, 84%, 32%)',
  }));

  const scholarChartConfig = {
    value: {
      label: 'Scholars',
    },
    active: {
      label: 'Active',
      color: COLORS.active,
    },
    onHold: {
      label: 'On Hold',
      color: COLORS.onHold,
    },
    inactive: {
      label: 'Inactive',
      color: COLORS.inactive,
    },
  };

  const requestChartConfig = {
    value: {
      label: 'Requests',
    },
    pending: {
      label: 'Pending',
      color: COLORS.pending,
    },
    reviewed: {
      label: 'Reviewed',
      color: COLORS.reviewed,
    },
    approved: {
      label: 'Approved',
      color: COLORS.approved,
    },
    commented: {
      label: 'Commented',
      color: COLORS.commented,
    },
    rejected: {
      label: 'Rejected',
      color: COLORS.rejected,
    },
  };

  // Dynamically build year configuration
  const yearChartConfig: Record<string, { label: string; color?: string }> = {
    value: {
      label: 'Scholars',
    },
  };
  for (const item of yearData) {
    yearChartConfig[item.name] = {
      label: item.name,
      color: item.color,
    };
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Scholar Distribution */}
      <Card className="flex flex-col border border-border/40 bg-card/40 backdrop-blur-sm">
        <CardHeader className="items-center pb-0">
          <CardTitle className="text-sm font-semibold">Scholar Status</CardTitle>
          <CardDescription className="text-xs">Active vs. Inactive status</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 pb-4">
          {scholarLoading ? (
            <div className="h-[220px] flex items-center justify-center">
              <span className="text-xs text-muted-foreground">Loading...</span>
            </div>
          ) : scholarData.length === 0 ? (
            <div className="h-[220px] flex items-center justify-center">
              <span className="text-xs text-muted-foreground">No scholar data</span>
            </div>
          ) : (
            <div className="mx-auto aspect-square max-h-[220px] w-full">
              <ChartContainer config={scholarChartConfig} className="h-[220px] w-full">
                <PieChart>
                  <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                  <Pie
                    data={scholarData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={55}
                    outerRadius={75}
                    strokeWidth={2}
                    paddingAngle={3}
                  >
                    {scholarData.map((entry) => (
                      <Cell key={`cell-${entry.name}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    iconType="circle"
                    iconSize={8}
                    formatter={(value) => <span className="text-xs text-foreground/80">{value}</span>}
                  />
                </PieChart>
              </ChartContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Scholar Distribution by Year */}
      <Card className="flex flex-col border border-border/40 bg-card/40 backdrop-blur-sm">
        <CardHeader className="items-center pb-0">
          <CardTitle className="text-sm font-semibold">Scholars by Year</CardTitle>
          <CardDescription className="text-xs">Cohort breakdown</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 pb-4">
          {scholarsLoading ? (
            <div className="h-[220px] flex items-center justify-center">
              <span className="text-xs text-muted-foreground">Loading...</span>
            </div>
          ) : yearData.length === 0 ? (
            <div className="h-[220px] flex items-center justify-center">
              <span className="text-xs text-muted-foreground">No cohort data</span>
            </div>
          ) : (
            <div className="mx-auto aspect-square max-h-[220px] w-full">
              <ChartContainer config={yearChartConfig} className="h-[220px] w-full">
                <PieChart>
                  <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                  <Pie
                    data={yearData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={55}
                    outerRadius={75}
                    strokeWidth={2}
                    paddingAngle={3}
                  >
                    {yearData.map((entry) => (
                      <Cell key={`cell-${entry.name}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    iconType="circle"
                    iconSize={8}
                    formatter={(value) => <span className="text-xs text-foreground/80">{value}</span>}
                  />
                </PieChart>
              </ChartContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Request Breakdown */}
      <Card className="flex flex-col border border-border/40 bg-card/40 backdrop-blur-sm">
        <CardHeader className="items-center pb-0">
          <CardTitle className="text-sm font-semibold">Request Breakdown</CardTitle>
          <CardDescription className="text-xs">Scholar requirement status</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 pb-4">
          {requestLoading ? (
            <div className="h-[220px] flex items-center justify-center">
              <span className="text-xs text-muted-foreground">Loading...</span>
            </div>
          ) : requestData.length === 0 ? (
            <div className="h-[220px] flex items-center justify-center">
              <span className="text-xs text-muted-foreground">No request data</span>
            </div>
          ) : (
            <div className="mx-auto aspect-square max-h-[220px] w-full">
              <ChartContainer config={requestChartConfig} className="h-[220px] w-full">
                <PieChart>
                  <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                  <Pie
                    data={requestData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={55}
                    outerRadius={75}
                    strokeWidth={2}
                    paddingAngle={3}
                  >
                    {requestData.map((entry) => (
                      <Cell key={`cell-${entry.name}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    iconType="circle"
                    iconSize={8}
                    formatter={(value) => <span className="text-xs text-foreground/80">{value}</span>}
                  />
                </PieChart>
              </ChartContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
