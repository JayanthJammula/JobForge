import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import type { SkillTrend } from "../../services/pulseApi";

interface Props {
  trends: SkillTrend[];
}

const COLORS = [
  "#3b82f6", "#ef4444", "#22c55e", "#f59e0b", "#8b5cf6",
  "#ec4899", "#06b6d4", "#f97316", "#14b8a6", "#6366f1",
];

export function SkillTrendsChart({ trends }: Props) {
  if (!trends.length) {
    return (
      <Card>
        <CardHeader><CardTitle>Skill Demand Trends</CardTitle></CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            No trend data yet. Run the ETL pipeline to populate analytics.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Build chart data from trends (merge by date)
  const dateMap = new Map<string, Record<string, number>>();
  for (const trend of trends) {
    for (const point of trend.data_points) {
      if (!dateMap.has(point.date)) dateMap.set(point.date, {});
      dateMap.get(point.date)![trend.skill_name] = point.count;
    }
  }

  const data = Array.from(dateMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, values]) => ({ date, ...values }));

  // If only one data point, show as bar-like display
  const skillNames = trends.map((t) => t.skill_name);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Skill Demand Trends</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="date" fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip />
              <Legend />
              {skillNames.slice(0, 10).map((name, i) => (
                <Line
                  key={name}
                  type="monotone"
                  dataKey={name}
                  stroke={COLORS[i % COLORS.length]}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
