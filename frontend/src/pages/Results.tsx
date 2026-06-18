import { useMemo, useEffect, useState } from "react";
import { Award, BarChart3, ExternalLink, Target, Timer, TrendingUp } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatCard } from "@/components/ui/stat-card";
import { apiGet } from "@/lib/api";

type MockAttempt = {
  id: string;
  examType: string;
  difficulty: string;
  score: number;
  total: number;
  correctAnswers: number;
  incorrectAnswers: number;
  duration: number;
  createdAt: string;
};

type MockSummary = {
  totalAttempts: number;
  avgScore: number;
  latestImprovement: number;
  byExam: Record<string, number>;
  attempts: MockAttempt[];
};

function getMockPercentage(attempt: MockAttempt): number {
  return attempt.total ? Math.round((attempt.score / attempt.total) * 100) : 0;
}

export default function Results() {
  const [summary, setSummary] = useState<MockSummary | null>(null);

  useEffect(() => {
    const load = async () => {
      const response = await apiGet<{ success: boolean; item: MockSummary }>("/interactions/mock-exam-summary");
      setSummary(response.item);
    };

    void load();
  }, []);

  const latestAttempt = summary?.attempts.at(-1) ?? null;
  const bestAttempt = summary?.attempts.reduce<MockAttempt | null>((best, attempt) => {
    if (!best || getMockPercentage(attempt) > getMockPercentage(best)) {
      return attempt;
    }
    return best;
  }, null) ?? null;

  const recentResults = useMemo(() => {
    return (summary?.attempts ?? []).slice(-6).map((attempt, index) => ({
      name: `${attempt.examType} ${index + 1}`,
      score: getMockPercentage(attempt)
    }));
  }, [summary]);

  const byExam = useMemo(() => {
    return Object.entries(summary?.byExam ?? {}).map(([name, total]) => ({ name, total }));
  }, [summary]);

  return (
    <DashboardLayout>
      <div className="mb-8 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Results</h1>
          <p className="mt-1 text-muted-foreground">Track your mock-test performance and improvement over time.</p>
        </div>
        <a href="/mock-exam" className="inline-flex items-center gap-1 text-sm font-medium text-primary">
          Take another mock exam <ExternalLink className="h-4 w-4" />
        </a>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Total Attempts" value={summary?.totalAttempts ?? 0} change="Saved from mock exams" changeType="positive" icon={Award} />
        <StatCard title="Average Score" value={`${summary?.avgScore ?? 0}%`} change="Across all attempts" changeType="neutral" icon={TrendingUp} />
        <StatCard title="Latest Score" value={latestAttempt ? `${getMockPercentage(latestAttempt)}%` : "-"} change={latestAttempt ? `${latestAttempt.examType} ${latestAttempt.difficulty}` : "No attempts yet"} changeType="positive" icon={Target} />
        <StatCard title="Improvement" value={summary ? `${summary.latestImprovement >= 0 ? "+" : ""}${summary.latestImprovement}%` : "-"} change="Compared with previous test" changeType="neutral" icon={Timer} />
      </div>

      <div className="mb-8 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="mb-4 font-display text-lg font-semibold text-foreground">Recent Score Trend</h2>
          {recentResults.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={recentResults}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} domain={[0, 100]} />
                <Tooltip formatter={(value) => [`${value}%`, "Score"]} />
                <Bar dataKey="score" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground">No exam attempts yet. Take a mock test to start building your results history.</p>
          )}
        </div>

        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="mb-4 font-display text-lg font-semibold text-foreground">Attempts by Exam</h2>
          <div className="space-y-3">
            {byExam.length > 0 ? byExam.map((item) => (
              <div key={item.name} className="rounded-lg border border-border/60 bg-muted/20 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium text-foreground">{item.name}</p>
                  <span className="text-sm text-muted-foreground">{item.total} attempts</span>
                </div>
              </div>
            )) : <p className="text-sm text-muted-foreground">Your exam mix will appear here after your first attempt.</p>}
          </div>

          <div className="mt-6 rounded-lg border border-border/60 bg-muted/20 p-4">
            <p className="text-sm font-medium text-foreground">Best performance</p>
            <p className="mt-2 text-lg font-semibold text-foreground">{bestAttempt ? `${bestAttempt.examType} - ${getMockPercentage(bestAttempt)}%` : "No results yet"}</p>
            <p className="mt-1 text-sm text-muted-foreground">{bestAttempt ? `${bestAttempt.score}/${bestAttempt.total} on ${new Date(bestAttempt.createdAt).toLocaleDateString()}` : "Complete a mock exam to see your strongest result."}</p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="mb-4 font-display text-lg font-semibold text-foreground">Attempt History</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Exam</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Difficulty</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Score</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Correct</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Duration</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Date</th>
              </tr>
            </thead>
            <tbody>
              {(summary?.attempts ?? []).slice().reverse().map((attempt) => (
                <tr key={attempt.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 text-sm font-medium text-foreground">{attempt.examType}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{attempt.difficulty}</td>
                  <td className="px-4 py-3 text-sm text-foreground">{attempt.score}/{attempt.total} ({getMockPercentage(attempt)}%)</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{attempt.correctAnswers}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{Math.ceil(attempt.duration / 60)} mins</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{new Date(attempt.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}
