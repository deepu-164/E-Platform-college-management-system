import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Brain, TrendingUp, Code, Database, Shield, Cloud, Cpu, BarChart3, CheckCircle2 } from "lucide-react";
import { apiGet } from "@/lib/api";

const iconMap: Record<string, typeof Code> = {
  "Software Developer": Code,
  "Data Scientist": Database,
  "AI/ML Engineer": Cpu,
  "Cloud Architect": Cloud,
  "Cybersecurity Analyst": Shield,
  "Business Analyst": BarChart3
};

type CareerItem = {
  id: string;
  title: string;
  salary: string;
  demand: string;
  matchScore: number;
  skills: string[];
};

const careerDetails: Record<string, { summary: string; roadmap: string[]; outcomes: string[] }> = {
  "Software Developer": {
    summary: "Build production software across frontend, backend, testing, and deployment. Strong fit if you enjoy problem solving and shipping user-facing features.",
    roadmap: ["Master one language deeply", "Build 2-3 real projects", "Learn Git, APIs, SQL, and deployment", "Practice DSA and system basics"],
    outcomes: ["Frontend Engineer", "Backend Engineer", "Full Stack Developer"]
  },
  "Data Scientist": {
    summary: "Work with data, analytics, experiments, and predictive models. Strong fit if you like statistics, Python, and interpreting patterns for business decisions.",
    roadmap: ["Learn Python, pandas, SQL, and visualization", "Study statistics and probability", "Build end-to-end analysis projects", "Practice model evaluation and storytelling"],
    outcomes: ["Data Analyst", "Junior Data Scientist", "Analytics Engineer"]
  },
  "AI/ML Engineer": {
    summary: "Design, train, evaluate, and deploy ML systems. Strong fit if you want applied AI work beyond pure analytics.",
    roadmap: ["Strengthen Python and linear algebra", "Learn ML fundamentals and evaluation", "Build model deployment projects", "Study MLOps and cloud inference"],
    outcomes: ["ML Engineer", "Applied AI Engineer", "LLM Engineer"]
  },
  "Cloud Architect": {
    summary: "Plan scalable infrastructure, deployment strategy, and security in cloud platforms. Strong fit if you enjoy systems and architecture.",
    roadmap: ["Learn Linux, networking, and containers", "Use AWS or Azure hands-on", "Study IaC and CI/CD", "Practice architecture case studies"],
    outcomes: ["Cloud Engineer", "DevOps Engineer", "Solutions Architect"]
  }
};

export default function Career() {
  const [careers, setCareers] = useState<CareerItem[]>([]);
  const [selectedCareer, setSelectedCareer] = useState<CareerItem | null>(null);

  useEffect(() => {
    const load = async () => {
      const data = await apiGet<{ success: boolean; items: CareerItem[] }>("/content/careers");
      setCareers(data.items);
      setSelectedCareer(data.items[0] ?? null);
    };

    void load();
  }, []);

  return (
    <DashboardLayout>
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center"><Brain className="h-5 w-5 text-primary-foreground" /></div>
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">AI Career Recommendations</h1>
            <p className="text-muted-foreground">Personalized career paths based on your profile and market trends</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
        <div className="grid md:grid-cols-2 gap-5">
        {careers.map((career) => {
          const Icon = iconMap[career.title] ?? Code;
          return (
            <button key={career.id} type="button" onClick={() => setSelectedCareer(career)} className={`bg-card rounded-xl border p-6 hover:shadow-card-hover transition-all group text-left ${selectedCareer?.id === career.id ? "border-primary shadow-card-hover" : "border-border"}`}>
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center"><Icon className="h-6 w-6 text-primary-foreground" /></div>
                <div className="text-right"><span className="text-2xl font-bold font-display text-primary">{career.matchScore}%</span><p className="text-xs text-muted-foreground">Match</p></div>
              </div>
              <h3 className="font-display font-semibold text-lg text-foreground">{career.title}</h3>
              <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
                <span className="flex items-center gap-1"><TrendingUp className="h-3.5 w-3.5" /> {career.salary}</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${career.demand === "Very High" ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}`}>{career.demand}</span>
              </div>
              <div className="mt-4 pt-3 border-t border-border">
                <p className="text-xs text-muted-foreground mb-2">Key Skills</p>
                <div className="flex flex-wrap gap-1.5">{career.skills.map((skill) => <span key={skill} className="text-xs bg-muted px-2 py-0.5 rounded-md text-muted-foreground">{skill}</span>)}</div>
              </div>
              <div className="mt-4 w-full bg-muted rounded-full h-2"><div className="h-2 rounded-full gradient-primary" style={{ width: `${career.matchScore}%` }} /></div>
            </button>
          );
        })}
        </div>

        {selectedCareer && (
          <div className="bg-card rounded-xl border border-border p-6">
            <h2 className="font-display text-2xl font-bold text-foreground">{selectedCareer.title}</h2>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">{careerDetails[selectedCareer.title]?.summary ?? "This role combines technical depth with strong long-term career growth."}</p>

            <div className="mt-6">
              <p className="text-sm font-medium text-foreground">Recommended roadmap</p>
              <div className="mt-3 space-y-3">
                {(careerDetails[selectedCareer.title]?.roadmap ?? selectedCareer.skills).map((step) => (
                  <div key={step} className="flex gap-3 rounded-lg border border-border/60 bg-muted/30 px-4 py-3">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                    <p className="text-sm text-foreground">{step}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6">
              <p className="text-sm font-medium text-foreground">Typical outcomes</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {(careerDetails[selectedCareer.title]?.outcomes ?? selectedCareer.skills).map((item) => (
                  <span key={item} className="rounded-full bg-primary/10 px-3 py-1 text-xs text-primary">{item}</span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
