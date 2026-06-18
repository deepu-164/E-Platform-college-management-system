import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Award, Clock, Users, Star, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiGet } from "@/lib/api";

type Certification = {
  id: string;
  title: string;
  provider: string;
  duration: string;
  enrolled: number;
  rating: number;
  level: string;
  price: string;
  description: string;
  requirements: string[];
};

const levelColors: Record<string, string> = {
  Beginner: "bg-success/10 text-success",
  Intermediate: "bg-warning/10 text-warning",
  Advanced: "bg-primary/10 text-primary"
};

export default function Certifications() {
  const [certifications, setCertifications] = useState<Certification[]>([]);

  useEffect(() => {
    const load = async () => {
      const data = await apiGet<{ success: boolean; items: Certification[] }>("/content/certifications");
      setCertifications(data.items);
    };

    void load();
  }, []);

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="font-display text-2xl font-bold text-foreground">Certification Courses</h1>
        <p className="text-muted-foreground mt-1">Enhance your skills with industry-recognized certifications</p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
        {certifications.map((course) => (
          <div key={course.id} className="bg-card rounded-xl border border-border overflow-hidden hover:shadow-card-hover transition-all group">
            <div className="h-32 gradient-hero flex items-center justify-center"><Award className="h-12 w-12 text-primary-foreground/30" /></div>
            <div className="p-5">
              <div className="flex items-center gap-2 mb-2"><span className={`text-xs font-medium px-2 py-0.5 rounded-full ${levelColors[course.level]}`}>{course.level}</span></div>
              <h3 className="font-display font-semibold text-foreground group-hover:text-primary transition-colors">{course.title}</h3>
              <p className="text-sm text-muted-foreground mt-1">{course.provider}</p>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{course.description}</p>
              <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {course.duration}</span>
                <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {course.enrolled}</span>
                <span className="flex items-center gap-1"><Star className="h-3.5 w-3.5 text-warning fill-warning" /> {course.rating.toFixed(1)}</span>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {course.requirements.slice(0, 2).map((requirement) => (
                  <span key={requirement} className="rounded-full bg-primary/10 px-2.5 py-1 text-xs text-primary">{requirement}</span>
                ))}
              </div>
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
                <span className="font-display font-bold text-foreground">{course.price}</span>
                <Link to={`/applications/new?type=certification&certificationId=${course.id}`}>
                  <Button size="sm" className="gradient-primary text-primary-foreground border-0 text-xs">Apply <ExternalLink className="ml-1 h-3 w-3" /></Button>
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>
    </DashboardLayout>
  );
}
