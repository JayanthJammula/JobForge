import { useState } from "react";
import { Sparkles, Save, Plus, Trash2, GripVertical, ChevronUp, ChevronDown, Pencil, X, Check } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader } from "./ui/card";
import { Textarea } from "./ui/textarea";
import { Input } from "./ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Label } from "./ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { improveSectionWithGemini } from "../lib/resumeImprove";

export interface ResumeSection {
  id: string;
  title: string;
  content: string;
  aiSuggestion?: string;
}

interface ResumeEditorProps {
  sections: ResumeSection[];
  onSectionsChange: (sections: ResumeSection[]) => void;
  jobTitle?: string;
  jobDescription?: string;
}

export function ResumeEditor({ sections, onSectionsChange, jobTitle, jobDescription }: ResumeEditorProps) {
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editingTitle, setEditingTitle] = useState<string | null>(null);
  const [editTitleValue, setEditTitleValue] = useState("");
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [currentAiSection, setCurrentAiSection] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newSectionTitle, setNewSectionTitle] = useState("");

  // --- Content editing ---
  const handleEdit = (sectionId: string, content: string) => {
    setEditingSection(sectionId);
    setEditContent(content);
  };

  const handleSave = (sectionId: string) => {
    onSectionsChange(
      sections.map(section =>
        section.id === sectionId ? { ...section, content: editContent } : section
      )
    );
    setEditingSection(null);
    setEditContent("");
  };

  const handleCancel = () => {
    setEditingSection(null);
    setEditContent("");
  };

  // --- Title editing ---
  const handleEditTitle = (sectionId: string, currentTitle: string) => {
    setEditingTitle(sectionId);
    setEditTitleValue(currentTitle);
  };

  const handleSaveTitle = (sectionId: string) => {
    const title = editTitleValue.trim();
    if (!title) return;
    onSectionsChange(
      sections.map(section =>
        section.id === sectionId ? { ...section, title } : section
      )
    );
    setEditingTitle(null);
    setEditTitleValue("");
  };

  // --- Reorder ---
  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newSections = [...sections];
    [newSections[index - 1], newSections[index]] = [newSections[index], newSections[index - 1]];
    onSectionsChange(newSections);
  };

  const handleMoveDown = (index: number) => {
    if (index >= sections.length - 1) return;
    const newSections = [...sections];
    [newSections[index], newSections[index + 1]] = [newSections[index + 1], newSections[index]];
    onSectionsChange(newSections);
  };

  // --- Add / Delete ---
  const handleAddSection = () => {
    const title = newSectionTitle.trim();
    if (!title) return;
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || `section-${Date.now()}`;
    let id = slug;
    if (sections.some(s => s.id === id)) {
      id = `${slug}-${Date.now()}`;
    }
    onSectionsChange([...sections, { id, title, content: "" }]);
    setNewSectionTitle("");
    setAddDialogOpen(false);
    setEditingSection(id);
    setEditContent("");
  };

  const handleDeleteSection = (sectionId: string) => {
    onSectionsChange(sections.filter(s => s.id !== sectionId));
    if (editingSection === sectionId) {
      setEditingSection(null);
      setEditContent("");
    }
  };

  // --- AI Improve ---
  const handleAiImprove = async (sectionId: string) => {
    const section = sections.find(s => s.id === sectionId);
    if (!section) return;

    setCurrentAiSection(sectionId);
    setIsGenerating(true);
    try {
      const { improved } = await improveSectionWithGemini({
        title: section.title,
        content: section.content,
        jobTitle,
        jobDescription,
      });

      onSectionsChange(
        sections.map(s =>
          s.id === sectionId ? { ...s, aiSuggestion: improved } : s
        )
      );
      setAiDialogOpen(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to generate improvement.";
      alert(message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAcceptAiSuggestion = () => {
    if (!currentAiSection) return;
    onSectionsChange(
      sections.map(section =>
        section.id === currentAiSection && section.aiSuggestion
          ? { ...section, content: section.aiSuggestion, aiSuggestion: undefined }
          : section
      )
    );
    setAiDialogOpen(false);
    setCurrentAiSection(null);
  };

  const handleRejectAiSuggestion = () => {
    if (!currentAiSection) return;
    onSectionsChange(
      sections.map(section =>
        section.id === currentAiSection
          ? { ...section, aiSuggestion: undefined }
          : section
      )
    );
    setAiDialogOpen(false);
    setCurrentAiSection(null);
  };

  const currentAiSuggestion = currentAiSection
    ? sections.find(s => s.id === currentAiSection)?.aiSuggestion
    : null;
  const currentOriginalContent = currentAiSection
    ? sections.find(s => s.id === currentAiSection)?.content
    : null;

  return (
    <>
      <div className="space-y-3">
        {sections.map((section, index) => (
          <Card key={section.id} className="group">
            <CardHeader className="py-3 px-4">
              <div className="flex items-center gap-2">
                {/* Reorder buttons */}
                <div className="flex flex-col -my-1">
                  <button
                    className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
                    onClick={() => handleMoveUp(index)}
                    disabled={index === 0}
                    title="Move up"
                  >
                    <ChevronUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
                    onClick={() => handleMoveDown(index)}
                    disabled={index === sections.length - 1}
                    title="Move down"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Section title (editable) */}
                <div className="flex-1 min-w-0">
                  {editingTitle === section.id ? (
                    <div className="flex items-center gap-1">
                      <Input
                        value={editTitleValue}
                        onChange={(e) => setEditTitleValue(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") handleSaveTitle(section.id); if (e.key === "Escape") setEditingTitle(null); }}
                        className="h-7 text-sm font-semibold"
                        autoFocus
                      />
                      <button onClick={() => handleSaveTitle(section.id)} className="p-1 text-green-600 hover:text-green-700"><Check className="w-4 h-4" /></button>
                      <button onClick={() => setEditingTitle(null)} className="p-1 text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
                    </div>
                  ) : (
                    <button
                      className="text-sm font-semibold text-left hover:text-primary flex items-center gap-1 group/title"
                      onClick={() => handleEditTitle(section.id, section.title)}
                      title="Click to rename"
                    >
                      {section.title}
                      <Pencil className="w-3 h-3 opacity-0 group-hover/title:opacity-50" />
                    </button>
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  {editingSection === section.id ? (
                    <>
                      <Button size="sm" variant="default" className="h-7 text-xs" onClick={() => handleSave(section.id)}>
                        <Save className="w-3.5 h-3.5 mr-1" />Save
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={handleCancel}>Cancel</Button>
                    </>
                  ) : (
                    <>
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleEdit(section.id, section.content)}>
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={() => handleAiImprove(section.id)}
                        disabled={isGenerating && currentAiSection === section.id}
                      >
                        <Sparkles className="w-3.5 h-3.5 mr-1" />
                        {isGenerating && currentAiSection === section.id ? "..." : "AI"}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs text-muted-foreground hover:text-destructive"
                        onClick={() => handleDeleteSection(section.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-3 pt-0">
              {editingSection === section.id ? (
                <Textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="min-h-[150px] font-mono text-xs leading-relaxed"
                  placeholder="Enter section content..."
                />
              ) : (
                <div
                  className="text-xs text-muted-foreground whitespace-pre-line cursor-pointer hover:bg-muted/50 rounded p-2 -m-2 transition-colors line-clamp-6"
                  onClick={() => handleEdit(section.id, section.content)}
                  title="Click to edit"
                >
                  {section.content || <span className="italic">Click to add content...</span>}
                </div>
              )}
            </CardContent>
          </Card>
        ))}

        {/* Add Section */}
        <button
          className="w-full border-2 border-dashed border-muted-foreground/25 rounded-lg py-4 text-sm text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors flex items-center justify-center gap-2"
          onClick={() => setAddDialogOpen(true)}
        >
          <Plus className="w-4 h-4" />
          Add Section
        </button>
      </div>

      {/* AI Suggestion Dialog */}
      <Dialog open={aiDialogOpen} onOpenChange={setAiDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>AI Improvement Suggestion</DialogTitle>
            <DialogDescription>
              {jobTitle
                ? `AI-tailored improvement for ${jobTitle} position`
                : "Review the AI-generated improvement and decide whether to accept it"
              }
            </DialogDescription>
          </DialogHeader>
          <Tabs defaultValue="comparison" className="flex-1">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="comparison">Side by Side</TabsTrigger>
              <TabsTrigger value="original">Original</TabsTrigger>
              <TabsTrigger value="improved">AI Improved</TabsTrigger>
            </TabsList>
            <TabsContent value="comparison" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="mb-2 block">Original</Label>
                  <div className="bg-muted rounded-lg p-4 min-h-[200px] max-h-[50vh] overflow-auto whitespace-pre-line break-words text-sm">
                    {currentOriginalContent}
                  </div>
                </div>
                <div>
                  <Label className="mb-2 block">AI Improved</Label>
                  <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 min-h-[200px] max-h-[50vh] overflow-auto whitespace-pre-line break-words text-sm">
                    {currentAiSuggestion}
                  </div>
                </div>
              </div>
            </TabsContent>
            <TabsContent value="original">
              <div className="bg-muted rounded-lg p-4 min-h-[300px] max-h-[60vh] overflow-auto whitespace-pre-line break-words">
                {currentOriginalContent}
              </div>
            </TabsContent>
            <TabsContent value="improved">
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 min-h-[300px] max-h-[60vh] overflow-auto whitespace-pre-line break-words">
                {currentAiSuggestion}
              </div>
            </TabsContent>
          </Tabs>
          <div className="flex gap-2 pt-4">
            <Button onClick={handleAcceptAiSuggestion} className="flex-1">
              Accept AI Version
            </Button>
            <Button variant="outline" onClick={handleRejectAiSuggestion} className="flex-1">
              Keep Original
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Section Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={(open) => { setAddDialogOpen(open); if (!open) setNewSectionTitle(""); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Section</DialogTitle>
            <DialogDescription>Enter a title for the new resume section</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="new-section-title">Section Title</Label>
              <Input
                id="new-section-title"
                value={newSectionTitle}
                onChange={(e) => setNewSectionTitle(e.target.value)}
                placeholder="e.g. Projects, Certifications, Volunteer..."
                className="mt-2"
                onKeyDown={(e) => { if (e.key === "Enter") handleAddSection(); }}
                autoFocus
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleAddSection} className="flex-1" disabled={!newSectionTitle.trim()}>
                <Plus className="w-4 h-4 mr-2" />
                Add Section
              </Button>
              <Button variant="outline" onClick={() => { setAddDialogOpen(false); setNewSectionTitle(""); }}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
