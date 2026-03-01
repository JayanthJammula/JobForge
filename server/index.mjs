import "dotenv/config";
import express from "express";
import cors from "cors";
import multer from "multer";
import path from "node:path";
import fs from "node:fs/promises";
import pdfParse from "pdf-parse/lib/pdf-parse.js";
import mammoth from "mammoth";
import { GoogleGenerativeAI } from "@google/generative-ai";
import puppeteer from "puppeteer";

const uploadDir = path.join(process.cwd(), "tmp");
await fs.mkdir(uploadDir, { recursive: true });

const app = express();
const upload = multer({ dest: uploadDir });

app.use(cors());
app.use(express.json({ limit: "1mb" }));

const PORT = Number(process.env.API_PORT ?? process.env.PORT ?? 4000);
const MODEL_ID = process.env.GEMINI_MODEL ?? "gemini-2.5-pro";
const MAX_RESUME_CHARS = 20000;

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.post("/api/parse-resume", upload.single("file"), async (req, res) => {
  try {
    const resumeText = await getResumeText(req);
    const { sections, profile } = await generateSections(resumeText);
    res.json({ sections, profile });
  } catch (error) {
    console.error("Resume parsing failed", error);
    const status = typeof error?.status === "number" ? error.status : 500;
    const message = error instanceof Error && error.message
      ? error.message
      : "Failed to parse resume.";
    res.status(status).json({ error: message });
  } finally {
    if (req.file) {
      await fs.unlink(req.file.path).catch(() => undefined);
    }
  }
});

// Server-side PDF generation (Puppeteer)
app.post("/api/export-resume-pdf", async (req, res) => {
  let browser;
  let page;
  try {
    const body = req.body ?? {};
    const sections = Array.isArray(body.sections) ? body.sections : [];
    const profile = typeof body.profile === "object" && body.profile !== null ? body.profile : null;

    if (!sections.length) {
      throw createHttpError(400, "Sections are required to generate PDF.");
    }

    const html = buildResumeHtml({ profile, sections });

    browser = await puppeteer.launch({
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    page = await browser.newPage();
    await page.emulateMediaType("print");
    await page.setContent(html, { waitUntil: "load" });

    const format = process.env.PDF_FORMAT || "Letter"; // or A4
    const pdfBuffer = await page.pdf({
      format,
      printBackground: true,
      margin: { top: "20mm", bottom: "20mm", left: "16mm", right: "16mm" },
    });

    const fileName = typeof body.fileName === "string" && body.fileName.trim() ? body.fileName : "resume.pdf";
    // Validate PDF signature (%PDF)
    const isPdf = pdfBuffer && pdfBuffer[0] === 0x25 && pdfBuffer[1] === 0x50 && pdfBuffer[2] === 0x44 && pdfBuffer[3] === 0x46;
    if (!isPdf) {
      console.error("Generated buffer does not appear to be a PDF");
      throw createHttpError(502, "PDF generation failed.");
    }

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName.replace(/"/g, '')}"`);
    res.setHeader("Content-Length", String(pdfBuffer.length));
    return res.end(pdfBuffer);
  } catch (error) {
    console.error("Export PDF failed", error);
    const status = typeof error?.status === "number" ? error.status : 500;
    const message = error instanceof Error && error.message ? error.message : "Failed to export PDF.";
    return res.status(status).json({ error: message });
  } finally {
    try { if (page) await page.close(); } catch {}
    try { if (browser) await browser.close(); } catch {}
  }
});

app.post("/api/improve-section", async (req, res) => {
  try {
    const { title, content, jobTitle, jobDescription } = req.body ?? {};

    if (typeof content !== "string" || !content.trim()) {
      throw createHttpError(400, "Section content is required.");
    }

    const improved = await generateImprovedSection({
      title: typeof title === "string" ? title : "",
      content: content.trim(),
      jobTitle: typeof jobTitle === "string" ? jobTitle : undefined,
      jobDescription: typeof jobDescription === "string" && jobDescription.trim() ? jobDescription.trim() : undefined,
    });

    res.json({ improved });
  } catch (error) {
    console.error("Section improvement failed", error);
    const status = typeof error?.status === "number" ? error.status : 500;
    const message = error instanceof Error && error.message
      ? error.message
      : "Failed to improve section.";
    res.status(status).json({ error: message });
  }
});

app.listen(PORT, () => {
  console.log(`Resume parser server running on port ${PORT}`);
});

async function getResumeText(req) {
  const rawText = typeof req.body?.text === "string" ? req.body.text.trim() : "";
  let resumeText = rawText;

  if (!resumeText && req.file) {
    resumeText = (await extractTextFromFile(req.file)).trim();
  }

  if (!resumeText) {
    throw createHttpError(400, "No resume content provided.");
  }

  if (resumeText.length > MAX_RESUME_CHARS) {
    resumeText = resumeText.slice(0, MAX_RESUME_CHARS);
  }

  return resumeText;
}

async function extractTextFromFile(file) {
  const buffer = await fs.readFile(file.path);
  const lowerName = file.originalname.toLowerCase();
  const mimetype = file.mimetype;

  if (mimetype === "application/pdf" || lowerName.endsWith(".pdf")) {
    const pdf = await pdfParse(buffer);
    return pdf.text;
  }

  if (
    mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    lowerName.endsWith(".docx")
  ) {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  return buffer.toString("utf8");
}

async function generateSections(resumeText) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw createHttpError(500, "GEMINI_API_KEY environment variable is not set.");
  }

  const client = new GoogleGenerativeAI(apiKey);
  const model = client.getGenerativeModel({ model: MODEL_ID });

  const prompt = [
    "You are a resume parsing assistant.",
    "Analyze the resume text and return structured JSON with sections and top-of-resume profile details.",
    "Return STRICT JSON with this exact shape (no extra keys):",
    '{"profile":{"name":"","email":"","phone":"","location":"","title":"","links":{"linkedin":"","github":"","website":""}},"sections":[{"title":"Title","content":"Content"}]}',
    "Notes:",
    "- Extract profile from the header (name, email, phone, location, title).",
    "- Links are optional, include if present (LinkedIn, GitHub, personal website).",
    "- Use title case for section titles.",
    "- Preserve bullet points as newline separated lines.",
    "- Include sections only if content is available.",
    "Resume text:",
    `"""${resumeText}"""`
  ].join("\n");

  const result = await model.generateContent({
    contents: [
      {
        role: "user",
        parts: [{ text: prompt }],
      },
    ],
  });

  const raw = result.response.text();
  const jsonText = extractJson(raw);

  let parsed;
  try {
    parsed = JSON.parse(jsonText);
  } catch (error) {
    console.error("Failed to parse Gemini response", jsonText);
    throw createHttpError(502, "Gemini returned an unreadable response.");
  }

  const sections = normalizeSections(parsed.sections);
  const profile = normalizeProfile(parsed.profile);
  return { sections, profile };
}

async function generateImprovedSection({ title, content, jobTitle, jobDescription }) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw createHttpError(500, "GEMINI_API_KEY environment variable is not set.");
  }

  const client = new GoogleGenerativeAI(apiKey);
  const model = client.getGenerativeModel({ model: MODEL_ID });

  const guidance = [
    "You are a professional resume writer.",
    "Improve the given resume section to be clear, concise, and impactful.",
    "If a target role or job description is provided, tailor the language and emphasis to match it, but only based on the user's existing content.",
    "CRITICAL: Do NOT fabricate or add new accomplishments, roles, skills, tools, education, certifications, or dates. Rephrase, reorganize, or quantify only when the original text already implies it. If quantification is unsafe, keep it qualitative.",
    "Keep the same section type/title if provided.",
    "Prefer bullet points starting with '- ' for lists; KEEP PLAIN TEXT ONLY.",
    "Keep length roughly similar (within ±20%), no more than ~1800 characters.",
    "Return only strict JSON in this exact shape: {\"improved\":\"...\"} with no markdown code fences.",
    "Output only the improved content; do not include commentary or instructions.",
  ];

  const prompt = [
    ...guidance,
    jobTitle ? `Target role: ${jobTitle}` : undefined,
    jobDescription ? `Job description/context:\n"""${jobDescription}"""` : undefined,
    title ? `Section title: ${title}` : undefined,
    "Original section:",
    `"""${content}"""`,
  ].filter(Boolean).join("\n");

  const result = await model.generateContent({
    contents: [
      {
        role: "user",
        parts: [{ text: prompt }],
      },
    ],
  });

  const raw = result.response.text();
  const jsonText = extractJson(raw);

  let parsed;
  try {
    parsed = JSON.parse(jsonText);
  } catch (error) {
    console.error("Failed to parse Gemini improvement response", jsonText);
    throw createHttpError(502, "Gemini returned an unreadable improvement.");
  }

  const improved = typeof parsed?.improved === "string" ? parsed.improved.trim() : "";
  if (!improved) {
    throw createHttpError(502, "Gemini did not return improved content.");
  }
  return improved.slice(0, 1800);
}

function normalizeSections(sections) {
  if (!Array.isArray(sections)) {
    throw createHttpError(502, "Gemini response did not include sections.");
  }

  const normalized = sections
    .map((section, index) => {
      const title = typeof section?.title === "string" ? section.title.trim() : "";
      const content = typeof section?.content === "string" ? section.content.trim() : "";

      if (!content) {
        return null;
      }

      return {
        id: createSectionId(title, index),
        title: title || `Section ${index + 1}`,
        content,
      };
    })
    .filter((section) => section !== null);

  if (!normalized.length) {
    throw createHttpError(502, "Gemini did not return any usable sections.");
  }

  return normalized;
}

function extractJson(rawText) {
  if (typeof rawText !== "string") {
    throw createHttpError(502, "Gemini returned an empty response.");
  }

  const match = rawText.match(/```json\s*([\s\S]*?)```/i);
  const jsonString = match ? match[1] : rawText;
  return jsonString.trim();
}

function normalizeProfile(profile) {
  const safe = (v) => (typeof v === "string" ? v.trim() : "");
  const links = profile?.links ?? {};
  return {
    name: safe(profile?.name),
    email: safe(profile?.email),
    phone: safe(profile?.phone),
    location: safe(profile?.location),
    title: safe(profile?.title),
    links: {
      linkedin: safe(links?.linkedin),
      github: safe(links?.github),
      website: safe(links?.website),
    },
  };
}

function createSectionId(title, index) {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  return slug || `section-${index + 1}`;
}

function createHttpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function esc(s) {
  return String(s ?? "").replace(/[&<>]/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;"}[c]));
}

function buildResumeHtml({ profile, sections }) {
  const hasProfile = profile && (profile.name || profile.title || profile.email || profile.phone || profile.location);
  const lines = [];
  if (hasProfile) {
    const headerLine = [profile.name, profile.title].filter(Boolean).join(" • ");
    const contactBits = [];
    if (profile.email) contactBits.push(`Email: ${profile.email}`);
    if (profile.phone) contactBits.push(`Phone: ${profile.phone}`);
    if (profile.location) contactBits.push(`Location: ${profile.location}`);
    if (profile?.links?.linkedin) contactBits.push(`LinkedIn: ${profile.links.linkedin}`);
    if (profile?.links?.github) contactBits.push(`GitHub: ${profile.links.github}`);
    if (profile?.links?.website) contactBits.push(`Website: ${profile.links.website}`);
    lines.push(`<div class="name">${esc(headerLine)}</div>`);
    if (contactBits.length) {
      lines.push(`<div class="contact">${esc(contactBits.join(" | "))}</div>`);
    }
  }

  const sectionHtml = sections.map((s) => {
    const contentLines = String(s.content ?? "").split(/\r?\n/);
    const formatted = contentLines.map((l) => {
      const t = l.trim();
      if (!t) return "<div class=\"spacer\"></div>";
      if (t.startsWith("- ")) {
        return `<li>${esc(t.slice(2))}</li>`;
      }
      return `<p>${esc(t)}</p>`;
    });

    // Wrap bullet items in a UL, keep paragraphs as-is
    const grouped = [];
    let ul = [];
    for (const piece of formatted) {
      if (piece.startsWith("<li>")) {
        ul.push(piece);
      } else {
        if (ul.length) {
          grouped.push(`<ul>${ul.join("")}</ul>`);
          ul = [];
        }
        grouped.push(piece);
      }
    }
    if (ul.length) grouped.push(`<ul>${ul.join("")}</ul>`);

    return `
      <section class="section">
        <h2>${esc(s.title || "Section")}</h2>
        ${grouped.join("\n")}
      </section>
    `;
  }).join("\n");

  return `<!doctype html>
  <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <style>
        :root { --text:#111; --muted:#555; --accent:#1f2937; }
        html, body { margin:0; padding:0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Helvetica Neue', Arial, 'Noto Sans', 'Apple Color Emoji','Segoe UI Emoji'; color: var(--text); }
        .container { padding: 24px 28px; }
        .name { font-size: 24px; font-weight: 700; }
        .contact { margin-top: 6px; color: var(--muted); font-size: 12px; }
        .section { margin-top: 18px; }
        .section h2 { font-size: 14px; letter-spacing: .02em; text-transform: uppercase; color: var(--accent); margin: 0 0 8px 0; }
        p { margin: 0 0 6px 0; line-height: 1.35; }
        ul { margin: 0 0 6px 18px; padding: 0; }
        li { margin: 0 0 4px 0; }
        .spacer { height: 8px; }
      </style>
    </head>
    <body>
      <div class="container">
        ${lines.join("\n")}
        ${sectionHtml}
      </div>
    </body>
  </html>`;
}
