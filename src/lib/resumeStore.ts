import type { ResumeSection } from "../components/ResumeEditor";

const SECTIONS_KEY = "resumeSections";
const PROFILE_KEY = "profile";
const SETTINGS_KEY = "resumeSettings";

/* ---- Resume style settings ---- */
export interface ResumeSettings {
  fontSize: number;      // pt (8–14)
  lineHeight: number;    // unitless ratio (1.0–2.0)
  marginX: number;       // mm left & right (5–30)
  marginY: number;       // mm top & bottom  (5–30)
  sectionSpacing: number; // px between sections (4–24)
  headerSize: number;     // pt for section heading (10–18)
  nameFontSize: number;   // pt for name (16–30)
}

export const defaultResumeSettings: ResumeSettings = {
  fontSize: 10.5,
  lineHeight: 1.35,
  marginX: 10,
  marginY: 9,
  sectionSpacing: 12,
  headerSize: 12,
  nameFontSize: 22,
};

export function getStoredResumeSettings(): ResumeSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...defaultResumeSettings };
    return { ...defaultResumeSettings, ...JSON.parse(raw) };
  } catch {
    return { ...defaultResumeSettings };
  }
}

export function setStoredResumeSettings(settings: ResumeSettings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // ignore
  }
}

/* ---- Resume sections ---- */
export function getStoredResumeSections(): ResumeSection[] | null {
  try {
    const raw = localStorage.getItem(SECTIONS_KEY);
    if (!raw) return null;
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return null;
    return arr.filter(Boolean);
  } catch {
    return null;
  }
}

export function setStoredResumeSections(sections: ResumeSection[]) {
  try {
    localStorage.setItem(SECTIONS_KEY, JSON.stringify(sections));
  } catch {
    // ignore
  }
}

export function getStoredProfile(): any | null {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
