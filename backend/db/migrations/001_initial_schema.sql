-- JobPulse Database Schema
-- Run: psql -U postgres -d jobpulse -f 001_initial_schema.sql

-- ============================================
-- TABLE: jobs (aggregated, deduplicated job data)
-- ============================================
CREATE TABLE IF NOT EXISTS jobs (
    id              SERIAL PRIMARY KEY,
    jsearch_job_id  TEXT,
    fingerprint     TEXT UNIQUE NOT NULL,
    title           TEXT NOT NULL,
    title_normalized TEXT NOT NULL,
    company         TEXT NOT NULL,
    company_normalized TEXT NOT NULL,
    description     TEXT,
    city            TEXT,
    state           TEXT,
    country         TEXT DEFAULT 'US',
    location_normalized TEXT,
    is_remote       BOOLEAN DEFAULT FALSE,
    employment_type TEXT,
    salary_min      NUMERIC(12,2),
    salary_max      NUMERIC(12,2),
    salary_annual_min NUMERIC(12,2),
    salary_annual_max NUMERIC(12,2),
    salary_currency TEXT DEFAULT 'USD',
    salary_period   TEXT,
    apply_link      TEXT,
    seniority_level TEXT,
    date_posted     DATE,
    first_seen_at   TIMESTAMPTZ DEFAULT NOW(),
    last_seen_at    TIMESTAMPTZ DEFAULT NOW(),
    is_active       BOOLEAN DEFAULT TRUE,
    raw_data        JSONB,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_jobs_fingerprint ON jobs(fingerprint);
CREATE INDEX IF NOT EXISTS idx_jobs_company_normalized ON jobs(company_normalized);
CREATE INDEX IF NOT EXISTS idx_jobs_first_seen ON jobs(first_seen_at);
CREATE INDEX IF NOT EXISTS idx_jobs_last_seen ON jobs(last_seen_at);
CREATE INDEX IF NOT EXISTS idx_jobs_seniority ON jobs(seniority_level);
CREATE INDEX IF NOT EXISTS idx_jobs_location ON jobs(location_normalized);
CREATE INDEX IF NOT EXISTS idx_jobs_is_active ON jobs(is_active);

-- ============================================
-- TABLE: skills (master skill list)
-- ============================================
CREATE TABLE IF NOT EXISTS skills (
    id          SERIAL PRIMARY KEY,
    name        TEXT UNIQUE NOT NULL,
    name_lower  TEXT UNIQUE NOT NULL,
    category    TEXT,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_skills_name_lower ON skills(name_lower);
CREATE INDEX IF NOT EXISTS idx_skills_category ON skills(category);

-- ============================================
-- TABLE: job_skills (many-to-many)
-- ============================================
CREATE TABLE IF NOT EXISTS job_skills (
    job_id      INT REFERENCES jobs(id) ON DELETE CASCADE,
    skill_id    INT REFERENCES skills(id) ON DELETE CASCADE,
    is_required BOOLEAN DEFAULT TRUE,
    PRIMARY KEY (job_id, skill_id)
);

CREATE INDEX IF NOT EXISTS idx_job_skills_skill ON job_skills(skill_id);

-- ============================================
-- TABLE: analytics_snapshots (daily aggregates)
-- ============================================
CREATE TABLE IF NOT EXISTS analytics_snapshots (
    id              SERIAL PRIMARY KEY,
    snapshot_date   DATE NOT NULL,
    metric_type     TEXT NOT NULL,
    dimension_key   TEXT NOT NULL,
    dimension_value JSONB NOT NULL,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(snapshot_date, metric_type, dimension_key)
);

CREATE INDEX IF NOT EXISTS idx_snapshots_date ON analytics_snapshots(snapshot_date);
CREATE INDEX IF NOT EXISTS idx_snapshots_type ON analytics_snapshots(metric_type);

-- ============================================
-- TABLE: user_profiles (server-side persistence)
-- ============================================
CREATE TABLE IF NOT EXISTS user_profiles (
    id                      SERIAL PRIMARY KEY,
    local_id                TEXT UNIQUE NOT NULL,
    name                    TEXT,
    email                   TEXT,
    phone                   TEXT,
    location                TEXT,
    title                   TEXT,
    bio                     TEXT,
    skills                  TEXT[] DEFAULT '{}',
    experience_years        INT DEFAULT 0,
    salary_expectation_min  NUMERIC(12,2),
    salary_expectation_max  NUMERIC(12,2),
    preferred_locations     TEXT[] DEFAULT '{}',
    remote_preference       TEXT DEFAULT 'any',
    preferred_seniority     TEXT DEFAULT 'any',
    preferred_industries    TEXT[] DEFAULT '{}',
    resume_text             TEXT,
    created_at              TIMESTAMPTZ DEFAULT NOW(),
    updated_at              TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_profiles_local_id ON user_profiles(local_id);

-- ============================================
-- TABLE: coding_challenges (AI-generated problems)
-- ============================================
CREATE TABLE IF NOT EXISTS coding_challenges (
    id              SERIAL PRIMARY KEY,
    title           TEXT NOT NULL,
    description     TEXT NOT NULL,
    difficulty      TEXT NOT NULL,
    category        TEXT,
    related_skills  TEXT[] DEFAULT '{}',
    starter_code    JSONB DEFAULT '{}',
    test_cases      JSONB NOT NULL,
    solution_hints  TEXT[] DEFAULT '{}',
    constraints     TEXT[] DEFAULT '{}',
    examples        JSONB DEFAULT '[]',
    generated_for_job_id INT REFERENCES jobs(id),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_challenges_difficulty ON coding_challenges(difficulty);
CREATE INDEX IF NOT EXISTS idx_challenges_category ON coding_challenges(category);

-- ============================================
-- TABLE: etl_runs (pipeline tracking)
-- ============================================
CREATE TABLE IF NOT EXISTS etl_runs (
    id                  SERIAL PRIMARY KEY,
    run_type            TEXT NOT NULL,
    status              TEXT NOT NULL,
    started_at          TIMESTAMPTZ DEFAULT NOW(),
    completed_at        TIMESTAMPTZ,
    records_processed   INT DEFAULT 0,
    error_message       TEXT,
    metadata            JSONB DEFAULT '{}'
);
