import { useCallback, useEffect, useState } from "react";
import { ArrowRight, CheckCircle2, ClipboardList, Clock, Trophy, XCircle } from "lucide-react";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiGet, apiPost } from "@/lib/api";

type Question = {
  id: string;
  examType: string;
  difficulty: string;
  question: string;
  options: string[];
  answer: number;
  explanation?: string | null;
};

type Summary = {
  totalAttempts: number;
  avgScore: number;
  latestImprovement: number;
  byExam: Record<string, number>;
};

type ExamState = "idle" | "running" | "finished";

export default function MockExam() {
  const [state, setState] = useState<ExamState>("idle");
  const [questionBank, setQuestionBank] = useState<Question[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [examType, setExamType] = useState("KCET");
  const [difficulty, setDifficulty] = useState("Easy");
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [timeLeft, setTimeLeft] = useState(600);

  const examDurationSeconds = Math.max(600, questionBank.length * 60);

  useEffect(() => {
    const loadQuestions = async () => {
      setLoading(true);
      try {
        const data = await apiGet<{ success: boolean; items: Question[] }>("/content/mock-questions", { examType, difficulty });
        setQuestionBank(data.items);
        setAnswers(new Array(data.items.length).fill(null));
        setCurrentQ(0);
        setTimeLeft(Math.max(600, data.items.length * 60));
        setState("idle");
        setError(null);
      } catch {
        setError("Unable to load mock questions right now.");
      } finally {
        setLoading(false);
      }
    };

    void loadQuestions();
  }, [difficulty, examType]);

  useEffect(() => {
    const loadSummary = async () => {
      try {
        const data = await apiGet<{ success: boolean; item: Summary }>("/interactions/mock-exam-summary");
        setSummary(data.item);
      } catch {
        setSummary(null);
      }
    };

    void loadSummary();
  }, [state]);

  useEffect(() => {
    if (state !== "running" || timeLeft <= 0) {
      if (timeLeft <= 0 && state === "running") setState("finished");
      return;
    }
    const timer = setInterval(() => setTimeLeft((time) => time - 1), 1000);
    return () => clearInterval(timer);
  }, [state, timeLeft]);

  const selectAnswer = useCallback((optIndex: number) => {
    setAnswers((prev) => {
      const next = [...prev];
      next[currentQ] = optIndex;
      return next;
    });
  }, [currentQ]);

  const score = answers.reduce((acc, answer, index) => acc + (answer === questionBank[index]?.answer ? 1 : 0), 0);
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  const resetExam = () => {
    setState("idle");
    setCurrentQ(0);
    setAnswers(new Array(questionBank.length).fill(null));
    setTimeLeft(examDurationSeconds);
  };

  const submitExam = async () => {
    setState("finished");
    await apiPost("/interactions/mock-exam-attempts", {
      examType,
      difficulty,
      score,
      total: questionBank.length,
      correctAnswers: score,
      incorrectAnswers: questionBank.length - score,
      duration: examDurationSeconds - timeLeft
    });
  };

  if (loading) {
    return <DashboardLayout><p className="text-muted-foreground">Loading mock exam...</p></DashboardLayout>;
  }

  if (error) {
    return <DashboardLayout><p className="text-muted-foreground">{error}</p></DashboardLayout>;
  }

  if (!questionBank.length) {
    return <DashboardLayout><p className="text-muted-foreground">No mock questions are available yet for this selection.</p></DashboardLayout>;
  }

  if (state === "idle") {
    return (
      <DashboardLayout>
        <div className="mb-8">
          <h1 className="font-display text-2xl font-bold text-foreground">Mock Examination</h1>
          <p className="text-muted-foreground mt-1">Practice by exam type, difficulty, and track your improvement over time.</p>
        </div>
        <div className="max-w-xl mx-auto bg-card rounded-xl border border-border p-8 text-center">
          <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-4"><ClipboardList className="h-8 w-8 text-primary-foreground" /></div>
          <h2 className="font-display text-xl font-bold text-foreground">{examType} Mock Test</h2>
          <p className="text-muted-foreground mt-2">{questionBank.length} questions • {Math.ceil(examDurationSeconds / 60)} minutes • {difficulty} difficulty</p>

          <div className="mt-6 grid gap-4 text-left">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Exam Type</label>
              <Select value={examType} onValueChange={setExamType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="KCET">KCET</SelectItem>
                  <SelectItem value="PGCET">PGCET</SelectItem>
                  <SelectItem value="DCET">DCET</SelectItem>
                  <SelectItem value="JEE">JEE</SelectItem>
                  <SelectItem value="NEET">NEET</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Difficulty</label>
              <Select value={difficulty} onValueChange={setDifficulty}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Easy">Easy</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="Hard">Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mt-6 mb-6">
            <div className="p-3 rounded-lg bg-muted/50"><p className="text-lg font-bold text-foreground">{questionBank.length}</p><p className="text-xs text-muted-foreground">Questions</p></div>
            <div className="p-3 rounded-lg bg-muted/50"><p className="text-lg font-bold text-foreground">{Math.ceil(examDurationSeconds / 60)}</p><p className="text-xs text-muted-foreground">Minutes</p></div>
            <div className="p-3 rounded-lg bg-muted/50"><p className="text-lg font-bold text-foreground">{difficulty}</p><p className="text-xs text-muted-foreground">Difficulty</p></div>
          </div>

          {summary && (
            <div className="mb-6 rounded-lg bg-muted/30 p-4 text-left">
              <p className="text-sm font-medium text-foreground">Performance Summary</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Attempts: {summary.totalAttempts} • Average: {summary.avgScore}% • Latest change: {summary.latestImprovement >= 0 ? "+" : ""}{summary.latestImprovement}%
              </p>
            </div>
          )}

          <Button onClick={() => setState("running")} className="gradient-primary text-primary-foreground border-0 px-8">Start Exam <ArrowRight className="ml-2 h-4 w-4" /></Button>
        </div>
      </DashboardLayout>
    );
  }

  if (state === "finished") {
    const pct = Math.round((score / questionBank.length) * 100);
    return (
      <DashboardLayout>
        <div className="max-w-2xl mx-auto">
          <div className="bg-card rounded-xl border border-border p-8 text-center mb-6">
            <div className="w-16 h-16 rounded-2xl gradient-accent flex items-center justify-center mx-auto mb-4"><Trophy className="h-8 w-8 text-primary-foreground" /></div>
            <h2 className="font-display text-2xl font-bold text-foreground">Exam Complete</h2>
            <p className="text-4xl font-bold font-display text-primary mt-3">{score}/{questionBank.length}</p>
            <p className="text-muted-foreground">{pct}% correct</p>
            <Progress value={pct} className="mt-4 h-3" />
            <Button onClick={resetExam} className="mt-6 gradient-primary text-primary-foreground border-0">Retry Exam</Button>
          </div>
          <div className="bg-card rounded-xl border border-border p-6 space-y-4">
            <h3 className="font-display font-semibold text-foreground">Review Answers</h3>
            {questionBank.map((question, index) => (
              <div key={question.id} className="p-4 rounded-lg bg-muted/30 border border-border/50">
                <div className="flex items-start gap-2">
                  {answers[index] === question.answer ? <CheckCircle2 className="h-5 w-5 text-success shrink-0 mt-0.5" /> : <XCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />}
                  <div>
                    <p className="font-medium text-foreground text-sm">{question.question}</p>
                    <p className="text-sm text-success mt-1">Correct: {question.options[question.answer]}</p>
                    {answers[index] !== question.answer && answers[index] !== null && <p className="text-sm text-destructive">Your answer: {question.options[answers[index]!]}</p>}
                    {question.explanation && <p className="text-sm text-muted-foreground mt-2">Explanation: {question.explanation}</p>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const q = questionBank[currentQ];

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-sm text-muted-foreground">Question {currentQ + 1} of {questionBank.length}</p>
            <Progress value={((currentQ + 1) / questionBank.length) * 100} className="mt-2 w-48 h-2" />
          </div>
          <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${timeLeft < 60 ? "bg-destructive/10 text-destructive" : "bg-muted text-foreground"} font-mono font-semibold`}>
            <Clock className="h-4 w-4" /> {minutes}:{seconds.toString().padStart(2, "0")}
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border p-8">
          <div className="mb-4 flex gap-2">
            <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs text-primary">{examType}</span>
            <span className="rounded-full bg-accent/10 px-2.5 py-1 text-xs text-accent">{difficulty}</span>
          </div>
          <h2 className="font-display text-lg font-semibold text-foreground mb-6">{q.question}</h2>
          <div className="space-y-3">
            {q.options.map((opt, i) => (
              <button key={opt} onClick={() => selectAnswer(i)} className={`w-full text-left p-4 rounded-lg border transition-all ${answers[currentQ] === i ? "border-primary bg-primary/5 text-foreground" : "border-border hover:border-primary/50 text-foreground hover:bg-muted/30"}`}>
                <span className="inline-flex items-center justify-center w-7 h-7 rounded-full border border-current text-sm font-medium mr-3">{String.fromCharCode(65 + i)}</span>
                {opt}
              </button>
            ))}
          </div>
          <div className="flex items-center justify-between mt-8">
            <Button variant="outline" onClick={() => setCurrentQ((c) => Math.max(0, c - 1))} disabled={currentQ === 0}>Previous</Button>
            {currentQ < questionBank.length - 1 ? (
              <Button onClick={() => setCurrentQ((c) => c + 1)} className="gradient-primary text-primary-foreground border-0">Next <ArrowRight className="ml-1 h-4 w-4" /></Button>
            ) : (
              <Button onClick={() => void submitExam()} className="bg-success text-success-foreground border-0 hover:bg-success/90">Submit Exam</Button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mt-6 justify-center">
          {questionBank.map((question, i) => (
            <button key={question.id} onClick={() => setCurrentQ(i)} className={`w-9 h-9 rounded-lg text-sm font-medium transition-all ${i === currentQ ? "gradient-primary text-primary-foreground" : answers[i] !== null ? "bg-primary/10 text-primary border border-primary/30" : "bg-muted text-muted-foreground"}`}>{i + 1}</button>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
