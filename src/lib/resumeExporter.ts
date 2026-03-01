import { Document, HeadingLevel, Packer, Paragraph, TextRun } from "docx";

export interface ResumeSectionLike {
  title: string;
  content: string;
}

export async function downloadResumeDocx(sections: ResumeSectionLike[], fileName = "resume.docx") {
  if (!sections.length) {
    throw new Error("No resume sections available for export.");
  }

  const children: Paragraph[] = [];

  sections.forEach((section, index) => {
    const title = section.title || `Section ${index + 1}`;

    children.push(
      new Paragraph({
        text: title,
        heading: HeadingLevel.HEADING_2,
        spacing: { after: 160 },
      })
    );

    const lines = section.content.split(/\r?\n/);
    lines.forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed) {
        children.push(new Paragraph({ spacing: { after: 80 } }));
      } else {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: trimmed })],
            spacing: { after: 80 },
          })
        );
      }
    });

    if (index < sections.length - 1) {
      children.push(new Paragraph({ spacing: { after: 240 } }));
    }
  });

  const doc = new Document({
    sections: [
      {
        properties: {},
        children,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  triggerDownload(blob, fileName);
}

export function downloadResumeText(sections: ResumeSectionLike[], fileName = "resume.txt") {
  if (!sections.length) {
    throw new Error("No resume sections available for export.");
  }

  const resumeText = sections
    .map((section) => `${section.title.toUpperCase()}\n${section.content}`)
    .join("\n\n");

  const blob = new Blob([resumeText], { type: "text/plain" });
  triggerDownload(blob, fileName);
}

function triggerDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}
