import { useState, useEffect, useRef } from "react";
import { ArrowLeft, Play, Loader2, CheckCircle2, XCircle, ChevronRight, Lightbulb, Code2 } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { generateChallenges, type CodingChallenge } from "../services/pulseApi";
import { runTestCases, type RunResult } from "../lib/codeRunner";

interface Props {
  jobId: string;
  jobData?: any;
  onBack: () => void;
}

export function CodingChallengePage({ jobId, jobData, onBack }: Props) {
  const [loading, setLoading] = useState(true);
  const [challenges, setChallenges] = useState<CodingChallenge[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState("javascript");
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<RunResult[] | null>(null);
  const [passedCount, setPassedCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [showHints, setShowHints] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [difficulty, setDifficulty] = useState("medium");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const loadChallenges = async () => {
    setLoading(true);
    setError(null);
    try {
      const desc = jobData?.description || `Job ID: ${jobId}`;
      const generated = await generateChallenges(desc, difficulty, 3, language);
      setChallenges(generated);
      if (generated.length > 0) {
        const starter = generated[0].starter_code[language] || generated[0].starter_code.javascript || "";
        setCode(starter);
      }
    } catch (e: any) {
      setError(e.message || "Failed to generate challenges");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadChallenges();
  }, []);

  const currentChallenge = challenges[currentIndex];

  const handleSelectChallenge = (index: number) => {
    setCurrentIndex(index);
    setResults(null);
    setShowHints(false);
    const ch = challenges[index];
    if (ch) {
      setCode(ch.starter_code[language] || ch.starter_code.javascript || "");
    }
  };

  const handleRun = async () => {
    if (!currentChallenge) return;
    setRunning(true);
    setResults(null);
    try {
      const { results: r, passed, total } = await runTestCases(
        code,
        currentChallenge.test_cases,
        language
      );
      setResults(r);
      setPassedCount(passed);
      setTotalCount(total);
    } catch (e: any) {
      setResults([{ output: "", error: e.message, passed: false }]);
    } finally {
      setRunning(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const target = e.target as HTMLTextAreaElement;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const newCode = code.substring(0, start) + "  " + code.substring(end);
      setCode(newCode);
      setTimeout(() => {
        target.selectionStart = target.selectionEnd = start + 2;
      }, 0);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        <Button variant="ghost" size="sm" onClick={onBack} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          <span className="ml-3 text-muted-foreground">Generating coding challenges...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        <Button variant="ghost" size="sm" onClick={onBack} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-destructive mb-4">{error}</p>
            <Button onClick={loadChallenges}>Retry</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>
          <h1 className="text-xl font-bold">Coding Challenges</h1>
        </div>
        <div className="flex items-center gap-2">
          <Select value={difficulty} onValueChange={setDifficulty}>
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="easy">Easy</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="hard">Hard</SelectItem>
            </SelectContent>
          </Select>
          <Select value={language} onValueChange={setLanguage}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="javascript">JavaScript</SelectItem>
              <SelectItem value="python">Python</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Challenge selector */}
      {challenges.length > 1 && (
        <div className="flex gap-2 mb-4 overflow-x-auto">
          {challenges.map((ch, i) => (
            <Button
              key={ch.id}
              variant={i === currentIndex ? "default" : "outline"}
              size="sm"
              onClick={() => handleSelectChallenge(i)}
            >
              {i + 1}. {ch.title}
            </Button>
          ))}
        </div>
      )}

      {currentChallenge && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Left: Problem */}
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{currentChallenge.title}</CardTitle>
                  <Badge variant={
                    currentChallenge.difficulty === "easy" ? "secondary" :
                    currentChallenge.difficulty === "hard" ? "destructive" :
                    "default"
                  }>
                    {currentChallenge.difficulty}
                  </Badge>
                </div>
                <Badge variant="outline" className="w-fit">{currentChallenge.category}</Badge>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="prose prose-sm max-w-none">
                  <p className="whitespace-pre-wrap">{currentChallenge.description}</p>
                </div>

                {/* Examples */}
                {currentChallenge.examples.length > 0 && (
                  <div>
                    <h4 className="font-medium text-sm mb-2">Examples</h4>
                    {currentChallenge.examples.map((ex, i) => (
                      <div key={i} className="bg-muted rounded-md p-3 mb-2 text-sm font-mono">
                        <div><span className="text-muted-foreground">Input: </span>{ex.input}</div>
                        <div><span className="text-muted-foreground">Output: </span>{ex.output}</div>
                        {ex.explanation && (
                          <div className="text-muted-foreground mt-1 font-sans text-xs">{ex.explanation}</div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Constraints */}
                {currentChallenge.constraints.length > 0 && (
                  <div>
                    <h4 className="font-medium text-sm mb-1">Constraints</h4>
                    <ul className="text-sm text-muted-foreground list-disc pl-4">
                      {currentChallenge.constraints.map((c, i) => (
                        <li key={i}>{c}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Hints */}
                {currentChallenge.solution_hints.length > 0 && (
                  <div>
                    <Button variant="ghost" size="sm" onClick={() => setShowHints(!showHints)} className="gap-1 p-0 h-auto">
                      <Lightbulb className="w-4 h-4 text-yellow-500" />
                      {showHints ? "Hide Hints" : "Show Hints"}
                    </Button>
                    {showHints && (
                      <ul className="text-sm text-muted-foreground list-disc pl-4 mt-1">
                        {currentChallenge.solution_hints.map((h, i) => (
                          <li key={i}>{h}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right: Code Editor + Results */}
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Code2 className="w-4 h-4" />
                    Code Editor
                  </CardTitle>
                  <Button onClick={handleRun} disabled={running} size="sm">
                    {running ? (
                      <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Running...</>
                    ) : (
                      <><Play className="w-4 h-4 mr-1" /> Run Tests</>
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <textarea
                  ref={textareaRef}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="w-full h-80 bg-zinc-950 text-green-400 font-mono text-sm p-4 rounded-md border border-border resize-none focus:outline-none focus:ring-1 focus:ring-ring"
                  spellCheck={false}
                  placeholder="Write your solution here..."
                />
              </CardContent>
            </Card>

            {/* Test Results */}
            {results && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    Test Results
                    <Badge variant={passedCount === totalCount ? "default" : "destructive"}>
                      {passedCount}/{totalCount} passed
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {results.map((r, i) => {
                      const tc = currentChallenge.test_cases[i];
                      const isHidden = tc?.is_hidden;
                      return (
                        <div key={i} className={`flex items-start gap-2 p-2 rounded text-sm ${r.passed ? "bg-green-500/10" : "bg-red-500/10"}`}>
                          {r.passed ? (
                            <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                          )}
                          <div className="min-w-0">
                            <span className="font-medium">Test {i + 1}</span>
                            {isHidden ? (
                              <span className="text-muted-foreground ml-2">(hidden)</span>
                            ) : (
                              <div className="font-mono text-xs mt-1 space-y-0.5">
                                <div>Input: {tc?.input}</div>
                                <div>Expected: {tc?.expected_output}</div>
                                <div>Got: {r.output || "(empty)"}</div>
                                {r.error && <div className="text-red-400">Error: {r.error}</div>}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
