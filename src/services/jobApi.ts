export interface JobApiResponse {
    job_id: string;
    job_title: string;
    employer_name: string;
    job_description: string;
    job_city: string;
    job_state: string;
    job_apply_link: string;
    job_employment_type: string;
    job_salary_min: number | null;
    job_salary_max: number | null;
    job_salary_currency: string | null;
    job_salary_period: string;
}

export interface JobSearchParams {
    query?: string;
    page?: number;
    num_pages?: number;
    country?: string;
    date_posted?: string;
    job_requirements?: string;
}

export interface JobAnalysisRequest {
    job_description: string;
}

export interface JobAnalysisResponse {
    description_summary: string;
    requirements: string[];
    required_skills: string[];
}

export interface InterviewQuestionRequest {
    job_description: string;
    resume: string;
    job_title: string;
    difficulty: string;
}

export interface CodingDetails {
    difficulty: string;
    target_language: string;
    constraints: string[];
    examples: string[];
}

export interface InterviewQuestion {
    question_id: string;
    kind: string;
    text: string;
    rationale: string;
    rubric: string[];
    coding?: CodingDetails;
    user_response: string;
}

export interface InterviewQuestionsResponse {
    job_title: string;
    summary: string;
    questions: InterviewQuestion[];
}

export class JobApiService {
    private baseUrl = 'http://localhost:8000';

    async searchJobs(params: JobSearchParams = {}): Promise<JobApiResponse[]> {
        const searchParams = new URLSearchParams();

        // Set default values
        const {
            query = '',
            page = 1,
            num_pages = 1,
            country = 'us',
            date_posted = 'today',
            job_requirements = 'under_3_years_experience'
        } = params;

        searchParams.append('query', query);
        searchParams.append('page', page.toString());
        searchParams.append('num_pages', num_pages.toString());
        searchParams.append('country', country);
        searchParams.append('date_posted', date_posted);
        searchParams.append('job_requirements', job_requirements);

        try {
            const response = await fetch(`${this.baseUrl}/jobs?${searchParams.toString()}`, {
                method: 'GET',
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return Array.isArray(data) ? data : [];
        } catch (error) {
            console.error('Error fetching jobs:', error);
            throw error;
        }
    }

    async analyzeJob(jobDescription: string): Promise<JobAnalysisResponse> {
        try {
            const response = await fetch(`${this.baseUrl}/analysis/job`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    job_description: jobDescription
                }),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error analyzing job:', error);
            throw error;
        }
    }

    async getInterviewQuestions(params: InterviewQuestionRequest): Promise<InterviewQuestionsResponse> {
        try {
            const response = await fetch(`${this.baseUrl}/questions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(params),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error fetching interview questions:', error);
            throw error;
        }
    }
}

export const jobApiService = new JobApiService();
