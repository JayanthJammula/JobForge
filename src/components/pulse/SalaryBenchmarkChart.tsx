import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import type { SalaryBenchmark } from "../../services/pulseApi";

interface Props {
  benchmarks: SalaryBenchmark[];
}

const SENIORITY_ORDER = ["intern", "junior", "mid", "senior", "lead", "staff", "unknown"];

export function SalaryBenchmarkChart({ benchmarks }: Props) {
  if (!benchmarks.length) {
    return (
      <Card>
        <CardHeader><CardTitle>Salary Benchmarks</CardTitle></CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            No salary data available yet. Run the ETL pipeline to populate data.
          </p>
        </CardContent>
      </Card>
    );
  }

  const data = [...benchmarks]
    .sort((a, b) => SENIORITY_ORDER.indexOf(a.seniority_level) - SENIORITY_ORDER.indexOf(b.seniority_level))
    .map((b) => ({
      level: b.seniority_level.charAt(0).toUpperCase() + b.seniority_level.slice(1),
      min: Math.round(b.min_salary / 1000),
      median: Math.round(b.median_salary / 1000),
      max: Math.round(b.max_salary / 1000),
      sample: b.sample_size,
    }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Salary Benchmarks by Seniority (in $K)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="level" fontSize={12} />
              <YAxis fontSize={12} tickFormatter={(v) => `$${v}K`} />
              <Tooltip formatter={(value: number) => `$${value}K`} />
              <Legend />
              <Bar dataKey="min" fill="#94a3b8" name="Min" radius={[2, 2, 0, 0]} />
              <Bar dataKey="median" fill="#3b82f6" name="Median" radius={[2, 2, 0, 0]} />
              <Bar dataKey="max" fill="#22c55e" name="Max" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
