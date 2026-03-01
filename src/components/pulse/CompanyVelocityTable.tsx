import { TrendingUp, Minus, TrendingDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import type { CompanyVelocity } from "../../services/pulseApi";

interface Props {
  companies: CompanyVelocity[];
}

const trendIcon = (trend: string) => {
  switch (trend) {
    case "accelerating": return <TrendingUp className="w-4 h-4 text-green-500" />;
    case "slowing": return <TrendingDown className="w-4 h-4 text-red-500" />;
    default: return <Minus className="w-4 h-4 text-yellow-500" />;
  }
};

const trendVariant = (trend: string) => {
  switch (trend) {
    case "accelerating": return "default" as const;
    case "slowing": return "destructive" as const;
    default: return "secondary" as const;
  }
};

export function CompanyVelocityTable({ companies }: Props) {
  if (!companies.length) {
    return (
      <Card>
        <CardHeader><CardTitle>Top Hiring Companies</CardTitle></CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            No company data available yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Hiring Companies</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="py-3 px-2 font-medium">#</th>
                <th className="py-3 px-2 font-medium">Company</th>
                <th className="py-3 px-2 font-medium text-right">Openings</th>
                <th className="py-3 px-2 font-medium text-right">This Week</th>
                <th className="py-3 px-2 font-medium text-right">Avg Salary</th>
                <th className="py-3 px-2 font-medium">Trend</th>
              </tr>
            </thead>
            <tbody>
              {companies.map((c, i) => (
                <tr key={c.company_name} className="border-b last:border-0 hover:bg-muted/50">
                  <td className="py-3 px-2 text-muted-foreground">{i + 1}</td>
                  <td className="py-3 px-2 font-medium">{c.company_name}</td>
                  <td className="py-3 px-2 text-right">{c.job_count}</td>
                  <td className="py-3 px-2 text-right">{c.recent_postings}</td>
                  <td className="py-3 px-2 text-right">
                    {c.avg_salary ? `$${Math.round(c.avg_salary).toLocaleString()}` : "—"}
                  </td>
                  <td className="py-3 px-2">
                    <Badge variant={trendVariant(c.trend)} className="gap-1">
                      {trendIcon(c.trend)}
                      {c.trend}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
