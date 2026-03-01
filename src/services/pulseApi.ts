const API_BASE = "/api";

// ---- Market Intelligence ----

export interface MarketOverview {
  total_jobs: number;
  total_companies: number;
  avg_salary: number;
  total_remote: number;
  top_skills: { name: string; category: string; count: number }[];
  last_updated: string;
}

export interface SkillTrend {
  skill_name: string;
  category: string;
  data_points: { date: string; count: number }[];
  current_count: number;
  trend_direction: "rising" | "stable" | "declining";
}

export interface SalaryBenchmark {
  seniority_level: string;
  sample_size: number;
  min_salary: number;
  max_salary: number;
  median_salary: number;
}

export interface CompanyVelocity {
  company_name: string;
  job_count: number;
  recent_postings: number;
  avg_salary: number | null;
  trend: "accelerating" | "steady" | "slowing";
}

export interface LocationDemand {
  location: string;
  job_count: number;
  avg_salary: number | null;
  remote_count: number;
  top_skills: string[];
}

// ---- Matching ----

export interface MatchBreakdown {
  skill_match: number;
  experience_fit: number;
  salary_fit: number;
  location_fit: number;
  culture_fit: number;
  overall_score: number;
}

export interface MatchedJob {
  job_id: number;
  title: string;
  company: string;
  location: string;
  is_remote: boolean;
  salary_range: string | null;
  apply_link: string | null;
  employment_type: string | null;
  seniority_level: string | null;
  match_breakdown: MatchBreakdown;
  matching_skills: string[];
  missing_skills: string[];
}

// ---- Challenges ----

export interface TestCase {
  input: string;
  expected_output: string;
  is_hidden: boolean;
}

export interface CodingChallenge {
  id: number;
  title: string;
  description: string;
  difficulty: string;
  category: string;
  related_skills: string[];
  starter_code: Record<string, string>;
  test_cases: TestCase[];
  examples: { input: string; output: string; explanation: string }[];
  constraints: string[];
  solution_hints: string[];
}

// ---- API Functions ----

export async function fetchMarketOverview(): Promise<MarketOverview> {
  const res = await fetch(`/pulse/overview`);
  if (!res.ok) throw new Error("Failed to fetch market overview");
  return res.json();
}

export async function fetchSkillTrends(skills?: string[], days = 30): Promise<SkillTrend[]> {
  const params = new URLSearchParams({ days: String(days) });
  if (skills?.length) params.set("skills", skills.join(","));
  const res = await fetch(`/pulse/skills/trends?${params}`);
  if (!res.ok) throw new Error("Failed to fetch skill trends");
  return res.json();
}

export async function fetchSalaryBenchmarks(role?: string, location?: string): Promise<SalaryBenchmark[]> {
  const params = new URLSearchParams();
  if (role) params.set("role", role);
  if (location) params.set("location", location);
  const res = await fetch(`/pulse/salaries?${params}`);
  if (!res.ok) throw new Error("Failed to fetch salary benchmarks");
  return res.json();
}

export async function fetchCompanyVelocity(limit = 20): Promise<CompanyVelocity[]> {
  const res = await fetch(`/pulse/companies?limit=${limit}`);
  if (!res.ok) throw new Error("Failed to fetch company velocity");
  return res.json();
}

export async function fetchLocationDemand(limit = 20): Promise<LocationDemand[]> {
  const res = await fetch(`/pulse/locations?limit=${limit}`);
  if (!res.ok) throw new Error("Failed to fetch location demand");
  return res.json();
}

export async function fetchEmergingSkills(days = 14): Promise<SkillTrend[]> {
  const res = await fetch(`/pulse/emerging-skills?days=${days}`);
  if (!res.ok) throw new Error("Failed to fetch emerging skills");
  return res.json();
}

export async function fetchMatchedJobs(userLocalId: string, limit = 20): Promise<MatchedJob[]> {
  const params = new URLSearchParams({
    user_local_id: userLocalId,
    limit: String(limit),
  });
  const res = await fetch(`/matching/jobs?${params}`, { method: "POST" });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || "Failed to fetch matched jobs");
  }
  return res.json();
}

export async function generateChallenges(
  jobDescription: string,
  difficulty = "medium",
  count = 3,
  targetLanguage = "javascript"
): Promise<CodingChallenge[]> {
  const res = await fetch(`/challenges/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      job_description: jobDescription,
      difficulty,
      count,
      target_language: targetLanguage,
    }),
  });
  if (!res.ok) throw new Error("Failed to generate challenges");
  return res.json();
}

export async function fetchChallenge(id: number): Promise<CodingChallenge> {
  const res = await fetch(`/challenges/${id}`);
  if (!res.ok) throw new Error("Failed to fetch challenge");
  return res.json();
}

export async function triggerETL(queries?: string): Promise<{ message: string }> {
  const params = queries ? `?queries=${encodeURIComponent(queries)}` : "";
  const res = await fetch(`/pipeline/trigger${params}`, { method: "POST" });
  if (!res.ok) throw new Error("Failed to trigger ETL");
  return res.json();
}
