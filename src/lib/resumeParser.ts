export interface ParsedResumeSection {
  id: string;
  title: string;
  content: string;
}

interface ParseResumeOptions {
  file?: File;
  text?: string;
}

interface ParseResumeResponse {
  sections: ParsedResumeSection[];
  profile?: {
    name: string;
    email: string;
    phone: string;
    location: string;
    title: string;
    links?: {
      linkedin?: string;
      github?: string;
      website?: string;
    }
  };
}

export async function parseResumeWithGemini(options: ParseResumeOptions): Promise<ParseResumeResponse> {
  const formData = new FormData();

  if (options.file) {
    formData.append("file", options.file);
  }

  if (options.text) {
    formData.append("text", options.text);
  }

  if (!options.file && !options.text) {
    throw new Error("Resume content is required.");
  }

  const response = await fetch("/api/parse-resume", {
    method: "POST",
    body: formData,
  });

  let payload: unknown;

  try {
    payload = await response.json();
  } catch (error) {
    throw new Error("The resume parser returned an unexpected response.");
  }

  if (!response.ok) {
    const obj = typeof payload === "object" && payload !== null ? payload as Record<string, unknown> : {};
    const message = obj.detail ? String(obj.detail)
      : obj.error ? String(obj.error)
      : "Failed to parse resume.";
    throw new Error(message);
  }

  if (!payload || typeof payload !== "object" || !Array.isArray((payload as { sections?: unknown }).sections)) {
    throw new Error("Invalid data returned from the resume parser.");
  }

  const result = payload as ParseResumeResponse;

  // Optional: persist profile in localStorage for Profile page initialization
  try {
    if (result.profile) {
      localStorage.setItem("profile", JSON.stringify(result.profile));
    }
  } catch {
    // ignore storage errors
  }

  return result;
}
