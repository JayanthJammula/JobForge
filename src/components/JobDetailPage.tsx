import React, { useState, useEffect } from "react";
import { ArrowLeft, MapPin, Briefcase, FileText, Mic, Loader2, Code2 } from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Progress } from "./ui/progress";
import { jobApiService, JobAnalysisResponse } from "../services/jobApi";

interface Job {
  id: string;
  title: string;
  company: string;
  logo: string;
  location: string;
  remote: boolean;
  skills: string[];
  description: string;
  matchScore: number;
  applyLink?: string;
  employmentType?: string;
  salaryMin?: number | null;
  salaryMax?: number | null;
  salaryCurrency?: string | null;
  salaryPeriod?: string;
}

interface JobDetailPageProps {
  jobId: string;
  jobData?: Job;
  onBack: () => void;
  onStartInterview: (jobId: string, jobData?: Job) => void;
  onTailorResume: (jobId: string, jobData?: Job) => void;
  onStartCodingChallenge?: (jobId: string, jobData?: Job) => void;
}

export function JobDetailPage({ jobId, jobData, onBack, onStartInterview, onTailorResume, onStartCodingChallenge }: JobDetailPageProps) {
  const [jobAnalysis, setJobAnalysis] = useState<JobAnalysisResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Use jobData if available, otherwise fallback to basic info
  const job = jobData || {
    id: jobId,
    title: "Loading...",
    company: "Loading...",
    logo: "",
    location: "Loading...",
    remote: false,
    skills: [],
    description: "Loading job details...",
    matchScore: 0
  };

  // Fetch job analysis when component mounts or jobData changes
  useEffect(() => {
    if (jobData?.description) {
      fetchJobAnalysis(jobData.description);
    }
  }, [jobData]);

  const fetchJobAnalysis = async (jobDescription: string) => {
    setLoading(true);
    setError(null);

    try {
      const analysis = await jobApiService.analyzeJob(jobDescription);
      setJobAnalysis(analysis);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to analyze job");
      console.error("Error analyzing job:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Top Navigation */}
      <div className="bg-background border-b border-border sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" onClick={onBack} size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Jobs
          </Button>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Job Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Company Header */}
            <Card>
              <CardHeader>
                <div className="flex items-start gap-4">
                  <img
                    src={job.logo}
                    alt={job.company}
                    className="w-16 h-16 rounded-lg object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(job.company)}&background=random`;
                    }}
                  />
                  <div className="flex-1">
                    <CardTitle className="mb-2">{job.title}</CardTitle>
                    <CardDescription className="mb-3">{job.company}</CardDescription>
                    <div className="flex flex-wrap items-center gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-muted-foreground" />
                        <span>{job.location}</span>
                      </div>
                      {job.remote && (
                        <Badge variant="secondary">Remote</Badge>
                      )}
                      {job.employmentType && (
                        <Badge variant="outline">{job.employmentType}</Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>
            </Card>

            {/* Job Description */}
            <Card>
              <CardHeader>
                <CardTitle>Job Description</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {loading ? (
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                    <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4"></div>
                    <div className="h-4 bg-gray-200 rounded animate-pulse w-1/2"></div>
                  </div>
                ) : error ? (
                  <div className="text-red-600">
                    <p>Error loading job analysis: {error}</p>
                    <Button
                      onClick={() => jobData?.description && fetchJobAnalysis(jobData.description)}
                      variant="outline"
                      size="sm"
                      className="mt-2"
                    >
                      Try Again
                    </Button>
                  </div>
                ) : jobAnalysis ? (
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold mb-2">Summary</h4>
                      <p className="text-muted-foreground">{jobAnalysis.description_summary}</p>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">Full Description</h4>
                      <p className="whitespace-pre-line text-muted-foreground">
                        {job.description}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="whitespace-pre-line text-muted-foreground">
                    {job.description}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Requirements */}
            <Card>
              <CardHeader>
                <CardTitle>Requirements</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-2">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="flex gap-2">
                        <div className="w-2 h-2 bg-gray-200 rounded-full animate-pulse mt-2"></div>
                        <div className="h-4 bg-gray-200 rounded animate-pulse flex-1"></div>
                      </div>
                    ))}
                  </div>
                ) : jobAnalysis?.requirements ? (
                  <ul className="space-y-2">
                    {jobAnalysis.requirements.map((req: string, idx: number) => (
                      <li key={idx} className="flex gap-2">
                        <span className="text-primary mt-1">•</span>
                        <span className="text-muted-foreground">{req}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground">No specific requirements available.</p>
                )}
              </CardContent>
            </Card>

            {/* Skills */}
            <Card>
              <CardHeader>
                <CardTitle>Required Skills</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex flex-wrap gap-2">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="h-6 bg-gray-200 rounded animate-pulse w-20"></div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {(jobAnalysis?.required_skills || job.skills).map((skill: string, idx: number) => (
                      <Badge key={idx} variant="outline">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Actions */}
          <div className="space-y-6">
            {/* Resume Score */}
            <Card>
              <CardHeader>
                <CardTitle>Resume Match</CardTitle>
                <CardDescription>How well your resume matches this job</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <div className="text-4xl mb-2">
                    <span className={job.matchScore >= 85 ? "text-green-600" : "text-orange-600"}>
                      {job.matchScore}%
                    </span>
                  </div>
                  <Progress value={job.matchScore} className="h-2" />
                </div>
                <Button
                  className="w-full"
                  variant="outline"
                  onClick={() => onTailorResume(jobId, job)}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Tailor Resume
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  Customize your resume for this specific role
                </p>
              </CardContent>
            </Card>

            {/* Mock Interview */}
            <Card>
              <CardHeader>
                <CardTitle>AI Mock Interview</CardTitle>
                <CardDescription>Practice this role with AI-driven interviews</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                  <div className="flex items-start gap-2">
                    <Mic className="w-4 h-4 mt-1 text-primary" />
                    <div className="text-sm text-muted-foreground">
                      Get real-time feedback on your answers, technical skills, and communication style.
                    </div>
                  </div>
                </div>
                <Button
                  className="w-full"
                  onClick={() => onStartInterview(jobId, job)}
                >
                  <Briefcase className="w-4 h-4 mr-2" />
                  Start Mock Interview
                </Button>
              </CardContent>
            </Card>

            {/* Coding Challenge */}
            {onStartCodingChallenge && (
              <Card>
                <CardHeader>
                  <CardTitle>Coding Practice</CardTitle>
                  <CardDescription>LeetCode-style challenges tailored to this role</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                    <div className="flex items-start gap-2">
                      <Code2 className="w-4 h-4 mt-1 text-primary" />
                      <div className="text-sm text-muted-foreground">
                        Practice coding problems that match this job's tech stack and difficulty level.
                      </div>
                    </div>
                  </div>
                  <Button
                    className="w-full"
                    variant="outline"
                    onClick={() => onStartCodingChallenge(jobId, job)}
                  >
                    <Code2 className="w-4 h-4 mr-2" />
                    Practice Coding
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Quick Apply */}
            <Card>
              <CardHeader>
                <CardTitle>Ready to Apply?</CardTitle>
              </CardHeader>
              <CardContent>
                {job.applyLink ? (
                  <Button className="w-full" variant="default" asChild>
                    <a
                      href={job.applyLink}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Apply Now
                    </a>
                  </Button>
                ) : (
                  <Button className="w-full" variant="default" disabled>
                    Apply Now
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
