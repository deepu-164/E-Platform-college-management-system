import { useEffect, useState } from "react";
import { Award, Building2, CalendarDays, ChevronRight, FileText } from "lucide-react";
import { Link } from "react-router-dom";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { apiGet, type ApiListResponse } from "@/lib/api";

type Application = {
  id: string;
  type: "COLLEGE" | "CERTIFICATION";
  courseName?: string | null;
  applicantName: string;
  applicantEmail: string;
  applicantPhone: string;
  qualification: string;
  scoreOrRank?: string | null;
  statement?: string | null;
  requirementsSnapshot: string[];
  status: "PENDING" | "SHORTLISTED" | "ACCEPTED" | "REJECTED";
  paymentStatus: "NOT_READY" | "PENDING" | "PAID" | "FAILED";
  paymentAmount?: number | null;
  appliedAt: string;
  college?: {
    id: string;
    name: string;
    location: string;
  } | null;
  certificationCourse?: {
    id: string;
    title: string;
    provider: string;
  } | null;
};

type UserDocument = {
  id: string;
  applicationId?: string | null;
  title: string;
  documentType: string;
  status: "PENDING" | "VERIFIED" | "REJECTED";
  fileName: string;
};

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const statusStyles: Record<Application["status"], string> = {
  ACCEPTED: "bg-success/10 text-success",
  PENDING: "bg-warning/10 text-warning",
  REJECTED: "bg-destructive/10 text-destructive",
  SHORTLISTED: "bg-primary/10 text-primary"
};

export default function Applications() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [documents, setDocuments] = useState<UserDocument[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await apiGet<ApiListResponse<Application>>("/applications", { limit: 100 });
        const docsResponse = await apiGet<{ success: boolean; items: UserDocument[] }>("/documents");
        setApplications(response.items);
        setDocuments(docsResponse.items);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const uploadDocument = async (applicationId: string, file?: File | null) => {
    if (!file) return;
    const fileDataUrl = await fileToDataUrl(file);
    await apiPost("/documents", {
      applicationId,
      title: file.name,
      documentType: "Admission Document",
      fileName: file.name,
      mimeType: file.type || "application/octet-stream",
      fileDataUrl
    });
    const docsResponse = await apiGet<{ success: boolean; items: UserDocument[] }>("/documents");
    setDocuments(docsResponse.items);
  };

  return (
    <DashboardLayout>
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">My Applications</h1>
          <p className="mt-1 text-muted-foreground">Track every college and certification submission in one place.</p>
        </div>
        <Link to="/colleges">
          <Button className="gradient-primary text-primary-foreground border-0">Explore More</Button>
        </Link>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading applications...</p>
      ) : applications.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center">
          <FileText className="mx-auto h-10 w-10 text-muted-foreground" />
          <h2 className="mt-4 font-display text-lg font-semibold text-foreground">No applications yet</h2>
          <p className="mt-2 text-sm text-muted-foreground">Apply to a college or certification and it will appear here.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {applications.map((application) => {
            const targetTitle = application.type === "COLLEGE" ? application.college?.name : application.certificationCourse?.title;
            const targetMeta = application.type === "COLLEGE" ? application.college?.location : application.certificationCourse?.provider;
            const applicationDocuments = documents.filter((document) => document.applicationId === application.id);

            return (
              <div key={application.id} className="rounded-xl border border-border bg-card p-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${statusStyles[application.status]}`}>
                        {application.status}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-foreground">
                        {application.type === "COLLEGE" ? <Building2 className="h-3.5 w-3.5" /> : <Award className="h-3.5 w-3.5" />}
                        {application.type === "COLLEGE" ? "College" : "Certification"}
                      </span>
                    </div>

                    <h2 className="mt-3 font-display text-xl font-semibold text-foreground">{targetTitle}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">{targetMeta}</p>

                    {application.courseName && <p className="mt-3 text-sm text-foreground">Program: {application.courseName}</p>}
                    <p className="mt-2 text-sm text-muted-foreground">Qualification: {application.qualification}</p>
                    {application.scoreOrRank && <p className="mt-1 text-sm text-muted-foreground">Score / Rank: {application.scoreOrRank}</p>}
                    {application.statement && <p className="mt-3 text-sm leading-6 text-muted-foreground">{application.statement}</p>}
                  </div>

                  <div className="rounded-lg bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <CalendarDays className="h-4 w-4" />
                      Applied on {new Date(application.appliedAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
                  <div>
                    <p className="text-sm font-medium text-foreground">Requirements captured with this application</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {application.requirementsSnapshot.map((requirement) => (
                        <span key={requirement} className="rounded-full bg-primary/10 px-3 py-1 text-xs text-primary">
                          {requirement}
                        </span>
                      ))}
                    </div>

                    <div className="mt-4 rounded-lg bg-muted/30 p-4 text-sm text-muted-foreground">
                      {application.status === "ACCEPTED"
                        ? application.paymentStatus === "PAID"
                          ? "Next step complete: payment verified."
                          : "Next step: complete the payment process to confirm your seat or enrollment."
                        : "Next step: wait for review. Payment is unlocked only after acceptance."}
                    </div>

                    <div className="mt-4">
                      <p className="text-sm font-medium text-foreground">Document Verification</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {applicationDocuments.map((document) => (
                          <span key={document.id} className="rounded-full bg-secondary px-3 py-1 text-xs text-foreground">
                            {document.fileName} · {document.status}
                          </span>
                        ))}
                        {applicationDocuments.length === 0 && <span className="text-sm text-muted-foreground">No documents uploaded yet.</span>}
                      </div>
                      <label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-foreground hover:bg-muted/40">
                        Upload Document
                        <input type="file" className="hidden" onChange={(event) => void uploadDocument(application.id, event.target.files?.[0])} />
                      </label>
                    </div>
                  </div>

                  <div className="flex flex-col items-start gap-3">
                    {application.status === "ACCEPTED" && (
                      <Link to={`/applications/${application.id}/payment`}>
                        <Button className="gradient-primary text-primary-foreground border-0">
                          {application.paymentStatus === "PAID" ? "View Payment" : "Proceed to Payment"}
                        </Button>
                      </Link>
                    )}

                    {application.type === "COLLEGE" && application.college ? (
                      <Link to={`/colleges/${application.college.id}`} className="inline-flex items-center gap-1 text-sm font-medium text-primary">
                        View college <ChevronRight className="h-4 w-4" />
                      </Link>
                    ) : (
                      <Link to="/certifications" className="inline-flex items-center gap-1 text-sm font-medium text-primary">
                        View certification <ChevronRight className="h-4 w-4" />
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </DashboardLayout>
  );
}
