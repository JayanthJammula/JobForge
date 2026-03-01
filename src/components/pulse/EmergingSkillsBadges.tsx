import { TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";

interface EmergingSkill {
  skill_name: string;
  current_count: number;
  growth_pct: number;
}

interface Props {
  skills: EmergingSkill[];
}

export function EmergingSkillsBadges({ skills }: Props) {
  if (!skills.length) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-green-500" />
          Emerging Skills
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {skills.map((skill) => (
            <Badge key={skill.skill_name} variant="default" className="text-sm py-1 px-3 gap-1">
              {skill.skill_name}
              <span className="text-xs opacity-75">+{skill.growth_pct}%</span>
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
