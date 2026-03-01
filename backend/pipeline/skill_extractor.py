"""Extract skills from job descriptions using keyword matching + optional Gemini fallback."""

import re
from typing import List, Tuple

# Comprehensive skill dictionary with categories
KNOWN_SKILLS: List[Tuple[str, str]] = [
    # Languages
    ("Python", "language"), ("JavaScript", "language"), ("TypeScript", "language"),
    ("Java", "language"), ("C++", "language"), ("C#", "language"),
    ("Go", "language"), ("Rust", "language"), ("Ruby", "language"),
    ("PHP", "language"), ("Swift", "language"), ("Kotlin", "language"),
    ("Scala", "language"), ("R", "language"), ("Perl", "language"),
    ("Dart", "language"), ("Elixir", "language"), ("Haskell", "language"),
    ("Lua", "language"), ("MATLAB", "language"), ("Objective-C", "language"),

    # Frontend
    ("React", "frontend"), ("Angular", "frontend"), ("Vue.js", "frontend"),
    ("Vue", "frontend"), ("Svelte", "frontend"), ("Next.js", "frontend"),
    ("Nuxt", "frontend"), ("Gatsby", "frontend"), ("jQuery", "frontend"),
    ("HTML", "frontend"), ("CSS", "frontend"), ("SASS", "frontend"),
    ("SCSS", "frontend"), ("Less", "frontend"), ("Tailwind", "frontend"),
    ("Bootstrap", "frontend"), ("Material UI", "frontend"),
    ("Webpack", "frontend"), ("Vite", "frontend"), ("Remix", "frontend"),
    ("Astro", "frontend"),

    # Backend
    ("Node.js", "backend"), ("Express", "backend"), ("FastAPI", "backend"),
    ("Django", "backend"), ("Flask", "backend"), ("Spring Boot", "backend"),
    ("Spring", "backend"), (".NET", "backend"), ("ASP.NET", "backend"),
    ("Rails", "backend"), ("Ruby on Rails", "backend"), ("Laravel", "backend"),
    ("NestJS", "backend"), ("Koa", "backend"), ("Gin", "backend"),
    ("Fiber", "backend"), ("Actix", "backend"), ("Phoenix", "backend"),

    # Database
    ("SQL", "database"), ("PostgreSQL", "database"), ("MySQL", "database"),
    ("MongoDB", "database"), ("Redis", "database"), ("SQLite", "database"),
    ("Oracle", "database"), ("SQL Server", "database"), ("DynamoDB", "database"),
    ("Cassandra", "database"), ("Neo4j", "database"), ("Elasticsearch", "database"),
    ("Firebase", "database"), ("Supabase", "database"), ("CouchDB", "database"),
    ("MariaDB", "database"),

    # DevOps / Cloud
    ("Docker", "devops"), ("Kubernetes", "devops"), ("AWS", "devops"),
    ("GCP", "devops"), ("Azure", "devops"), ("Terraform", "devops"),
    ("Ansible", "devops"), ("Jenkins", "devops"), ("GitHub Actions", "devops"),
    ("CI/CD", "devops"), ("GitLab CI", "devops"), ("CircleCI", "devops"),
    ("Nginx", "devops"), ("Linux", "devops"), ("Bash", "devops"),
    ("Helm", "devops"), ("ArgoCD", "devops"), ("Prometheus", "devops"),
    ("Grafana", "devops"), ("CloudFormation", "devops"),
    ("Vercel", "devops"), ("Netlify", "devops"), ("Heroku", "devops"),

    # Data / ML
    ("TensorFlow", "ai-ml"), ("PyTorch", "ai-ml"), ("Scikit-learn", "ai-ml"),
    ("Machine Learning", "ai-ml"), ("Deep Learning", "ai-ml"),
    ("Natural Language Processing", "ai-ml"), ("NLP", "ai-ml"),
    ("Computer Vision", "ai-ml"), ("Data Science", "ai-ml"),
    ("Pandas", "ai-ml"), ("NumPy", "ai-ml"), ("Spark", "ai-ml"),
    ("Hadoop", "ai-ml"), ("Kafka", "ai-ml"), ("Airflow", "ai-ml"),
    ("dbt", "ai-ml"), ("Snowflake", "ai-ml"), ("BigQuery", "ai-ml"),
    ("LLM", "ai-ml"), ("GPT", "ai-ml"), ("RAG", "ai-ml"),
    ("Langchain", "ai-ml"), ("OpenAI", "ai-ml"),

    # Tools / Practices
    ("Git", "tools"), ("REST", "tools"), ("RESTful", "tools"),
    ("GraphQL", "tools"), ("gRPC", "tools"), ("WebSocket", "tools"),
    ("Microservices", "tools"), ("API", "tools"),
    ("Agile", "tools"), ("Scrum", "tools"), ("Jira", "tools"),
    ("Figma", "tools"), ("Storybook", "tools"),

    # Testing
    ("Jest", "testing"), ("Cypress", "testing"), ("Playwright", "testing"),
    ("Selenium", "testing"), ("pytest", "testing"), ("JUnit", "testing"),
    ("Mocha", "testing"), ("Testing Library", "testing"),
    ("Unit Testing", "testing"), ("Integration Testing", "testing"),
    ("E2E Testing", "testing"),

    # Mobile
    ("React Native", "mobile"), ("Flutter", "mobile"), ("iOS", "mobile"),
    ("Android", "mobile"), ("SwiftUI", "mobile"), ("Jetpack Compose", "mobile"),

    # Soft Skills
    ("Communication", "soft_skill"), ("Leadership", "soft_skill"),
    ("Problem Solving", "soft_skill"), ("Teamwork", "soft_skill"),
    ("Project Management", "soft_skill"),
]

# Build a lookup for fast matching
_SKILL_PATTERNS = []
for skill_name, category in KNOWN_SKILLS:
    # Create a regex pattern with word boundaries
    escaped = re.escape(skill_name)
    pattern = re.compile(r'\b' + escaped + r'\b', re.IGNORECASE)
    _SKILL_PATTERNS.append((skill_name, category, pattern))


def extract_skills(description: str) -> List[dict]:
    """Extract skills from a job description using keyword matching.

    Returns list of {name, category} dicts.
    """
    if not description:
        return []

    found = []
    seen = set()

    for skill_name, category, pattern in _SKILL_PATTERNS:
        if pattern.search(description):
            lower = skill_name.lower()
            if lower not in seen:
                seen.add(lower)
                found.append({"name": skill_name, "category": category})

    return found


def detect_is_remote(description: str, title: str = "") -> bool:
    """Detect if a job posting is remote."""
    text = f"{title} {description}".lower()
    remote_keywords = ["remote", "work from home", "wfh", "telecommute",
                       "distributed team", "fully remote", "remote-first"]
    return any(kw in text for kw in remote_keywords)
