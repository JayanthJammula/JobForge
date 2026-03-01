import { Briefcase, Building2, DollarSign, Wifi } from "lucide-react";
import { Card, CardContent } from "../ui/card";

interface Props {
  totalJobs: number;
  totalCompanies: number;
  avgSalary: number;
  totalRemote: number;
}

export function MarketOverviewCards({ totalJobs, totalCompanies, avgSalary, totalRemote }: Props) {
  const cards = [
    { label: "Total Jobs", value: totalJobs.toLocaleString(), icon: Briefcase, color: "text-blue-500" },
    { label: "Companies", value: totalCompanies.toLocaleString(), icon: Building2, color: "text-green-500" },
    { label: "Avg Salary", value: `$${Math.round(avgSalary).toLocaleString()}`, icon: DollarSign, color: "text-yellow-500" },
    { label: "Remote Jobs", value: totalRemote.toLocaleString(), icon: Wifi, color: "text-purple-500" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {cards.map((card) => (
        <Card key={card.label}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{card.label}</p>
                <p className="text-2xl font-bold">{card.value}</p>
              </div>
              <card.icon className={`w-8 h-8 ${card.color} opacity-80`} />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
