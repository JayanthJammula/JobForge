import { MapPin, Briefcase, DollarSign, ExternalLink, Wifi } from "lucide-react";
import { Card, CardContent } from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { MatchScoreRing } from "./MatchScoreRing";
import type { MatchedJob } from "../../services/pulseApi";

interface Props {
  job: MatchedJob;
  onViewBreakdown: (job: MatchedJob) => void;
}

export function MatchedJobCard({ job, onViewBreakdown }: Props) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="pt-6">
        <div className="flex gap-4">
          {/* Score Ring */}
          <div className="flex-shrink-0">
            <MatchScoreRing score={job.match_breakdown.overall_score} />
          </div>

          {/* Job Info */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-base truncate">{job.title}</h3>
            <p className="text-sm text-muted-foreground">{job.company}</p>

            <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {job.location || "Not specified"}
              </span>
              {job.is_remote && (
                <span className="flex items-center gap-1 text-purple-500">
                  <Wifi className="w-3 h-3" />
                  Remote
                </span>
              )}
              {job.salary_range && (
                <span className="flex items-center gap-1">
                  <DollarSign className="w-3 h-3" />
                  {job.salary_range}
                </span>
              )}
              {job.seniority_level && (
                <span className="flex items-center gap-1">
                  <Briefcase className="w-3 h-3" />
                  {job.seniority_level}
                </span>
              )}
            </div>

            {/* Skills */}
            <div className="mt-3 flex flex-wrap gap-1">
              {job.matching_skills.slice(0, 5).map((skill) => (
                <Badge key={skill} variant="default" className="text-xs">
                  {skill}
                </Badge>
              ))}
              {job.missing_skills.slice(0, 3).map((skill) => (
                <Badge key={skill} variant="outline" className="text-xs opacity-60">
                  {skill}
                </Badge>
              ))}
            </div>

            {/* Actions */}
            <div className="flex gap-2 mt-3">
              <Button variant="outline" size="sm" onClick={() => onViewBreakdown(job)}>
                View Breakdown
              </Button>
              {job.apply_link && (
                <Button size="sm" asChild>
                  <a href={job.apply_link} target="_blank" rel="noopener noreferrer">
                    Apply <ExternalLink className="w-3 h-3 ml-1" />
                  </a>
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
