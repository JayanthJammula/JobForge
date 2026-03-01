import { useMemo } from "react";
import type { ResumeSettings } from "../lib/resumeStore";
import { defaultResumeSettings } from "../lib/resumeStore";

interface ResumePreviewProps {
  sections: Array<{ id: string; title: string; content: string }>;
  profile?: {
    name?: string;
    email?: string;
    phone?: string;
    location?: string;
    title?: string;
    links?: { linkedin?: string; github?: string; website?: string };
  };
  settings?: ResumeSettings;
}

/** Escape HTML entities */
function esc(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] ?? c));
}

/**
 * Convert a plain-text content block into HTML.
 * Supports:
 *   - **bold** markers
 *   - Lines starting with "- " become <li>
 *   - Empty lines become spacers
 */
function contentToHtml(content: string): string {
  const lines = content.split(/\r?\n/);
  const out: string[] = [];
  let inUl = false;

  for (const raw of lines) {
    const trimmed = raw.trim();

    if (!trimmed) {
      if (inUl) { out.push("</ul>"); inUl = false; }
      out.push('<div class="spacer"></div>');
      continue;
    }

    const isBullet = trimmed.startsWith("- ") || trimmed.startsWith("\u2022 ");

    if (isBullet) {
      if (!inUl) { out.push("<ul>"); inUl = true; }
      const text = trimmed.slice(2);
      out.push(`<li>${boldify(esc(text))}</li>`);
    } else {
      if (inUl) { out.push("</ul>"); inUl = false; }
      out.push(`<p>${boldify(esc(trimmed))}</p>`);
    }
  }

  if (inUl) out.push("</ul>");
  return out.join("\n");
}

/** Convert **text** to <strong>text</strong> */
function boldify(html: string): string {
  return html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
}

/** Build CSS string from settings */
function buildCss(s: ResumeSettings): string {
  return `
    .rv-root {
      font-family: 'Charter', 'Georgia', 'Times New Roman', serif;
      font-size: ${s.fontSize}pt;
      line-height: ${s.lineHeight};
      color: #1a1a1a;
      background: white;
      padding: ${s.marginY}mm ${s.marginX}mm;
      min-height: 100%;
    }

    /* ---- Header ---- */
    .rv-header {
      text-align: center;
      padding-bottom: 8px;
      margin-bottom: 4px;
    }
    .rv-name {
      font-size: ${s.nameFontSize}pt;
      font-weight: 700;
      color: #111;
      margin-bottom: 6px;
    }
    .rv-contact {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 14px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
      font-size: 9pt;
      color: #444;
    }
    .rv-contact-item {
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }
    .rv-contact-item svg {
      flex-shrink: 0;
      opacity: 0.7;
    }

    /* ---- Sections ---- */
    .rv-section {
      margin-top: ${s.sectionSpacing}px;
    }
    .rv-section h2 {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
      font-size: ${s.headerSize}pt;
      font-weight: 700;
      color: #111;
      border-bottom: 1.5px solid #333;
      padding-bottom: 3px;
      margin: 0 0 6px 0;
    }
    .rv-section-body p {
      margin: 0 0 3px 0;
    }
    .rv-section-body ul {
      margin: 2px 0 4px 18px;
      padding: 0;
      list-style-type: disc;
    }
    .rv-section-body li {
      margin: 0 0 2px 0;
    }
    .rv-section-body strong {
      font-weight: 700;
    }
    .spacer {
      height: 6px;
    }
  `;
}

export function ResumePreview({ sections, profile, settings }: ResumePreviewProps) {
  const s = settings ?? defaultResumeSettings;

  const html = useMemo(() => {
    // --- Header ---
    let headerHtml = "";
    if (profile && (profile.name || profile.email)) {
      const nameHtml = profile.name ? `<div class="rv-name">${esc(profile.name)}</div>` : "";

      const contactBits: string[] = [];
      if (profile.email) contactBits.push(`<span class="rv-contact-item"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 4L12 13 2 4"/></svg>${esc(profile.email)}</span>`);
      if (profile.phone) contactBits.push(`<span class="rv-contact-item"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6A19.79 19.79 0 012.12 4.18 2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>${esc(profile.phone)}</span>`);
      if (profile.links?.linkedin) contactBits.push(`<span class="rv-contact-item"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>LinkedIn</span>`);
      if (profile.links?.github) contactBits.push(`<span class="rv-contact-item"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/></svg>GitHub</span>`);
      if (profile.location) contactBits.push(`<span class="rv-contact-item"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>${esc(profile.location)}</span>`);

      const contactHtml = contactBits.length
        ? `<div class="rv-contact">${contactBits.join("")}</div>`
        : "";

      headerHtml = `<header class="rv-header">${nameHtml}${contactHtml}</header>`;
    }

    // --- Sections ---
    const sectionHtml = sections
      .filter((s) => s.content && s.content.trim())
      .map((s) => {
        return `<section class="rv-section"><h2>${esc(s.title)}</h2><div class="rv-section-body">${contentToHtml(s.content)}</div></section>`;
      })
      .join("\n");

    return headerHtml + sectionHtml;
  }, [sections, profile]);

  const css = useMemo(() => buildCss(s), [s]);

  return (
    <div className="rv-root">
      <style>{css}</style>
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}

/**
 * Build the full HTML document for PDF export using the same FlowCV template.
 * This is used by pdfExport.ts.
 */
export function buildFlowCVHtml(
  sections: Array<{ title: string; content: string }>,
  profile?: {
    name?: string;
    email?: string;
    phone?: string;
    location?: string;
    title?: string;
    links?: { linkedin?: string; github?: string; website?: string };
  },
  settings?: ResumeSettings
): string {
  const s = settings ?? defaultResumeSettings;

  // --- Header ---
  let headerHtml = "";
  if (profile && (profile.name || profile.email)) {
    const nameHtml = profile.name ? `<div class="rv-name">${esc(profile.name)}</div>` : "";

    const contactBits: string[] = [];
    if (profile.email) contactBits.push(`<span class="rv-contact-item">\u2709 ${esc(profile.email)}</span>`);
    if (profile.phone) contactBits.push(`<span class="rv-contact-item">\u260E ${esc(profile.phone)}</span>`);
    if (profile.links?.linkedin) contactBits.push(`<span class="rv-contact-item">\uD83D\uDD17 LinkedIn</span>`);
    if (profile.links?.github) contactBits.push(`<span class="rv-contact-item">\u2B24 GitHub</span>`);
    if (profile.location) contactBits.push(`<span class="rv-contact-item">\uD83D\uDCCD ${esc(profile.location)}</span>`);

    const contactHtml = contactBits.length
      ? `<div class="rv-contact">${contactBits.join("")}</div>`
      : "";

    headerHtml = `<header class="rv-header">${nameHtml}${contactHtml}</header>`;
  }

  // --- Sections ---
  const sectionHtml = sections
    .filter((sec) => sec.content && sec.content.trim())
    .map((sec) => {
      return `<section class="rv-section"><h2>${esc(sec.title)}</h2><div class="rv-section-body">${contentToHtml(sec.content)}</div></section>`;
    })
    .join("\n");

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      @page {
        size: letter;
        margin: ${s.marginY}mm ${s.marginX}mm;
      }
      * { box-sizing: border-box; margin: 0; padding: 0; }
      html, body {
        font-family: 'Charter', 'Georgia', 'Times New Roman', serif;
        font-size: ${s.fontSize}pt;
        line-height: ${s.lineHeight};
        color: #1a1a1a;
      }

      .rv-header {
        text-align: center;
        padding-bottom: 8px;
        margin-bottom: 4px;
      }
      .rv-name {
        font-size: ${s.nameFontSize}pt;
        font-weight: 700;
        color: #111;
        margin-bottom: 6px;
      }
      .rv-contact {
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        gap: 16px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
        font-size: 9pt;
        color: #444;
      }
      .rv-contact-item {
        display: inline-flex;
        align-items: center;
        gap: 4px;
      }

      .rv-section {
        margin-top: ${s.sectionSpacing}px;
      }
      .rv-section h2 {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
        font-size: ${s.headerSize}pt;
        font-weight: 700;
        color: #111;
        border-bottom: 1.5px solid #333;
        padding-bottom: 3px;
        margin: 0 0 6px 0;
      }
      .rv-section-body p {
        margin: 0 0 3px 0;
      }
      .rv-section-body ul {
        margin: 2px 0 4px 18px;
        padding: 0;
        list-style-type: disc;
      }
      .rv-section-body li {
        margin: 0 0 2px 0;
      }
      .rv-section-body strong {
        font-weight: 700;
      }
      .spacer {
        height: 6px;
      }
    </style>
  </head>
  <body>
    ${headerHtml}
    ${sectionHtml}
  </body>
</html>`;
}
