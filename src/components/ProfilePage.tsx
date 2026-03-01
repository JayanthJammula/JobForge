import { useState } from "react";
import { ArrowLeft, User, Mail, Phone, MapPin, Briefcase, FileText, Edit, Save, X, Plus, DollarSign, Clock } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Separator } from "./ui/separator";
import { Badge } from "./ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { syncProfileToBackend, type ExtendedProfile } from "../lib/profileSync";

interface ProfilePageProps {
  onBack: () => void;
  onEditResume: () => void;
}

const DEFAULT_PROFILE: ExtendedProfile = {
  name: "",
  email: "",
  phone: "",
  location: "",
  title: "",
  bio: "",
  skills: [],
  experienceYears: 0,
  salaryExpectationMin: null,
  salaryExpectationMax: null,
  preferredLocations: [],
  remotePreference: "any",
  preferredSeniority: "any",
};

function loadProfile(): ExtendedProfile {
  try {
    const stored = localStorage.getItem("profile");
    if (stored) {
      const p = JSON.parse(stored);
      return {
        name: p?.name || "",
        email: p?.email || "",
        phone: p?.phone || "",
        location: p?.location || "",
        title: p?.title || "",
        bio: p?.bio || "",
        skills: p?.skills || [],
        experienceYears: p?.experienceYears || 0,
        salaryExpectationMin: p?.salaryExpectationMin ?? null,
        salaryExpectationMax: p?.salaryExpectationMax ?? null,
        preferredLocations: p?.preferredLocations || [],
        remotePreference: p?.remotePreference || "any",
        preferredSeniority: p?.preferredSeniority || "any",
      };
    }
  } catch {}
  return { ...DEFAULT_PROFILE };
}

export function ProfilePage({ onBack, onEditResume }: ProfilePageProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [profile, setProfile] = useState<ExtendedProfile>(loadProfile);
  const [editedProfile, setEditedProfile] = useState<ExtendedProfile>(profile);
  const [skillInput, setSkillInput] = useState("");
  const [locationInput, setLocationInput] = useState("");
  const [syncing, setSyncing] = useState(false);

  const handleSave = async () => {
    setProfile(editedProfile);
    try {
      localStorage.setItem("profile", JSON.stringify(editedProfile));
    } catch {}
    setIsEditing(false);

    // Sync to backend
    setSyncing(true);
    await syncProfileToBackend(editedProfile);
    setSyncing(false);
  };

  const handleCancel = () => {
    setEditedProfile(profile);
    setIsEditing(false);
  };

  const addSkill = () => {
    const skill = skillInput.trim();
    if (skill && !editedProfile.skills.includes(skill)) {
      setEditedProfile({ ...editedProfile, skills: [...editedProfile.skills, skill] });
    }
    setSkillInput("");
  };

  const removeSkill = (skill: string) => {
    setEditedProfile({ ...editedProfile, skills: editedProfile.skills.filter((s) => s !== skill) });
  };

  const addLocation = () => {
    const loc = locationInput.trim();
    if (loc && !editedProfile.preferredLocations.includes(loc)) {
      setEditedProfile({ ...editedProfile, preferredLocations: [...editedProfile.preferredLocations, loc] });
    }
    setLocationInput("");
  };

  const removeLocation = (loc: string) => {
    setEditedProfile({ ...editedProfile, preferredLocations: editedProfile.preferredLocations.filter((l) => l !== loc) });
  };

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Top Navigation */}
      <div className="bg-background border-b border-border sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={onBack} size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            {!isEditing && (
              <Button variant="outline" onClick={() => setIsEditing(true)}>
                <Edit className="w-4 h-4 mr-2" />
                Edit Profile
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="mb-2">My Profile</h1>
          <p className="text-muted-foreground">
            Manage your personal information, skills, and matching preferences
          </p>
        </div>

        {/* Profile Information */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
            <CardDescription>
              Your basic profile details
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {isEditing ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input id="name" value={editedProfile.name} onChange={(e) => setEditedProfile({ ...editedProfile, name: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="title">Job Title</Label>
                    <Input id="title" value={editedProfile.title} onChange={(e) => setEditedProfile({ ...editedProfile, title: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" value={editedProfile.email} onChange={(e) => setEditedProfile({ ...editedProfile, email: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input id="phone" type="tel" value={editedProfile.phone} onChange={(e) => setEditedProfile({ ...editedProfile, phone: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location">Current Location</Label>
                  <Input id="location" value={editedProfile.location} onChange={(e) => setEditedProfile({ ...editedProfile, location: e.target.value })} placeholder="e.g. San Francisco, CA" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bio">Bio</Label>
                  <Input id="bio" value={editedProfile.bio} onChange={(e) => setEditedProfile({ ...editedProfile, bio: e.target.value })} />
                </div>
              </>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                      <User className="w-5 h-5 text-primary-foreground" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Name</p>
                      <p>{profile.name || "Not set"}</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                      <Briefcase className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Title</p>
                      <p>{profile.title || "Not set"}</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                      <Mail className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <p>{profile.email || "Not set"}</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                      <Phone className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Phone</p>
                      <p>{profile.phone || "Not set"}</p>
                    </div>
                  </div>
                  <div className="flex gap-3 md:col-span-2">
                    <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                      <MapPin className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Location</p>
                      <p>{profile.location || "Not set"}</p>
                    </div>
                  </div>
                </div>
                {profile.bio && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Bio</p>
                      <p className="text-muted-foreground">{profile.bio}</p>
                    </div>
                  </>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Skills & Matching Preferences */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Skills & Matching Preferences</CardTitle>
            <CardDescription>
              Used for Smart Job Matching. Add your skills and preferences to get personalized job recommendations.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {isEditing ? (
              <>
                {/* Skills */}
                <div className="space-y-2">
                  <Label>Skills</Label>
                  <div className="flex gap-2">
                    <Input
                      value={skillInput}
                      onChange={(e) => setSkillInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSkill())}
                      placeholder="Type a skill and press Enter"
                    />
                    <Button variant="outline" size="sm" onClick={addSkill} type="button">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {editedProfile.skills.map((skill) => (
                      <Badge key={skill} variant="secondary" className="gap-1 pr-1">
                        {skill}
                        <button onClick={() => removeSkill(skill)} className="ml-1 hover:text-destructive">
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Experience */}
                <div className="space-y-2">
                  <Label htmlFor="experience">Years of Experience</Label>
                  <Input
                    id="experience"
                    type="number"
                    min={0}
                    max={50}
                    value={editedProfile.experienceYears}
                    onChange={(e) => setEditedProfile({ ...editedProfile, experienceYears: parseInt(e.target.value) || 0 })}
                  />
                </div>

                {/* Salary */}
                <div className="space-y-2">
                  <Label>Salary Expectation (Annual USD)</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                      <Input
                        className="pl-8"
                        type="number"
                        placeholder="Min"
                        value={editedProfile.salaryExpectationMin ?? ""}
                        onChange={(e) => setEditedProfile({ ...editedProfile, salaryExpectationMin: e.target.value ? parseFloat(e.target.value) : null })}
                      />
                    </div>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                      <Input
                        className="pl-8"
                        type="number"
                        placeholder="Max"
                        value={editedProfile.salaryExpectationMax ?? ""}
                        onChange={(e) => setEditedProfile({ ...editedProfile, salaryExpectationMax: e.target.value ? parseFloat(e.target.value) : null })}
                      />
                    </div>
                  </div>
                </div>

                {/* Remote Preference */}
                <div className="space-y-2">
                  <Label>Remote Preference</Label>
                  <Select value={editedProfile.remotePreference} onValueChange={(v) => setEditedProfile({ ...editedProfile, remotePreference: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Any (No preference)</SelectItem>
                      <SelectItem value="remote">Remote Only</SelectItem>
                      <SelectItem value="hybrid">Hybrid</SelectItem>
                      <SelectItem value="onsite">On-site</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Seniority */}
                <div className="space-y-2">
                  <Label>Preferred Seniority Level</Label>
                  <Select value={editedProfile.preferredSeniority} onValueChange={(v) => setEditedProfile({ ...editedProfile, preferredSeniority: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Any</SelectItem>
                      <SelectItem value="intern">Intern</SelectItem>
                      <SelectItem value="junior">Junior</SelectItem>
                      <SelectItem value="mid">Mid-Level</SelectItem>
                      <SelectItem value="senior">Senior</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Preferred Locations */}
                <div className="space-y-2">
                  <Label>Preferred Locations</Label>
                  <div className="flex gap-2">
                    <Input
                      value={locationInput}
                      onChange={(e) => setLocationInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addLocation())}
                      placeholder="e.g. New York, NY"
                    />
                    <Button variant="outline" size="sm" onClick={addLocation} type="button">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {editedProfile.preferredLocations.map((loc) => (
                      <Badge key={loc} variant="outline" className="gap-1 pr-1">
                        <MapPin className="w-3 h-3" />
                        {loc}
                        <button onClick={() => removeLocation(loc)} className="ml-1 hover:text-destructive">
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Save/Cancel */}
                <div className="flex gap-2 pt-4">
                  <Button onClick={handleSave} className="flex-1">
                    <Save className="w-4 h-4 mr-2" />
                    {syncing ? "Saving..." : "Save Changes"}
                  </Button>
                  <Button variant="outline" onClick={handleCancel} className="flex-1">
                    Cancel
                  </Button>
                </div>
              </>
            ) : (
              <>
                {/* Skills Display */}
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Skills</p>
                  {profile.skills.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {profile.skills.map((skill) => (
                        <Badge key={skill} variant="secondary">{skill}</Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-sm italic">No skills added yet. Edit your profile to add skills.</p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex gap-3">
                    <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Experience</p>
                      <p>{profile.experienceYears} years</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                      <DollarSign className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Salary Expectation</p>
                      <p>
                        {profile.salaryExpectationMin || profile.salaryExpectationMax
                          ? `$${(profile.salaryExpectationMin || 0).toLocaleString()} - $${(profile.salaryExpectationMax || 0).toLocaleString()}`
                          : "Not specified"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Remote Preference</p>
                    <Badge variant="outline">{profile.remotePreference}</Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Seniority Level</p>
                    <Badge variant="outline">{profile.preferredSeniority}</Badge>
                  </div>
                </div>

                {profile.preferredLocations.length > 0 && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Preferred Locations</p>
                    <div className="flex flex-wrap gap-1">
                      {profile.preferredLocations.map((loc) => (
                        <Badge key={loc} variant="outline">
                          <MapPin className="w-3 h-3 mr-1" />{loc}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Resume Section */}
        <Card>
          <CardHeader>
            <CardTitle>Resume</CardTitle>
            <CardDescription>
              Manage and improve your resume with AI assistance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={onEditResume} className="w-full" size="lg">
              <FileText className="w-5 h-5 mr-2" />
              Edit & Improve Resume
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
