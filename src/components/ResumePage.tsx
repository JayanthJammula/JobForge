import { useEffect, useRef, useState } from "react";
import {
  AlertCircle, ArrowLeft, Download, FileUp, Loader2,
  PenLine, Settings2, Upload, RotateCcw
} from "lucide-react";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Slider } from "./ui/slider";
import { ResumeEditor, ResumeSection } from "./ResumeEditor";
import { ResumePreview } from "./ResumePreview";
import { parseResumeWithGemini } from "../lib/resumeParser";
import { downloadResumePdfServer } from "../lib/pdfExport";
import {
  getStoredResumeSections, setStoredResumeSections,
  getStoredResumeSettings, setStoredResumeSettings,
  defaultResumeSettings,
  type ResumeSettings,
} from "../lib/resumeStore";

interface ResumePageProps {
  onBack: () => void;
}

const initialResume: ResumeSection[] = [
  {
    id: "summary",
    title: "Professional Summary",
    content: "Software Engineer with 5+ years of experience in web development. Passionate about creating user-friendly applications."
  },
  {
    id: "experience",
    title: "Work Experience",
    content: "Software Engineer at TechCo (2020-Present)\n- Built responsive web applications using React and TypeScript\n- Collaborated with cross-functional teams to deliver features\n- Implemented UI components following design specifications"
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

function getProfile() {
  try {
    const stored = localStorage.getItem("profile");
    if (stored) return JSON.parse(stored);
  } catch { /* ignore */ }
  return undefined;
}

/* ---------- Setting row helper ---------- */
function SettingRow({
  label, value, min, max, step, unit, onChange
}: {
  label: string; value: number; min: number; max: number; step: number; unit: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">{label}</span>
        <span className="text-sm tabular-nums font-mono text-muted-foreground min-w-[50px] text-right">{value}{unit}</span>
      </div>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={([v]) => onChange(v)}
        className="w-full"
      />
    </div>
  );
}

export function ResumePage({ onBack }: ResumePageProps) {
  const [resumeSections, setResumeSections] = useState<ResumeSection[]>(
    () => getStoredResumeSections() || initialResume
  );
  const [profile, setProfile] = useState<any>(getProfile);
  const [settings, setSettings] = useState<ResumeSettings>(getStoredResumeSettings);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Persist sections on change
  useEffect(() => {
    setStoredResumeSections(resumeSections);
  }, [resumeSections]);

  // Persist settings on change
  useEffect(() => {
    setStoredResumeSettings(settings);
  }, [settings]);

  // Refresh profile when sections change (parser may have stored a new one)
  useEffect(() => {
    setProfile(getProfile());
  }, [resumeSections]);

  // Setting updater
  const updateSetting = <K extends keyof ResumeSettings>(key: K, value: ResumeSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const resetSettings = () => setSettings({ ...defaultResumeSettings });

  // Upload dialog state
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploadText, setUploadText] = useState("");
  const [uploadedFileName, setUploadedFileName] = useState<string>("");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      const { sections, profile: parsedProfile } = await parseResumeWithGemini({
        file: uploadedFile ?? undefined,
        text: uploadText.trim() ? uploadText : undefined,
      });

      if (!sections.length) {
        throw new Error("The parser did not return any resume sections.");
      }

      // Filter out contact/contact-info sections — profile header handles that
      const mapped = sections
        .filter((section) => {
          const lower = section.id.toLowerCase();
          return lower !== "contact" && lower !== "contact-info";
        })
        .map((section) => ({
          id: section.id,
          title: section.title,
          content: section.content,
        }));

      setResumeSections(mapped);

      // Profile is already saved to localStorage by the parser
      if (parsedProfile) {
        setProfile(parsedProfile);
      }

      setUploadDialogOpen(false);
      resetUploadState();
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : "Failed to parse resume. Please try again.";
      setParseError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownloadPdf = () => {
    downloadResumePdfServer(
      resumeSections.map((s) => ({ title: s.title, content: s.content })),
      profile,
      "resume.pdf",
      settings
    ).catch((e) => alert(e.message));
  };

  const isSubmitDisabled = isSubmitting || (!uploadedFile && !uploadText.trim());

  return (
    <div className="h-screen flex flex-col bg-muted/30">
      {/* Top Navigation */}
      <div className="bg-background border-b border-border flex-shrink-0 z-10">
        <div className="px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={onBack} size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <span className="text-sm font-medium text-muted-foreground hidden sm:inline">Resume Builder</span>
          </div>

          {/* Left-panel toggle: Edit / Style */}
          <div className="flex items-center gap-1 border rounded-lg p-0.5">
            <Button
              variant={!settingsOpen ? "default" : "ghost"}
              size="sm"
              className="h-7 text-xs"
              onClick={() => setSettingsOpen(false)}
            >
              <PenLine className="w-3.5 h-3.5 mr-1" />
              Edit
            </Button>
            <Button
              variant={settingsOpen ? "default" : "ghost"}
              size="sm"
              className="h-7 text-xs"
              onClick={() => setSettingsOpen(true)}
            >
              <Settings2 className="w-3.5 h-3.5 mr-1" />
              Style
            </Button>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setUploadDialogOpen(true)}>
              <Upload className="w-4 h-4 mr-1" />
              <span className="hidden sm:inline">Upload</span>
            </Button>
            <Button size="sm" onClick={handleDownloadPdf}>
              <Download className="w-4 h-4 mr-1" />
              <span className="hidden sm:inline">Download PDF</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content: Left panel + Preview */}
      <div className="flex-1 flex overflow-hidden">

        {/* Left Panel — swaps between Editor and Style Settings */}
        <div className="w-1/2 overflow-y-auto border-r border-border bg-background">
          {!settingsOpen ? (
            /* ---- Section Editor ---- */
            <div className="p-4">
              <div className="mb-4">
                <h2 className="text-lg font-semibold">Edit Sections</h2>
                <p className="text-xs text-muted-foreground">
                  Use **bold** for keywords. Lines starting with "- " become bullet points.
                </p>
              </div>
              <ResumeEditor
                sections={resumeSections}
                onSectionsChange={setResumeSections}
              />
            </div>
          ) : (
            /* ---- Style Settings ---- */
            <div className="p-6 px-8 space-y-8 max-w-lg mx-auto">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Style Settings</h2>
                <button
                  onClick={resetSettings}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  title="Reset to defaults"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reset
                </button>
              </div>

              {/* Typography */}
              <div className="space-y-5">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b border-border pb-2">
                  Typography
                </div>
                <SettingRow
                  label="Font Size" value={settings.fontSize}
                  min={8} max={14} step={0.5} unit="pt"
                  onChange={(v) => updateSetting("fontSize", v)}
                />
                <SettingRow
                  label="Line Height" value={settings.lineHeight}
                  min={1.0} max={2.0} step={0.05} unit=""
                  onChange={(v) => updateSetting("lineHeight", v)}
                />
                <SettingRow
                  label="Name Size" value={settings.nameFontSize}
                  min={16} max={30} step={1} unit="pt"
                  onChange={(v) => updateSetting("nameFontSize", v)}
                />
                <SettingRow
                  label="Heading Size" value={settings.headerSize}
                  min={10} max={18} step={0.5} unit="pt"
                  onChange={(v) => updateSetting("headerSize", v)}
                />
              </div>

              {/* Spacing */}
              <div className="space-y-5">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b border-border pb-2">
                  Spacing
                </div>
                <SettingRow
                  label="Left & Right Margin" value={settings.marginX}
                  min={5} max={30} step={1} unit="mm"
                  onChange={(v) => updateSetting("marginX", v)}
                />
                <SettingRow
                  label="Top & Bottom Margin" value={settings.marginY}
                  min={5} max={30} step={1} unit="mm"
                  onChange={(v) => updateSetting("marginY", v)}
                />
                <SettingRow
                  label="Section Spacing" value={settings.sectionSpacing}
                  min={4} max={24} step={1} unit="px"
                  onChange={(v) => updateSetting("sectionSpacing", v)}
                />
              </div>
            </div>
          )}
        </div>

        {/* Right: Preview Panel */}
        <div className="flex-1 overflow-y-auto bg-gray-100">
          <div className="p-4 flex justify-center">
            <div className="bg-white shadow-lg border border-gray-200 w-full max-w-[8.5in] min-h-[11in]">
              <ResumePreview
                sections={resumeSections}
                profile={profile}
                settings={settings}
              />
            </div>
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
              Upload a PDF/DOCX file or paste your resume text below
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
                <span className="bg-background px-2 text-muted-foreground">Or paste text</span>
              </div>
            </div>

            {/* Text Paste */}
            <div>
              <Label htmlFor="resume-upload">Resume Content</Label>
              <Textarea
                id="resume-upload"
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
              <Button onClick={handleUploadResume} className="flex-1" disabled={isSubmitDisabled}>
                {isSubmitting ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Parsing...</>
                ) : (
                  <><Upload className="w-4 h-4 mr-2" />Submit Resume</>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => { setUploadDialogOpen(false); resetUploadState(); }}
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
