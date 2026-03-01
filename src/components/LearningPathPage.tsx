import { ArrowLeft, BookOpen, Video, FileText, CheckCircle2, AlertCircle, TrendingUp } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";
import { useEffect, useMemo, useState } from "react";

interface LearningPathPageProps {
  jobId: string;
  onBack: () => void;
  onRetakeInterview: (jobId: string) => void;
}

const feedbackData = {
  overallScore: 78,
  strengths: [
    "Strong understanding of React fundamentals",
    "Good communication skills",
    "Clear problem-solving approach"
  ],
  improvements: [
    "TypeScript advanced patterns",
    "System design principles",
    "Performance optimization techniques"
  ],
  resources: [
    {
      id: 1,
      type: "video",
      title: "Advanced TypeScript Patterns",
      description: "Learn advanced TypeScript patterns including generics, conditional types, and utility types.",
      link: "#",
      duration: "2h 30m",
      difficulty: "Advanced"
    },
    {
      id: 2,
      type: "article",
      title: "React Performance Optimization",
      description: "Comprehensive guide to optimizing React applications for production.",
      link: "#",
      duration: "15 min read",
      difficulty: "Intermediate"
    },
    {
      id: 3,
      type: "course",
      title: "System Design Interview Prep",
      description: "Master system design concepts with real-world examples and practice problems.",
      link: "#",
      duration: "8 hours",
      difficulty: "Advanced"
    },
    {
      id: 4,
      type: "video",
      title: "Behavioral Interview Masterclass",
      description: "Learn how to structure compelling answers using the STAR method.",
      link: "#",
      duration: "1h 45m",
      difficulty: "Beginner"
    },
    {
      id: 5,
      type: "article",
      title: "Code Review Best Practices",
      description: "Essential skills for reviewing code and collaborating with teams effectively.",
      link: "#",
      duration: "10 min read",
      difficulty: "Intermediate"
    }
  ]
};

export function LearningPathPage({ jobId, onBack, onRetakeInterview }: LearningPathPageProps) {
  const [scores, setScores] = useState<any | null>(null);
  const [plan, setPlan] = useState<any | null>(null);

  useEffect(() => {
    try {
      const storedScores = localStorage.getItem('lastLearningScores');
      const storedPlan = localStorage.getItem('lastLearningPlan');
      if (storedScores) setScores(JSON.parse(storedScores));
      if (storedPlan) setPlan(JSON.parse(storedPlan));
    } catch (e) {
      // ignore
    }
  }, []);

  const overallPercent = useMemo(() => {
    if (!scores?.overall) return null;
    const { total_score, total_max } = scores.overall;
    if (!total_max) return 0;
    return (total_score / total_max) * 100;
  }, [scores]);

  const getPriorityBadge = (priority?: string) => {
    const base = "px-2 py-0.5 rounded text-xs font-medium";
    switch ((priority || '').toLowerCase()) {
      case 'high': return <span className={`${base} bg-red-500/10 text-red-700 dark:text-red-400`}>High</span>;
      case 'medium': return <span className={`${base} bg-orange-500/10 text-orange-700 dark:text-orange-400`}>Medium</span>;
      case 'low': return <span className={`${base} bg-green-500/10 text-green-700 dark:text-green-400`}>Low</span>;
      default: return null;
    }
  };
  const getTypeIcon = (type: string) => {
    switch (type) {
      case "video": return <Video className="w-4 h-4" />;
      case "article": return <FileText className="w-4 h-4" />;
      case "course": return <BookOpen className="w-4 h-4" />;
      default: return <BookOpen className="w-4 h-4" />;
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "Beginner": return "bg-green-500/10 text-green-700 dark:text-green-400";
      case "Intermediate": return "bg-orange-500/10 text-orange-700 dark:text-orange-400";
      case "Advanced": return "bg-red-500/10 text-red-700 dark:text-red-400";
      default: return "bg-gray-500/10 text-gray-700 dark:text-gray-400";
    }
  };

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Top Navigation */}
      <div className="bg-background border-b border-border sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" onClick={onBack} size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Job
          </Button>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="mb-2">Your Learning Path</h1>
          <p className="text-muted-foreground">
            Based on your interview performance, here's a personalized roadmap to help you improve
          </p>
        </div>

        {/* Overall Score (dynamic if available) */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Interview Performance</CardTitle>
            <CardDescription>Overall assessment based on all questions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="text-4xl">
                  <span className={(overallPercent ?? feedbackData.overallScore) >= 70 ? "text-green-600" : "text-orange-600"}>
                    {Math.round(overallPercent ?? feedbackData.overallScore)}%
                  </span>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="w-4 h-4 text-green-600" />
                    <span className="text-sm">{(overallPercent ?? feedbackData.overallScore) >= 70 ? 'Good performance!' : 'Keep improving!'}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    You're on the right track. Focus on the areas below to improve further.
                  </p>
                </div>
              </div>
            </div>
            <Progress value={overallPercent ?? feedbackData.overallScore} className="h-2" />
          </CardContent>
        </Card>

        {/* Overview */}
        {plan?.overview && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Overview</CardTitle>
              <CardDescription>{plan.job_title ?? scores?.job_title}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{plan.overview}</p>
            </CardContent>
          </Card>
        )}

        {/* Quick Wins */}
        {Array.isArray(plan?.quick_wins) && plan.quick_wins.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Quick Wins</CardTitle>
              <CardDescription>Actionable steps to start immediately</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 list-disc ml-5">
                {plan.quick_wins.map((win: string, idx: number) => (
                  <li key={idx} className="text-sm">{win}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Topics */}
        {Array.isArray(plan?.topics) && plan.topics.length > 0 && (
          <div className="space-y-6 mb-8">
            {plan.topics.map((topic: any, idx: number) => (
              <Card key={idx} className="">
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <CardTitle className="mb-1">{topic.topic}</CardTitle>
                      <CardDescription className="capitalize">Skill Area: {topic.skill_area}</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      {getPriorityBadge(topic.priority)}
                      {typeof topic.target_score === 'number' && (
                        <Badge variant="outline">Target: {Math.round(topic.target_score)}%</Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {topic.why && (
                    <div>
                      <h3 className="text-sm font-medium mb-1">Why this matters</h3>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{topic.why}</p>
                    </div>
                  )}

                  {Array.isArray(topic.actions) && topic.actions.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium mb-1">Actions</h3>
                      <ul className="space-y-1 list-disc ml-5">
                        {topic.actions.map((a: string, i: number) => (
                          <li key={i} className="text-sm">{a}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {Array.isArray(topic.practice_tasks) && topic.practice_tasks.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium mb-1">Practice Tasks</h3>
                      <ul className="space-y-1 list-disc ml-5">
                        {topic.practice_tasks.map((t: string, i: number) => (
                          <li key={i} className="text-sm">{t}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {Array.isArray(topic.resources) && topic.resources.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium mb-2">Resources</h3>
                      <div className="space-y-3">
                        {topic.resources.map((resource: any, rIdx: number) => (
                          <div key={rIdx} className="p-3 rounded-md border bg-background">
                            <div className="flex items-start justify-between gap-4">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <Badge variant="outline" className="capitalize">{resource.type ?? 'resource'}</Badge>
                                  {resource.provider && (
                                    <span className="text-xs text-muted-foreground">{resource.provider}</span>
                                  )}
                                </div>
                                <div className="font-medium break-words">{resource.title}</div>
                                {resource.url && (
                                  <a href={resource.url} target="_blank" rel="noreferrer" className="text-xs text-primary underline break-all">{resource.url}</a>
                                )}
                                {resource.cost || resource.est_time_hours ? (
                                  <div className="text-xs text-muted-foreground mt-1">
                                    {resource.cost && <span>Cost: {resource.cost}</span>}
                                    {resource.cost && resource.est_time_hours && <span> • </span>}
                                    {resource.est_time_hours && <span>Est. Time: {resource.est_time_hours}h</span>}
                                  </div>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Strengths and Improvements */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Strengths */}
          <Card className="border-green-200 dark:border-green-900">
            <CardHeader>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <CardTitle>Strengths</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {feedbackData.strengths.map((strength, idx) => (
                  <li key={idx} className="flex gap-2 text-sm">
                    <span className="text-green-600 mt-1">✓</span>
                    <span>{strength}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Areas for Improvement */}
          <Card className="border-orange-200 dark:border-orange-900">
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-orange-600" />
                <CardTitle>Areas to Improve</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {feedbackData.improvements.map((improvement, idx) => (
                  <li key={idx} className="flex gap-2 text-sm">
                    <span className="text-orange-600 mt-1">→</span>
                    <span>{improvement}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Learning Resources (fallback when no topic resources) */}
        <div className="mb-8">
          <div className="mb-4">
            <h2 className="mb-1">Recommended Resources</h2>
            <p className="text-muted-foreground">
              Curated content to help you master the skills you need
            </p>
          </div>

          <div className="space-y-4">
            {((plan?.resources && plan.resources.length > 0) ? plan.resources : feedbackData.resources).map((resource: any) => (
              <Card key={resource.id ?? resource.title} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      {getTypeIcon(resource.type ?? 'article')}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <h3 className="break-words">{resource.title}</h3>
                        {resource.difficulty && (
                          <Badge className={getDifficultyColor(resource.difficulty)}>
                            {resource.difficulty}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">
                        {resource.description}
                      </p>
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <Badge variant="outline" className="capitalize">
                            {resource.type ?? 'article'}
                          </Badge>
                          {resource.duration && <span>{resource.duration}</span>}
                        </div>
                        {resource.link && (
                          <Button asChild size="sm" variant="outline">
                            <a href={resource.link} target="_blank" rel="noreferrer">View Resource</a>
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Study Schedule */}
        {Array.isArray(plan?.study_schedule) && plan.study_schedule.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Study Schedule</CardTitle>
              <CardDescription>Suggested pacing to reach your targets</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 list-disc ml-5">
                {plan.study_schedule.map((s: string, idx: number) => (
                  <li key={idx} className="text-sm">{s}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* CTA */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h3 className="mb-1">Want to improve your score?</h3>
                <p className="text-sm text-muted-foreground">
                  Retake the interview after reviewing the resources
                </p>
              </div>
              <Button onClick={() => onRetakeInterview(jobId)}>
                Retake Interview
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
