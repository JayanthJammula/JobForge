import React, { useState, useEffect } from "react";
import { Search, MapPin, Briefcase, Loader2, RefreshCw } from "lucide-react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { jobApiService, JobApiResponse } from "../services/jobApi";

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

interface JobsPageProps {
  onJobClick: (jobId: string, jobData?: Job) => void;
  cachedJobs?: Job[];
  onJobsFetched?: (jobs: Job[]) => void;
}

// Helper function to transform API response to Job interface
const transformApiJobToJob = (apiJob: JobApiResponse): Job => {
  // Extract skills from job description (simple keyword matching)
  const commonSkills = ['React', 'JavaScript', 'TypeScript', 'Node.js', 'Python', 'Java', 'CSS', 'HTML', 'SQL', 'Git'];
  const skills = commonSkills.filter(skill =>
    apiJob.job_description.toLowerCase().includes(skill.toLowerCase())
  );

  // Determine if job is remote based on description
  const isRemote = apiJob.job_description.toLowerCase().includes('remote') ||
    apiJob.job_description.toLowerCase().includes('work from home');

  // Generate a mock match score (in real app, this would be calculated based on user profile)
  const matchScore = Math.floor(Math.random() * 30) + 70; // 70-100 range

  return {
    id: apiJob.job_id,
    title: apiJob.job_title,
    company: apiJob.employer_name,
    logo: `https://images.unsplash.com/photo-${Math.floor(Math.random() * 1000000000)}?w=100&h=100&fit=crop`, // Random placeholder
    location: `${apiJob.job_city}, ${apiJob.job_state}`,
    remote: isRemote,
    skills: skills.length > 0 ? skills : ['General Software Development'],
    description: apiJob.job_description,
    matchScore,
    applyLink: apiJob.job_apply_link,
    employmentType: apiJob.job_employment_type,
    salaryMin: apiJob.job_salary_min,
    salaryMax: apiJob.job_salary_max,
    salaryCurrency: apiJob.job_salary_currency,
    salaryPeriod: apiJob.job_salary_period
  };
};

export function JobsPage({ onJobClick, cachedJobs = [], onJobsFetched }: JobsPageProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [locationFilter, setLocationFilter] = useState("all");
  const [remoteFilter, setRemoteFilter] = useState("all");
  const [jobs, setJobs] = useState<Job[]>(cachedJobs);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch jobs from API
  const fetchJobs = async (query: string = "") => {
    setLoading(true);
    setError(null);

    try {
      const apiJobs = await jobApiService.searchJobs({
        query: query || "Software Engineer",
        page: 1,
        num_pages: 1,
        country: "us",
        date_posted: "today",
        job_requirements: "under_3_years_experience"
      });

      const transformedJobs = apiJobs.map(transformApiJobToJob);
      setJobs(transformedJobs);
      // Cache default results (no search term) in parent so they persist across navigation
      if (!query && onJobsFetched) {
        onJobsFetched(transformedJobs);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch jobs");
      console.error("Error fetching jobs:", err);
    } finally {
      setLoading(false);
    }
  };

  // Initial load — skip if we have cached jobs
  useEffect(() => {
    if (cachedJobs.length === 0) {
      fetchJobs();
    }
  }, []);

  // Debounced search — only triggers on user input
  useEffect(() => {
    if (searchTerm.trim()) {
      const timeoutId = setTimeout(() => {
        fetchJobs(searchTerm);
      }, 500);
      return () => clearTimeout(timeoutId);
    } else if (cachedJobs.length > 0) {
      // Restore cached jobs when search is cleared
      setJobs(cachedJobs);
    }
  }, [searchTerm]);

  const filteredJobs = jobs.filter(job => {
    const matchesRemote = remoteFilter === "all" ||
      (remoteFilter === "remote" && job.remote) ||
      (remoteFilter === "onsite" && !job.remote);
    return matchesRemote;
  });

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Search and Filters */}
      <div className="mb-8 space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by job title, company, or skills..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={remoteFilter} onValueChange={setRemoteFilter}>
            <SelectTrigger className="w-full md:w-48">
              <SelectValue placeholder="Work Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="remote">Remote Only</SelectItem>
              <SelectItem value="onsite">On-site Only</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="icon"
            onClick={() => { setSearchTerm(""); fetchJobs(); }}
            disabled={loading}
            title="Refresh Jobs"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Results Count */}
      <div className="mb-4 text-muted-foreground">
        {loading ? (
          <div className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Loading jobs...</span>
          </div>
        ) : (
          `${filteredJobs.length} ${filteredJobs.length === 1 ? 'job' : 'jobs'} found`
        )}
      </div>

      {/* Error State */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600">Error: {error}</p>
          <Button
            onClick={() => fetchJobs(searchTerm)}
            variant="outline"
            size="sm"
            className="mt-2"
          >
            Try Again
          </Button>
        </div>
      )}

      {/* Job List */}
      {!loading && !error && (
        <div className="space-y-2">
          {filteredJobs.map((job) => (
            <Card key={job.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  {/* Company Logo */}
                  <div className="flex-shrink-0">
                    <img
                      src={job.logo}
                      alt={job.company}
                      className="w-12 h-12 rounded-lg object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(job.company)}&background=random`;
                      }}
                    />
                  </div>

                  {/* Job Title */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-lg truncate">{job.title}</h3>
                    <p className="text-sm text-muted-foreground truncate">{job.company}</p>
                    {job.employmentType && (
                      <p className="text-xs text-muted-foreground">{job.employmentType}</p>
                    )}
                  </div>

                  {/* Location */}
                  <div className="flex items-center gap-2 text-muted-foreground min-w-0 flex-shrink-0">
                    <MapPin className="w-4 h-4" />
                    <span className="truncate">{job.location}</span>
                  </div>

                  {/* Employment Type */}
                  <div className="flex-shrink-0">
                    <Badge variant={job.remote ? "default" : "secondary"}>
                      {job.remote ? "Remote" : "On-site"}
                    </Badge>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex-shrink-0 flex gap-2">
                    <Button
                      onClick={() => onJobClick(job.id, job)}
                      size="sm"
                      variant="outline"
                    >
                      View Job
                    </Button>
                    <Button
                      size="sm"
                      asChild
                    >
                      <a
                        href={job.applyLink}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Apply
                      </a>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                  <div className="h-3 bg-gray-200 rounded w-24"></div>
                  <div className="h-6 bg-gray-200 rounded w-16"></div>
                  <div className="h-8 bg-gray-200 rounded w-16"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && filteredJobs.length === 0 && (
        <div className="text-center py-12">
          <Briefcase className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">No jobs found matching your criteria.</p>
        </div>
      )}
    </div>
  );
}
