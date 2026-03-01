import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Progress } from "../ui/progress";
import type { MatchBreakdown } from "../../services/pulseApi";

interface Props {
  breakdown: MatchBreakdown;
}

const dimensions = [
  { key: "skill_match" as const, label: "Skill Match", weight: "40%", icon: "🎯" },
  { key: "experience_fit" as const, label: "Experience Fit", weight: "20%", icon: "📊" },
  { key: "salary_fit" as const, label: "Salary Fit", weight: "15%", icon: "💰" },
  { key: "location_fit" as const, label: "Location Fit", weight: "15%", icon: "📍" },
  { key: "culture_fit" as const, label: "Culture Fit", weight: "10%", icon: "🏢" },
];

export function MatchBreakdownCard({ breakdown }: Props) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Match Breakdown</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {dimensions.map((dim) => {
          const value = breakdown[dim.key];
          return (
            <div key={dim.key}>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-muted-foreground">
                  {dim.label} <span className="text-xs opacity-60">({dim.weight})</span>
                </span>
                <span className="font-medium">{Math.round(value)}%</span>
              </div>
              <Progress value={value} className="h-2" />
            </div>
          );
        })}
        <div className="pt-2 border-t">
          <div className="flex items-center justify-between">
            <span className="font-medium">Overall Score</span>
            <span className="text-lg font-bold">
              {Math.round(breakdown.overall_score)}%
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
