import { buildFlowCVHtml } from "../components/ResumePreview";
import type { ResumeSettings } from "./resumeStore";

export async function downloadResumePdfServer(
  sections: Array<{ title: string; content: string }>,
  profile?: {
    name?: string;
    email?: string;
    phone?: string;
    location?: string;
    title?: string;
    links?: { linkedin?: string; github?: string; website?: string };
  },
  _fileName = "resume.pdf",
  settings?: ResumeSettings
): Promise<void> {
  const html = buildFlowCVHtml(sections, profile, settings);

  const iframe = document.createElement("iframe");
  iframe.style.cssText = "position:fixed;width:0;height:0;border:none;left:-9999px;";
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!doc) {
    document.body.removeChild(iframe);
    throw new Error("Could not open print frame.");
  }

  doc.open();
  doc.write(html);
  doc.close();

  await new Promise<void>((resolve) => setTimeout(resolve, 300));
  iframe.contentWindow?.print();

  setTimeout(() => {
    try { document.body.removeChild(iframe); } catch { }
  }, 2000);
}
