import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2, FileText } from "lucide-react";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { apiGet, apiPost, type ApiItemResponse } from "@/lib/api";

type CollegeCourse = {
  id: string;
  name: string;
  duration: string;
};

type CollegeTarget = {
  id: string;
  name: string;
  location: string;
  type: string;
  admissionRequirements: string[];
  courses: CollegeCourse[];
};

type CertificationTarget = {
  id: string;
  title: string;
  provider: string;
  duration: string;
  level: string;
  price: string;
  description: string;
  requirements: string[];
};

export default function ApplicationForm() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const type = searchParams.get("type") === "certification" ? "CERTIFICATION" : "COLLEGE";
  const collegeId = searchParams.get("collegeId");
  const certificationId = searchParams.get("certificationId");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [college, setCollege] = useState<CollegeTarget | null>(null);
  const [certification, setCertification] = useState<CertificationTarget | null>(null);
  const [applicantName, setApplicantName] = useState(user?.name ?? "");
  const [applicantEmail, setApplicantEmail] = useState(user?.email ?? "");
  const [applicantPhone, setApplicantPhone] = useState("");
  const [qualification, setQualification] = useState("");
  const [scoreOrRank, setScoreOrRank] = useState("");
  const [statement, setStatement] = useState("");
  const [courseName, setCourseName] = useState("");

  useEffect(() => {
    setApplicantName(user?.name ?? "");
    setApplicantEmail(user?.email ?? "");
  }, [user?.email, user?.name]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        if (type === "COLLEGE" && collegeId) {
          const response = await apiGet<ApiItemResponse<CollegeTarget>>(`/colleges/${collegeId}`);
          setCollege(response.item);
          setCourseName(response.item.courses[0]?.name ?? "");
          setCertification(null);
        } else if (type === "CERTIFICATION" && certificationId) {
          const response = await apiGet<ApiItemResponse<CertificationTarget>>(`/content/certifications/${certificationId}`);
          setCertification(response.item);
          setCollege(null);
        }
      } catch {
        toast({ title: "Unable to load application target", description: "Please try again.", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [certificationId, collegeId, toast, type]);

  const requirements = useMemo(() => {
    if (type === "COLLEGE") return college?.admissionRequirements ?? [];
    return certification?.requirements ?? [];
  }, [certification?.requirements, college?.admissionRequirements, type]);

  const title = type === "COLLEGE" ? college?.name : certification?.title;
  const subtitle = type === "COLLEGE" ? college?.location : certification?.provider;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if ((type === "COLLEGE" && !college) || (type === "CERTIFICATION" && !certification)) {
      return;
    }

    setSubmitting(true);
    try {
      await apiPost("/applications", {
        type,
        collegeId: college?.id,
        certificationCourseId: certification?.id,
        courseName: type === "COLLEGE" ? courseName : undefined,
        applicantName,
        applicantEmail,
        applicantPhone,
        qualification,
        scoreOrRank: scoreOrRank || undefined,
        statement: statement || undefined,
        requirementsSnapshot: requirements
      });

      toast({
        title: "Application submitted",
        description: "Your submission is now tracked in My Applications."
      });
      navigate("/applications");
    } catch {
      toast({ title: "Submission failed", description: "Please check the form and try again.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <p className="text-muted-foreground">Loading application form...</p>
      </DashboardLayout>
    );
  }

  if (!title) {
    return (
      <DashboardLayout>
        <p className="text-muted-foreground">Application target not found.</p>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <Link to={type === "COLLEGE" && college ? `/colleges/${college.id}` : "/certifications"} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>

      <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
        <div className="bg-card rounded-xl border border-border p-6">
          <div className="mb-6">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary">{type === "COLLEGE" ? "College Application" : "Certification Application"}</p>
            <h1 className="mt-2 font-display text-2xl font-bold text-foreground">{title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Input value={applicantName} onChange={(event) => setApplicantName(event.target.value)} placeholder="Full name" required />
              <Input value={applicantEmail} onChange={(event) => setApplicantEmail(event.target.value)} placeholder="Email address" type="email" required />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Input value={applicantPhone} onChange={(event) => setApplicantPhone(event.target.value)} placeholder="Phone number" required />
              <Input value={qualification} onChange={(event) => setQualification(event.target.value)} placeholder="Highest qualification" required />
            </div>

            {type === "COLLEGE" && college && (
              <select
                value={courseName}
                onChange={(event) => setCourseName(event.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                required
              >
                {college.courses.map((course) => (
                  <option key={course.id} value={course.name}>
                    {course.name} ({course.duration})
                  </option>
                ))}
              </select>
            )}

            <Input
              value={scoreOrRank}
              onChange={(event) => setScoreOrRank(event.target.value)}
              placeholder={type === "COLLEGE" ? "Entrance score or rank" : "Relevant score, experience, or portfolio"}
            />

            <Textarea
              rows={5}
              value={statement}
              onChange={(event) => setStatement(event.target.value)}
              placeholder={type === "COLLEGE" ? "Why do you want to join this college or program?" : "Why do you want to join this certification?"}
            />

            <Button type="submit" disabled={submitting} className="w-full gradient-primary text-primary-foreground border-0">
              {submitting ? "Submitting..." : "Submit Application"}
            </Button>
          </form>
        </div>

        <div className="space-y-6">
          <div className="bg-card rounded-xl border border-border p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-display text-lg font-semibold text-foreground">Requirements</h2>
                <p className="text-sm text-muted-foreground">These requirements are stored with your submission.</p>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {requirements.map((requirement) => (
                <div key={requirement} className="flex gap-3 rounded-lg border border-border/60 bg-muted/30 px-3 py-3">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                  <p className="text-sm text-foreground">{requirement}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-card rounded-xl border border-border p-6">
            <h3 className="font-display text-lg font-semibold text-foreground">What happens next</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              After submission, the application appears in My Applications with its current status and the exact requirement checklist attached to it.
            </p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
