export interface ImproveSectionRequest {
  title?: string;
  content: string;
  jobTitle?: string;
  jobDescription?: string;
}

export interface ImproveSectionResponse {
  improved: string;
}

export async function improveSectionWithGemini(
  req: ImproveSectionRequest
): Promise<ImproveSectionResponse> {
  const response = await fetch("/api/improve-section", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(req),
  });

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new Error("The improvement service returned an unexpected response.");
  }

  if (!response.ok) {
    const obj = typeof payload === "object" && payload !== null ? payload as Record<string, unknown> : {};
    const message = obj.detail ? String(obj.detail)
      : obj.error ? String(obj.error)
      : "Failed to improve section.";
    throw new Error(message);
  }

  if (!payload || typeof payload !== "object" || typeof (payload as any).improved !== "string") {
    throw new Error("Invalid data returned from the improvement service.");
  }

  return payload as ImproveSectionResponse;
}
