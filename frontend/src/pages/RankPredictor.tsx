import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp, Target, Award, Building2 } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { apiGet, type ApiItemResponse } from "@/lib/api";

type RankCutoff = { year: number; cutoff: number };

type PredictedCollege = {
  id: string;
  name: string;
  collegeRank: number;
  location: string;
  predictedCutoff: number;
  eligible: boolean;
  gap: number;
};

type PredictorItem = {
  rank: number;
  category: "general" | "obc" | "sc" | "st";
  cutoff2026: number;
  eligibleCount: number;
  colleges: PredictedCollege[];
  nearMissColleges: PredictedCollege[];
};

type SeatRoundPrediction = {
  rank: number;
  round: number;
  category: string;
  colleges: { collegeName: string; courseName: string; latestCutoff: number; years: number[] }[];
};

export default function RankPredictor() {
  const [rank, setRank] = useState("");
  const [category, setCategory] = useState<"general" | "obc" | "sc" | "st">("general");
  const [historicalData, setHistoricalData] = useState<RankCutoff[]>([]);
  const [prediction, setPrediction] = useState<PredictorItem | null>(null);
  const [seatRoundPrediction, setSeatRoundPrediction] = useState<SeatRoundPrediction | null>(null);
  const [round, setRound] = useState<"1" | "2">("1");

  useEffect(() => {
    const load = async () => {
      const cutoffRes = await apiGet<{ success: boolean; items: RankCutoff[] }>("/content/rank-cutoffs");
      setHistoricalData(cutoffRes.items);
    };

    void load();
  }, []);

  const predict = async () => {
    const rankNum = parseInt(rank, 10);
    if (!rankNum) return;

    const response = await apiGet<ApiItemResponse<PredictorItem>>("/content/rank-predictor", {
      rank: rankNum,
      category
    });
    const seatResponse = await apiGet<ApiItemResponse<SeatRoundPrediction>>("/content/seat-allotment-predictor", {
      rank: rankNum,
      category,
      round
    });

    setPrediction(response.item);
    setSeatRoundPrediction(seatResponse.item);
  };

  const chartData = [
    ...historicalData.map((entry) => ({ year: entry.year.toString(), cutoff: entry.cutoff })),
    ...(prediction ? [{ year: "2026*", cutoff: prediction.cutoff2026 }] : [])
  ];

  const admissionChance = (() => {
    if (!prediction) return "-";
    if (prediction.colleges.length >= 4) return "Very High (>90%)";
    if (prediction.colleges.length >= 2) return "High (70-90%)";
    if (prediction.colleges.length === 1) return "Moderate (40-70%)";
    return "Low (<40%)";
  })();

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="font-display text-2xl font-bold text-foreground">KCET Rank Predictor</h1>
        <p className="text-muted-foreground mt-1">Predict colleges by cutoff trend and estimate seat chances for round 1 or round 2 allotment.</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="bg-card rounded-xl border border-border p-6">
          <h3 className="font-display font-semibold text-foreground mb-4 flex items-center gap-2"><Target className="h-5 w-5 text-primary" /> Enter Your Details</h3>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Your KCET Rank</label>
              <Input type="number" placeholder="e.g. 12000" value={rank} onChange={(e) => setRank(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Category</label>
              <Select value={category} onValueChange={(value) => setCategory(value as "general" | "obc" | "sc" | "st")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="obc">OBC</SelectItem>
                  <SelectItem value="sc">SC</SelectItem>
                  <SelectItem value="st">ST</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Prediction Round</label>
              <Select value={round} onValueChange={(value) => setRound(value as "1" | "2")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Round 1</SelectItem>
                  <SelectItem value="2">Round 2</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => void predict()} className="w-full gradient-primary text-primary-foreground border-0">Predict My Colleges</Button>
          </div>
        </div>

        <div className="lg:col-span-2">
          {prediction ? (
            <div className="space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="stat-card">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg gradient-primary flex items-center justify-center"><TrendingUp className="h-5 w-5 text-primary-foreground" /></div>
                    <div><p className="text-sm text-muted-foreground">Admission Chance</p><p className="font-display font-bold text-lg text-foreground">{admissionChance}</p></div>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg gradient-accent flex items-center justify-center"><Award className="h-5 w-5 text-primary-foreground" /></div>
                    <div><p className="text-sm text-muted-foreground">Predicted 2026 Base Cutoff</p><p className="font-display font-bold text-lg text-foreground">{prediction.cutoff2026}</p></div>
                  </div>
                </div>
              </div>

              <div className="bg-card rounded-xl border border-border p-6">
                <h3 className="font-display font-semibold text-foreground mb-4">Eligible Colleges For Rank {prediction.rank}</h3>
                {prediction.colleges.length > 0 ? (
                  <div className="space-y-3">
                    {prediction.colleges.map((college) => (
                      <div key={college.id} className="flex items-center justify-between gap-3 p-3 rounded-lg bg-muted/30 border border-border/50">
                        <div className="flex items-center gap-3"><Building2 className="h-5 w-5 text-primary" /><span className="font-medium text-foreground">{college.name}</span></div>
                        <p className="text-sm text-muted-foreground">Cutoff: <span className="font-semibold text-foreground">{college.predictedCutoff}</span></p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No direct matches for this rank. Check near misses below.</p>
                )}
              </div>

              {prediction.nearMissColleges.length > 0 && (
                <div className="bg-card rounded-xl border border-border p-6">
                  <h3 className="font-display font-semibold text-foreground mb-4">Near Miss Colleges</h3>
                  <div className="space-y-3">
                    {prediction.nearMissColleges.map((college) => (
                      <div key={college.id} className="flex items-center justify-between gap-3 p-3 rounded-lg bg-muted/30 border border-border/50">
                        <div className="flex items-center gap-3"><Building2 className="h-5 w-5 text-primary" /><span className="font-medium text-foreground">{college.name}</span></div>
                        <p className="text-sm text-muted-foreground">Need approx <span className="font-semibold text-foreground">{Math.abs(college.gap)}</span> better rank</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {seatRoundPrediction && (
                <div className="bg-card rounded-xl border border-border p-6">
                  <h3 className="font-display font-semibold text-foreground mb-4">Round {seatRoundPrediction.round} Seat Allotment Chances</h3>
                  {seatRoundPrediction.colleges.length > 0 ? (
                    <div className="space-y-3">
                      {seatRoundPrediction.colleges.map((college) => (
                        <div key={`${college.collegeName}-${college.courseName}`} className="rounded-lg bg-muted/30 border border-border/50 p-4">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="font-medium text-foreground">{college.collegeName}</p>
                              <p className="text-sm text-muted-foreground">{college.courseName}</p>
                            </div>
                            <p className="text-sm text-muted-foreground">Latest round cutoff <span className="font-semibold text-foreground">{college.latestCutoff}</span></p>
                          </div>
                          <p className="mt-2 text-xs text-muted-foreground">Based on years: {college.years.join(", ")}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No likely round {seatRoundPrediction.round} matches for this rank in the available historical data.</p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-card rounded-xl border border-border p-6">
              <h3 className="font-display font-semibold text-foreground mb-4">Historical Cutoff Trends (MCA)</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="year" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip />
                  <Line type="monotone" dataKey="cutoff" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: "hsl(var(--primary))", r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
              <p className="text-sm text-muted-foreground mt-3">Enter your rank and category to get cutoff-matched colleges.</p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
