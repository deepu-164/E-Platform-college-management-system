import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  GraduationCap, Search, Brain, ClipboardList, BarChart3,
  MessageCircle, ArrowRight, Star, Building2, ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiGet, type ApiListResponse } from "@/lib/api";
import { SiteFooter } from "@/components/layout/SiteFooter";

const features = [
  { icon: Search, title: "Smart College Search", desc: "Filter by location, fees, ranking, and courses to find your perfect match." },
  { icon: Brain, title: "AI Career Guidance", desc: "Get personalized career recommendations powered by AI intelligence." },
  { icon: ClipboardList, title: "Mock Examinations", desc: "Practice with timed tests from our question bank." },
  { icon: BarChart3, title: "KCET Rank Predictor", desc: "Predict your college admission chances with historical trends." },
  { icon: MessageCircle, title: "AI Chat Assistant", desc: "Conversational assistant to answer admission queries." },
  { icon: GraduationCap, title: "Application Tracking", desc: "Track all your college applications in one dashboard." }
];

type College = {
  id: string;
  name: string;
  location: string;
  rating: number;
  rank: number;
  courses: { id: string }[];
};

type App = { id: string };
type User = { id: string };

export default function Landing() {
  const [topColleges, setTopColleges] = useState<College[]>([]);
  const [stats, setStats] = useState([
    { value: "0", label: "Partner Colleges" },
    { value: "0", label: "Students Guided" },
    { value: "0", label: "Courses Listed" },
    { value: "95%", label: "Success Rate" }
  ]);

  useEffect(() => {
    const load = async () => {
      const [collegeRes, userRes, appRes] = await Promise.all([
        apiGet<ApiListResponse<College>>("/colleges", { limit: 4, sortBy: "rank", sortOrder: "asc" }),
        apiGet<ApiListResponse<User>>("/users", { limit: 500 }),
        apiGet<ApiListResponse<App>>("/applications", { limit: 500 })
      ]);

      const totalCourses = collegeRes.items.reduce((sum, college) => sum + college.courses.length, 0);

      setTopColleges(collegeRes.items);
      setStats([
        { value: `${collegeRes.meta?.total ?? collegeRes.items.length}+`, label: "Partner Colleges" },
        { value: `${userRes.meta?.total ?? userRes.items.length}+`, label: "Students Guided" },
        { value: `${totalCourses}+`, label: "Courses Listed" },
        { value: "95%", label: "Success Rate" }
      ]);

      void appRes;
    };

    void load();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <nav className="fixed top-0 w-full z-50 glass border-b border-border/50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg gradient-primary flex items-center justify-center">
              <GraduationCap className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-display font-bold text-xl text-foreground">E-platform</span>
          </Link>
          <div className="hidden md:flex items-center gap-8">
            <Link to="/colleges" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Colleges</Link>
            <Link to="/rank-predictor" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Rank Predictor</Link>
            <Link to="/mock-exam" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Mock Exams</Link>
            <Link to="/blog" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Blog</Link>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login"><Button variant="ghost" className="text-sm">Sign In</Button></Link>
            <Link to="/register"><Button className="gradient-primary text-primary-foreground border-0 text-sm">Get Started <ArrowRight className="ml-1 h-4 w-4" /></Button></Link>
          </div>
        </div>
      </nav>

      <section className="gradient-hero pt-32 pb-20 px-6 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-72 h-72 bg-primary rounded-full blur-3xl animate-pulse-slow" />
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-accent rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: "1.5s" }} />
        </div>
        <div className="max-w-7xl mx-auto relative">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/20 text-primary-foreground/80 text-sm font-medium mb-6">
              <Star className="h-4 w-4" /> Trusted by students across Karnataka
            </div>
            <h1 className="font-display text-4xl md:text-6xl font-extrabold text-primary-foreground leading-tight">
              Your Gateway to the <span className="text-transparent bg-clip-text" style={{ backgroundImage: "var(--gradient-accent)" }}>Perfect College</span>
            </h1>
            <p className="mt-6 text-lg md:text-xl text-primary-foreground/70 max-w-2xl leading-relaxed">
              AI-powered college discovery, admission tracking, rank prediction, and career guidance in one platform.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link to="/colleges"><Button size="lg" className="gradient-primary text-primary-foreground border-0 text-base px-8 shadow-glow">Explore Colleges <ArrowRight className="ml-2 h-5 w-5" /></Button></Link>
              <Link to="/rank-predictor"><Button size="lg" variant="outline" className="text-base px-8 border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/10">Predict Your Rank</Button></Link>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.3 }} className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((stat) => (
              <div key={stat.label} className="glass rounded-xl p-5 text-center">
                <p className="text-2xl md:text-3xl font-bold font-display text-primary-foreground">{stat.value}</p>
                <p className="text-sm text-primary-foreground/60 mt-1">{stat.label}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground">Everything You Need for <span className="text-gradient">Academic Success</span></h2>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">A comprehensive platform with AI-powered tools to guide your educational journey.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <motion.div key={feature.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: index * 0.1 }} className="gradient-card rounded-xl p-6 border border-border hover:shadow-card-hover transition-all duration-300 group cursor-pointer">
                <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <feature.icon className="h-6 w-6 text-primary-foreground" />
                </div>
                <h3 className="font-display font-semibold text-lg text-foreground">{feature.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 px-6 bg-secondary/50">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-end justify-between mb-10">
            <div>
              <h2 className="font-display text-3xl font-bold text-foreground">Top Colleges</h2>
              <p className="mt-2 text-muted-foreground">Discover highly rated institutions in Karnataka</p>
            </div>
            <Link to="/colleges" className="text-primary font-medium text-sm flex items-center gap-1 hover:gap-2 transition-all">View all <ChevronRight className="h-4 w-4" /></Link>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {topColleges.map((college) => (
              <motion.div key={college.id} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
                <Link to={`/colleges/${college.id}`} className="block bg-card rounded-xl border border-border p-5 hover:shadow-card-hover transition-all group">
                  <div className="w-full h-32 rounded-lg bg-secondary flex items-center justify-center mb-4"><Building2 className="h-10 w-10 text-muted-foreground" /></div>
                  <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">#{college.rank} in Karnataka</span>
                  <h3 className="font-display font-semibold mt-2 text-foreground group-hover:text-primary transition-colors">{college.name}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{college.location}</p>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                    <div className="flex items-center gap-1"><Star className="h-4 w-4 text-warning fill-warning" /><span className="text-sm font-medium">{college.rating.toFixed(1)}</span></div>
                    <span className="text-xs text-muted-foreground">{college.courses.length} courses</span>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto gradient-hero rounded-2xl p-12 text-center relative overflow-hidden">
          <div className="absolute inset-0 opacity-20"><div className="absolute top-0 right-0 w-64 h-64 bg-accent rounded-full blur-3xl" /></div>
          <div className="relative">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-primary-foreground">Ready to Start Your Journey?</h2>
            <p className="mt-4 text-lg text-primary-foreground/70 max-w-xl mx-auto">Join students who found their dream college through E-platform.</p>
            <Link to="/register"><Button size="lg" className="mt-8 bg-primary-foreground text-foreground hover:bg-primary-foreground/90 text-base px-8">Create Free Account <ArrowRight className="ml-2 h-5 w-5" /></Button></Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}


