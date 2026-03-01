"""Deduplication via fingerprinting for job postings."""

import hashlib
import re


def normalize_text(text: str) -> str:
    """Normalize text for consistent fingerprinting."""
    if not text:
        return ""
    # Lowercase, strip whitespace, remove extra spaces
    text = text.lower().strip()
    text = re.sub(r'\s+', ' ', text)
    # Remove common suffixes like Inc, LLC, Corp, etc.
    text = re.sub(r'\b(inc|llc|corp|ltd|co|company|corporation|limited)\b\.?', '', text)
    text = text.strip()
    return text


def generate_fingerprint(title: str, company: str, location: str) -> str:
    """Generate a SHA256 fingerprint for deduplication.

    Combines normalized title + company + location into a unique hash.
    """
    normalized = "|".join([
        normalize_text(title or ""),
        normalize_text(company or ""),
        normalize_text(location or ""),
    ])
    return hashlib.sha256(normalized.encode("utf-8")).hexdigest()


def normalize_location(city: str, state: str, country: str = "US") -> str:
    """Standardize location to 'City, State' format."""
    parts = []
    if city and city.strip():
        parts.append(city.strip().title())
    if state and state.strip():
        parts.append(state.strip().upper() if len(state.strip()) <= 3 else state.strip().title())
    return ", ".join(parts) if parts else country or "Unknown"


def infer_seniority(title: str, description: str = "") -> str:
    """Infer seniority level from job title and description."""
    text = f"{title} {description}".lower()

    if any(kw in text for kw in ["intern", "internship", "co-op"]):
        return "intern"
    elif any(kw in text for kw in ["junior", "jr.", "jr ", "entry level", "entry-level", "associate"]):
        return "junior"
    elif any(kw in text for kw in ["staff", "staff+"]):
        return "staff"
    elif any(kw in text for kw in ["principal", "distinguished", "fellow"]):
        return "staff"
    elif any(kw in text for kw in ["lead", "tech lead", "team lead", "engineering lead"]):
        return "lead"
    elif any(kw in text for kw in ["senior", "sr.", "sr "]):
        return "senior"
    elif any(kw in text for kw in ["mid-level", "mid level", "intermediate"]):
        return "mid"
    else:
        return "mid"  # Default assumption
