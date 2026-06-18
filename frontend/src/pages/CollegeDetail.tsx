import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MapPin, Star, Globe, Phone, Mail, ArrowLeft, Building2, Clock, IndianRupee, Users, CheckCircle2, CalendarDays, Share2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiGet, apiPost, type ApiItemResponse } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

type Course = {
  id: string;
  name: string;
  duration: string;
  feesPerYear: number;
  seats: number;
};

type CollegeDetailResponse = {
  id: string;
  name: string;
  location: string;
  rating: number;
  type: string;
  established?: number;
  website?: string;
  phone?: string;
  email?: string;
  description: string;
  admissionRequirements: string[];
  courses: Course[];
  reviews: {
    id: string;
    rating: number;
    comment: string;
    createdAt: string;
    user: {
      id: string;
      name: string;
    };
  }[];
};

export default function CollegeDetail() {
  const { id } = useParams();
  const { toast } = useToast();
  const { user } = useAuth();
  const [college, setCollege] = useState<CollegeDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [inquirySubmitted, setInquirySubmitted] = useState(false);
  const [appointmentSubmitted, setAppointmentSubmitted] = useState(false);
  const [message, setMessage] = useState("");
  const [courseName, setCourseName] = useState("MCA");
  const [appointmentMode, setAppointmentMode] = useState<"IN_PERSON" | "CALL" | "VIDEO">("IN_PERSON");
  const [scheduledFor, setScheduledFor] = useState("");
  const [appointmentNotes, setAppointmentNotes] = useState("");
  const [reviewRating, setReviewRating] = useState("5");
  const [reviewComment, setReviewComment] = useState("");

  useEffect(() => {
    const loadCollege = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const data = await apiGet<ApiItemResponse<CollegeDetailResponse>>(`/colleges/${id}`);
        setCollege(data.item);
        if (data.item.courses.length > 0) {
          setCourseName(data.item.courses[0].name);
        }
      } finally {
        setLoading(false);
      }
    };

    void loadCollege();
  }, [id]);

  const handleInquiry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!college) return;

    try {
      await apiPost("/inquiries", {
        collegeId: college.id,
        courseName,
        message
      });
      setInquirySubmitted(true);
      toast({ title: "Inquiry Submitted", description: "The college will get back to you shortly." });
    } catch {
      toast({ title: "Submission failed", description: "Please try again.", variant: "destructive" });
    }
  };

  const handleAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!college) return;

    try {
      await apiPost("/appointments", {
        collegeId: college.id,
        scheduledFor,
        mode: appointmentMode,
        notes: appointmentNotes
      });
      setAppointmentSubmitted(true);
      setAppointmentNotes("");
      toast({ title: "Appointment requested", description: "Your booking request has been shared with the college." });
    } catch {
      toast({ title: "Booking failed", description: "Please check the date and try again.", variant: "destructive" });
    }
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!college) return;

    try {
      await apiPost(`/colleges/${college.id}/reviews`, {
        rating: Number(reviewRating),
        comment: reviewComment
      });
      const data = await apiGet<ApiItemResponse<CollegeDetailResponse>>(`/colleges/${college.id}`);
      setCollege(data.item);
      setReviewComment("");
      toast({ title: "Review saved", description: "Your rating has been added to this college." });
    } catch {
      toast({ title: "Review failed", description: "Please try again.", variant: "destructive" });
    }
  };

  const shareLinks = college
    ? {
        whatsapp: `https://wa.me/?text=${encodeURIComponent(`Check out ${college.name} on E-platform: ${window.location.href}`)}`,
        facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`,
        linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.href)}`
      }
    : null;

  if (loading || !college) {
    return (
      <DashboardLayout>
        <p className="text-muted-foreground">Loading college details...</p>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <Link to="/colleges" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="h-4 w-4" /> Back to Colleges
      </Link>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card rounded-xl border border-border p-6">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-xl bg-secondary flex items-center justify-center shrink-0">
                <Building2 className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <h1 className="font-display text-2xl font-bold text-foreground">{college.name}</h1>
                <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1"><MapPin className="h-4 w-4" /> {college.location}</span>
                  <span className="flex items-center gap-1"><Star className="h-4 w-4 text-warning fill-warning" /> {college.rating.toFixed(1)}</span>
                  {college.established && <span className="flex items-center gap-1"><Clock className="h-4 w-4" /> Est. {college.established}</span>}
                  <span className="px-2 py-0.5 bg-primary/10 text-primary rounded-full text-xs font-medium">{college.type}</span>
                </div>
              </div>
            </div>
            <p className="mt-4 text-muted-foreground leading-relaxed">{college.description}</p>
            <div className="flex flex-wrap gap-4 mt-4 text-sm text-muted-foreground">
              {college.website && <a href={college.website} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-primary"><Globe className="h-4 w-4" /> {college.website.replace(/^https?:\/\//, "")}</a>}
              {college.phone && <span className="flex items-center gap-1"><Phone className="h-4 w-4" /> {college.phone}</span>}
              {college.email && <span className="flex items-center gap-1"><Mail className="h-4 w-4" /> {college.email}</span>}
            </div>
            <div className="mt-5">
              <div className="flex flex-wrap gap-3">
                <Link to={`/applications/new?type=college&collegeId=${college.id}`}>
                  <Button className="gradient-primary text-primary-foreground border-0">Apply Now</Button>
                </Link>
                {shareLinks && (
                  <>
                    <a href={shareLinks.whatsapp} target="_blank" rel="noreferrer">
                      <Button variant="outline"><Share2 className="mr-2 h-4 w-4" /> WhatsApp</Button>
                    </a>
                    <a href={shareLinks.facebook} target="_blank" rel="noreferrer">
                      <Button variant="outline">Facebook</Button>
                    </a>
                    <a href={shareLinks.linkedin} target="_blank" rel="noreferrer">
                      <Button variant="outline">LinkedIn</Button>
                    </a>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="bg-card rounded-xl border border-border p-6">
            <h2 className="font-display text-lg font-semibold text-foreground mb-4">Available Courses</h2>
            <div className="space-y-3">
              {college.courses.map((course) => (
                <div key={course.id} className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border border-border/50">
                  <div>
                    <p className="font-medium text-foreground">{course.name}</p>
                    <p className="text-sm text-muted-foreground">{course.duration}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-foreground flex items-center gap-1"><IndianRupee className="h-3.5 w-3.5" /> {(course.feesPerYear / 100000).toFixed(1)}L/yr</p>
                    <p className="text-sm text-muted-foreground flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {course.seats} seats</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-card rounded-xl border border-border p-6">
            <h2 className="font-display text-lg font-semibold text-foreground mb-4">Admission Requirements</h2>
            <div className="space-y-3">
              {college.admissionRequirements.map((requirement) => (
                <div key={requirement} className="flex gap-3 rounded-lg border border-border/60 bg-muted/30 px-4 py-3">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                  <p className="text-sm text-foreground">{requirement}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-card rounded-xl border border-border p-6">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="font-display text-lg font-semibold text-foreground">Student Reviews</h2>
                <p className="text-sm text-muted-foreground mt-1">Real feedback from students using the portal.</p>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-warning/10 px-3 py-1 text-sm text-warning">
                <Star className="h-4 w-4 fill-warning" /> {college.rating.toFixed(1)}
              </span>
            </div>

            <form onSubmit={handleReviewSubmit} className="mb-6 space-y-4 rounded-lg border border-border/60 bg-muted/20 p-4">
              <div className="grid gap-4 md:grid-cols-[140px_1fr]">
                <select
                  value={reviewRating}
                  onChange={(e) => setReviewRating(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {[5, 4, 3, 2, 1].map((value) => (
                    <option key={value} value={value}>{value} Star{value > 1 ? "s" : ""}</option>
                  ))}
                </select>
                <Textarea
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  rows={3}
                  placeholder="Share your view on placements, faculty, admissions, or campus experience..."
                  required
                />
              </div>
              <Button type="submit" variant="outline">Submit Review</Button>
            </form>

            <div className="space-y-4">
              {college.reviews.length > 0 ? college.reviews.map((review) => (
                <div key={review.id} className="rounded-lg border border-border/50 bg-muted/20 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-foreground">{review.user.name}</p>
                      <p className="text-xs text-muted-foreground">{new Date(review.createdAt).toLocaleDateString()}</p>
                    </div>
                    <span className="inline-flex items-center gap-1 text-sm text-warning">
                      <Star className="h-4 w-4 fill-warning" /> {review.rating.toFixed(1)}
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">{review.comment}</p>
                </div>
              )) : (
                <p className="text-sm text-muted-foreground">No reviews yet. Be the first to add one.</p>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-card rounded-xl border border-border p-6">
            <h3 className="font-display font-semibold text-foreground mb-4">Book Appointment</h3>
            {appointmentSubmitted ? (
              <div className="text-center py-8">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-success/10">
                  <CalendarDays className="h-6 w-6 text-success" />
                </div>
                <p className="font-medium text-foreground">Booking requested</p>
                <p className="mt-1 text-sm text-muted-foreground">You can track updates from the appointments page.</p>
              </div>
            ) : (
              <form onSubmit={handleAppointment} className="space-y-4">
                <Input placeholder="Your Name" value={user?.name ?? ""} readOnly />
                <Input type="datetime-local" value={scheduledFor} onChange={(e) => setScheduledFor(e.target.value)} required />
                <select
                  value={appointmentMode}
                  onChange={(e) => setAppointmentMode(e.target.value as "IN_PERSON" | "CALL" | "VIDEO")}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                >
                  <option value="IN_PERSON">In person</option>
                  <option value="CALL">Phone call</option>
                  <option value="VIDEO">Video call</option>
                </select>
                <Textarea
                  placeholder="What do you want to discuss in this session?"
                  rows={4}
                  value={appointmentNotes}
                  onChange={(e) => setAppointmentNotes(e.target.value)}
                />
                <Button type="submit" className="w-full gradient-primary text-primary-foreground border-0">
                  Request Appointment
                </Button>
              </form>
            )}
          </div>

          <div className="bg-card rounded-xl border border-border p-6">
            <h3 className="font-display font-semibold text-foreground mb-4">Send Inquiry</h3>
            {inquirySubmitted ? (
              <div className="text-center py-8">
                <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-3">
                  <Mail className="h-6 w-6 text-success" />
                </div>
                <p className="font-medium text-foreground">Inquiry Sent</p>
                <p className="text-sm text-muted-foreground mt-1">We will notify you when the college responds.</p>
              </div>
            ) : (
              <form onSubmit={handleInquiry} className="space-y-4">
                <Input placeholder="Your Name" value={user?.name ?? ""} readOnly />
                <Input placeholder="Email Address" value={user?.email ?? ""} readOnly />
                <Input placeholder="Course" value={courseName} onChange={(e) => setCourseName(e.target.value)} required />
                <Textarea placeholder="Your message or questions about this college..." rows={4} value={message} onChange={(e) => setMessage(e.target.value)} required />
                <Button type="submit" className="w-full gradient-primary text-primary-foreground border-0">
                  Submit Inquiry
                </Button>
              </form>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}


