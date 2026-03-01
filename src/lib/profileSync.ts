import { getUserLocalId } from "./userLocalId";

export interface ExtendedProfile {
  name: string;
  email: string;
  phone: string;
  location: string;
  title: string;
  bio: string;
  skills: string[];
  experienceYears: number;
  salaryExpectationMin: number | null;
  salaryExpectationMax: number | null;
  preferredLocations: string[];
  remotePreference: string;
  preferredSeniority: string;
}

const API_BASE = "/api";

export async function syncProfileToBackend(profile: ExtendedProfile): Promise<void> {
  const localId = getUserLocalId();
  try {
    await fetch(`/profiles`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        local_id: localId,
        name: profile.name,
        email: profile.email,
        phone: profile.phone,
        location: profile.location,
        title: profile.title,
        bio: profile.bio,
        skills: profile.skills,
        experience_years: profile.experienceYears,
        salary_expectation_min: profile.salaryExpectationMin,
        salary_expectation_max: profile.salaryExpectationMax,
        preferred_locations: profile.preferredLocations,
        remote_preference: profile.remotePreference,
        preferred_seniority: profile.preferredSeniority,
      }),
    });
  } catch (e) {
    console.warn("Profile sync failed (backend may be unavailable):", e);
  }
}

export async function fetchProfileFromBackend(): Promise<ExtendedProfile | null> {
  const localId = getUserLocalId();
  try {
    const res = await fetch(`/profiles/${localId}`);
    if (!res.ok) return null;
    const data = await res.json();
    return {
      name: data.name || "",
      email: data.email || "",
      phone: data.phone || "",
      location: data.location || "",
      title: data.title || "",
      bio: data.bio || "",
      skills: data.skills || [],
      experienceYears: data.experience_years || 0,
      salaryExpectationMin: data.salary_expectation_min,
      salaryExpectationMax: data.salary_expectation_max,
      preferredLocations: data.preferred_locations || [],
      remotePreference: data.remote_preference || "any",
      preferredSeniority: data.preferred_seniority || "any",
    };
  } catch {
    return null;
  }
}
