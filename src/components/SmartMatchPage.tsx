import { useState, useEffect } from "react";
import { ArrowLeft, Loader2, AlertCircle } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { MatchedJobCard } from "./matching/MatchedJobCard";
import { MatchBreakdownCard } from "./matching/MatchBreakdownCard";
import { getUserLocalId } from "../lib/userLocalId";
import { fetchMatchedJobs, type MatchedJob } from "../services/pulseApi";

interface Props {
  onBack: () => void;
  onGoToProfile: () => void;
}

export function SmartMatchPage({ onBack, onGoToProfile }: Props) {
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState<MatchedJob[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedJob, setSelectedJob] = useState<MatchedJob | null>(null);

  const loadMatches = async () => {
    setLoading(true);
    setError(null);
    try {
      const localId = getUserLocalId();
      const matched = await fetchMatchedJobs(localId, 30);
      setJobs(matched);
    } catch (e: any) {
      setError(e.message || "Failed to load matches");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMatches();
  }, []);

  const isProfileError = error?.includes("Profile not found");

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Smart Match</h1>
          <p className="text-sm text-muted-foreground">
            Jobs ranked by how well they match your profile
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          <span className="ml-3 text-muted-foreground">Computing matches...</span>
        </div>
      ) : isProfileError ? (
        <Card>
          <CardContent className="py-12 text-center">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-yellow-500" />
            <h3 className="text-lg font-semibold mb-2">Complete Your Profile First</h3>
            <p className="text-muted-foreground mb-4">
              To get personalized job matches, you need to add your skills, experience, and preferences to your profile.
            </p>
            <Button onClick={onGoToProfile}>Go to Profile</Button>
          </CardContent>
        </Card>
      ) : error ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-destructive mb-4">{error}</p>
            <p className="text-sm text-muted-foreground mb-4">
              Make sure the ETL pipeline has been run to populate job data.
            </p>
            <Button variant="outline" onClick={loadMatches}>Retry</Button>
          </CardContent>
        </Card>
      ) : jobs.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">
              No matching jobs found. Try updating your profile or fetching new job data from Market Pulse.
            </p>
            <Button variant="outline" onClick={onGoToProfile}>Update Profile</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {jobs.length} jobs matched, sorted by relevance
          </p>
          {jobs.map((job) => (
            <MatchedJobCard
              key={job.job_id}
              job={job}
              onViewBreakdown={setSelectedJob}
            />
          ))}
        </div>
      )}

      {/* Breakdown Dialog */}
      <Dialog open={!!selectedJob} onOpenChange={() => setSelectedJob(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedJob?.title}</DialogTitle>
            <p className="text-sm text-muted-foreground">{selectedJob?.company}</p>
          </DialogHeader>
          {selectedJob && (
            <div className="space-y-4">
              <MatchBreakdownCard breakdown={selectedJob.match_breakdown} />
              {selectedJob.matching_skills.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-1 text-green-600">Matching Skills</p>
                  <p className="text-sm text-muted-foreground">{selectedJob.matching_skills.join(", ")}</p>
                </div>
              )}
              {selectedJob.missing_skills.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-1 text-orange-500">Skills to Develop</p>
                  <p className="text-sm text-muted-foreground">{selectedJob.missing_skills.join(", ")}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
