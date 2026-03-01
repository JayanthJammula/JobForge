import React, { useEffect, useRef, useState } from "react";
import { ArrowLeft, Download, Sparkles, Briefcase, MapPin, Upload, FileUp, Loader2, AlertCircle } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { ResumeEditor, ResumeSection } from "./ResumeEditor";
import { ScrollArea } from "./ui/scroll-area";
import { Separator } from "./ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { parseResumeWithGemini } from "../lib/resumeParser";
import { improveSectionWithGemini } from "../lib/resumeImprove";
import { downloadResumePdfServer } from "../lib/pdfExport";
import { getStoredResumeSections, setStoredResumeSections } from "../lib/resumeStore";

interface Job {
  id: string;
  title: string;
  company: string;
  logo: string;
  location: string;
  remote: boolean;
  skills: string[];
  description: string;
  matchScore: number;
  applyLink?: string;
  employmentType?: string;
  salaryMin?: number | null;
  salaryMax?: number | null;
  salaryCurrency?: string | null;
  salaryPeriod?: string;
}

interface TailorResumePageProps {
  jobId: string;
  jobData?: Job;
  onBack: () => void;
}

// Helper function to extract requirements from job description
const extractRequirementsFromDescription = (description: string): string[] => {
  // Simple extraction - look for bullet points or numbered lists
  const lines = description.split('\n');
  const requirements: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.match(/^[\d\-\•\*]\s+/) || trimmed.match(/^[A-Z][^.!?]*[.!?]$/)) {
      requirements.push(trimmed.replace(/^[\d\-\•\*]\s+/, ''));
    }
  }

  return requirements.length > 0 ? requirements : [
    "Experience in relevant technologies",
    "Strong problem-solving skills",
    "Good communication abilities"
  ];
};

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

export function TailorResumePage({ jobId, jobData, onBack }: TailorResumePageProps) {
  // Use jobData if available, otherwise create a fallback
  const job = jobData || {
    id: jobId,
    title: "Loading...",
    company: "Loading...",
    logo: "",
    location: "Loading...",
    remote: false,
    skills: [],
    description: "Loading job details...",
    matchScore: 0
  };

  // Extract requirements from job description if not provided
  const requirements = jobData?.description ? extractRequirementsFromDescription(jobData.description) : [
    "Experience in relevant technologies",
    "Strong problem-solving skills",
    "Good communication abilities"
  ];
  const [sections, setSections] = useState<ResumeSection[]>(() => getStoredResumeSections() || initialSections);
  const [isTailoring, setIsTailoring] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploadText, setUploadText] = useState("");
  const [uploadedFileName, setUploadedFileName] = useState<string>("");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setStoredResumeSections(sections);
  }, [sections]);

  const resetUploadState = () => {
    setUploadText("");
    setUploadedFileName("");
    setUploadedFile(null);
    setParseError(null);
    const input = fileInputRef.current;
    if (input) input.value = "";
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadedFile(file);
    setUploadedFileName(file.name);
    setParseError(null);
    if (file.type.startsWith("text/") || file.type === "application/json") {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        if (content) setUploadText(content);
      };
      reader.readAsText(file);
    } else {
      setUploadText("");
    }
  };

  const handleUploadResume = async () => {
    if (!uploadedFile && !uploadText.trim()) {
      setParseError("Upload a file or paste your resume text before submitting.");
      return;
    }
    setIsSubmitting(true);
    setParseError(null);
    try {
      const { sections: parsedSections, profile } = await parseResumeWithGemini({
        file: uploadedFile ?? undefined,
        text: uploadText.trim() ? uploadText : undefined,
      });
      if (!parsedSections.length) throw new Error("The AI parser did not return any resume sections.");

      const mapped = parsedSections.map((section) => ({
        id: section.id,
        title: section.title,
        content: section.content,
      }));

      if (profile) {
        const lines: string[] = [];
        if (profile.name) lines.push(profile.name);
        if (profile.title) lines.push(profile.title);
        const contacts: string[] = [];
        if (profile.email) contacts.push(`Email: ${profile.email}`);
        if (profile.phone) contacts.push(`Phone: ${profile.phone}`);
        if (profile.location) contacts.push(`Location: ${profile.location}`);
        if (profile.links?.linkedin) contacts.push(`LinkedIn: ${profile.links.linkedin}`);
        if (profile.links?.github) contacts.push(`GitHub: ${profile.links.github}`);
        if (profile.links?.website) contacts.push(`Website: ${profile.links.website}`);
        const contactContent = [
          lines.join(" \u2022 "),
          contacts.join(" \n"),
        ].filter(Boolean).join("\n\n");
        const contactSection = { id: "contact", title: "Contact", content: contactContent } as const;
        const existingIdx = mapped.findIndex((s) => s.id === "contact" || s.title.toLowerCase() === "contact");
        if (existingIdx >= 0) mapped[existingIdx] = { ...mapped[existingIdx], ...contactSection };
        else mapped.unshift({ ...contactSection });
      }

      setSections(mapped);
      setUploadDialogOpen(false);
      resetUploadState();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to parse resume. Please try again.";
      setParseError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAutoTailor = async () => {
    setIsTailoring(true);
    try {
      const updated: ResumeSection[] = [];
      for (const s of sections) {
        try {
          const { improved } = await improveSectionWithGemini({
            title: s.title,
            content: s.content,
            jobTitle: job.title,
            jobDescription: job.description,
          });
          updated.push({ ...s, content: improved });
        } catch (e) {
          // If one section fails, keep the original content and continue
          updated.push(s);
        }
      }
      setSections(updated);
    } finally {
      setIsTailoring(false);
    }
  };

  const handleDownload = () => {
    const resumeText = sections
      .map(section => `${section.title.toUpperCase()}\n${section.content}`)
      .join('\n\n');

    const blob = new Blob([resumeText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `resume-${job.company.replace(/\s+/g, '-').toLowerCase()}-${job.title.replace(/\s+/g, '-').toLowerCase()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadPdf = () => {
    let profile: any = undefined;
    try {
      const stored = localStorage.getItem("profile");
      if (stored) profile = JSON.parse(stored);
    } catch { }
    const safe = (s: string) => s.replace(/[^a-z0-9-_]+/gi, "-").replace(/-+/g, "-").replace(/(^-|-$)/g, "").toLowerCase();
    const fileName = `resume-${safe(job.company)}-${safe(job.title)}.pdf`;
    downloadResumePdfServer(
      sections.map((s) => ({ title: s.title, content: s.content })),
      profile,
      fileName
    ).catch((e) => alert(e.message));
  };

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Top Navigation */}
      <div className="bg-background border-b border-border sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <Button variant="ghost" onClick={onBack} size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Job
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setUploadDialogOpen(true)}>
                <Upload className="w-4 h-4 mr-2" />
                Upload Resume
              </Button>
              <Button
                onClick={handleAutoTailor}
                disabled={isTailoring}
              >
                <Sparkles className="w-4 h-4 mr-2" />
                {isTailoring ? "Tailoring..." : "Auto-Tailor All Sections"}
              </Button>
              <Button variant="outline" onClick={handleDownload}>
                <Download className="w-4 h-4 mr-2" />
                Download TXT
              </Button>
              <Button onClick={handleDownloadPdf}>
                <Download className="w-4 h-4 mr-2" />
                Download PDF
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Job Reference */}
          <div className="lg:col-span-1">
            <div className="lg:sticky lg:top-24 space-y-6">
              <div>
                <h2 className="mb-2">Tailoring Resume For</h2>
                <p className="text-sm text-muted-foreground">
                  Use the job details below as reference while editing
                </p>
              </div>

              {!jobData && (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-yellow-800 text-sm">
                    Job details are loading. Some features may be limited until data is available.
                  </p>
                </div>
              )}

              {/* Job Info Card */}
              <Card>
                <CardHeader>
                  <div className="flex items-start gap-3">
                    <img
                      src={job.logo}
                      alt={job.company}
                      className="w-12 h-12 rounded-lg object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(job.company)}&background=random`;
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <CardTitle className="mb-1">{job.title}</CardTitle>
                      <CardDescription>{job.company}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <span>{job.location}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {job.remote && (
                      <Badge variant="secondary">Remote</Badge>
                    )}
                    {job.employmentType && (
                      <Badge variant="outline">{job.employmentType}</Badge>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Job Description */}
              <Card>
                <CardHeader>
                  <CardTitle>Job Description</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[200px] pr-4">
                    <p className="text-sm text-muted-foreground whitespace-pre-line">
                      {job.description}
                    </p>
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Requirements */}
              <Card>
                <CardHeader>
                  <CardTitle>Key Requirements</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {requirements.map((req: string, idx: number) => (
                      <li key={idx} className="flex gap-2 text-sm">
                        <span className="text-primary mt-0.5">•</span>
                        <span className="text-muted-foreground">{req}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              {/* Required Skills */}
              <Card>
                <CardHeader>
                  <CardTitle>Required Skills</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {job.skills.map((skill: string, idx: number) => (
                      <Badge key={idx} variant="outline">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Right Column - Resume Editor */}
          <div className="lg:col-span-2 space-y-6">
            <div>
              <h2 className="mb-2">Your Tailored Resume</h2>
              <p className="text-sm text-muted-foreground">
                Edit each section manually or use AI to improve it for this specific role
              </p>
            </div>

            <ResumeEditor
              sections={sections}
              onSectionsChange={setSections}
              jobTitle={job.title}
              jobDescription={job.description}
            />
          </div>
        </div>
      </div>

      {/* Upload Dialog */}
      <Dialog
        open={uploadDialogOpen}
        onOpenChange={(open) => {
          setUploadDialogOpen(open);
          if (!open) resetUploadState();
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Upload Resume</DialogTitle>
            <DialogDescription>
              Upload a file or paste your resume text below
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* File Upload */}
            <div>
              <Label>Upload from File</Label>
              <div className="mt-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt,.pdf,.doc,.docx"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full"
                >
                  <FileUp className="w-4 h-4 mr-2" />
                  {uploadedFileName || "Choose File"}
                </Button>
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Or paste text
                </span>
              </div>
            </div>

            {/* Text Paste */}
            <div>
              <Label htmlFor="resume-upload-tailor">Resume Content</Label>
              <Textarea
                id="resume-upload-tailor"
                value={uploadText}
                onChange={(e) => setUploadText(e.target.value)}
                className="min-h-[300px] mt-2 font-mono text-sm"
                placeholder="Paste your resume content here..."
              />
            </div>

            {parseError && (
              <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                <AlertCircle className="mt-0.5 h-4 w-4" />
                <span>{parseError}</span>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                onClick={handleUploadResume}
                className="flex-1"
                disabled={isSubmitting || (!uploadedFile && !uploadText.trim())}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Parsing...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Submit Resume
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setUploadDialogOpen(false);
                  resetUploadState();
                }}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
