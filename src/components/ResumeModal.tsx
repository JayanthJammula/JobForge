import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { useState } from "react";
import { Download } from "lucide-react";
import { ResumeEditor, ResumeSection } from "./ResumeEditor";
import { ScrollArea } from "./ui/scroll-area";

interface ResumeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobTitle: string;
}

const initialSections: ResumeSection[] = [
  {
    id: "summary",
    title: "Professional Summary",
    content: "Software Engineer with 5+ years of experience in web development. Passionate about creating user-friendly applications."
  },
  {
    id: "experience",
    title: "Work Experience",
    content: "Software Engineer at TechCo (2020-Present)\n• Built responsive web applications using React and TypeScript\n• Collaborated with cross-functional teams to deliver features\n• Implemented UI components following design specifications"
  },
  {
    id: "skills",
    title: "Skills",
    content: "React, JavaScript, TypeScript, CSS, HTML, Git, Node.js"
  },
  {
    id: "education",
    title: "Education",
    content: "Bachelor of Science in Computer Science\nUniversity of Technology (2015-2019)"
  }
];

export function ResumeModal({ open, onOpenChange, jobTitle }: ResumeModalProps) {
  const [sections, setSections] = useState<ResumeSection[]>(initialSections);

  const handleDownload = () => {
    const resumeText = sections
      .map(section => `${section.title.toUpperCase()}\n${section.content}`)
      .join('\n\n');
    
    const blob = new Blob([resumeText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `resume-tailored-${jobTitle.replace(/\s+/g, '-').toLowerCase()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle>Tailor Your Resume</DialogTitle>
              <DialogDescription>
                Optimize your resume for {jobTitle}
              </DialogDescription>
            </div>
            <Button variant="outline" size="sm" onClick={handleDownload}>
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
          </div>
        </DialogHeader>
        <ScrollArea className="flex-1 pr-4">
          <ResumeEditor 
            sections={sections}
            onSectionsChange={setSections}
            jobTitle={jobTitle}
          />
        </ScrollArea>
        <div className="flex justify-end pt-4 border-t">
          <Button onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
