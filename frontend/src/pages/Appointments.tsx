import { useEffect, useState } from "react";
import { CalendarDays, Clock3, MapPin, Phone, Video } from "lucide-react";
import { Link } from "react-router-dom";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { apiGet, apiPatch, type ApiListResponse } from "@/lib/api";

type Appointment = {
  id: string;
  scheduledFor: string;
  mode: "IN_PERSON" | "CALL" | "VIDEO";
  notes?: string | null;
  status: "REQUESTED" | "CONFIRMED" | "COMPLETED" | "CANCELED";
  counselorName?: string | null;
  meetingLink?: string | null;
  college: {
    id: string;
    name: string;
    location: string;
  };
};

const statusStyles: Record<Appointment["status"], string> = {
  REQUESTED: "bg-warning/10 text-warning",
  CONFIRMED: "bg-success/10 text-success",
  COMPLETED: "bg-primary/10 text-primary",
  CANCELED: "bg-muted text-muted-foreground"
};

const modeLabels: Record<Appointment["mode"], string> = {
  IN_PERSON: "In person",
  CALL: "Phone call",
  VIDEO: "Video call"
};

const modeIcons = {
  IN_PERSON: MapPin,
  CALL: Phone,
  VIDEO: Video
} satisfies Record<Appointment["mode"], typeof MapPin>;

export default function Appointments() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadAppointments = async () => {
    setLoading(true);
    try {
      const response = await apiGet<ApiListResponse<Appointment>>("/appointments", { limit: 100 });
      setAppointments(response.items);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAppointments();
  }, []);

  const cancelAppointment = async (appointmentId: string) => {
    setBusyId(appointmentId);
    try {
      await apiPatch(`/appointments/${appointmentId}`, { status: "CANCELED" });
      await loadAppointments();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <DashboardLayout>
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">My Appointments</h1>
          <p className="mt-1 text-muted-foreground">Track counseling slots, follow-ups, and college discussions.</p>
        </div>
        <Link to="/colleges">
          <Button className="gradient-primary border-0 text-primary-foreground">Book New Slot</Button>
        </Link>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading appointments...</p>
      ) : appointments.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center">
          <CalendarDays className="mx-auto h-10 w-10 text-muted-foreground" />
          <h2 className="mt-4 font-display text-lg font-semibold text-foreground">No appointments booked</h2>
          <p className="mt-2 text-sm text-muted-foreground">Book a counseling slot from any college detail page.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {appointments.map((appointment) => {
            const ModeIcon = modeIcons[appointment.mode];

            return (
              <div key={appointment.id} className="rounded-xl border border-border bg-card p-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusStyles[appointment.status]}`}>
                        {appointment.status}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-foreground">
                        <ModeIcon className="h-3.5 w-3.5" />
                        {modeLabels[appointment.mode]}
                      </span>
                    </div>

                    <h2 className="mt-3 font-display text-xl font-semibold text-foreground">{appointment.college.name}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">{appointment.college.location}</p>

                    <div className="mt-4 grid gap-2 text-sm text-muted-foreground">
                      <p className="flex items-center gap-2">
                        <CalendarDays className="h-4 w-4" />
                        {new Date(appointment.scheduledFor).toLocaleString()}
                      </p>
                      {appointment.counselorName && (
                        <p className="flex items-center gap-2">
                          <Clock3 className="h-4 w-4" />
                          Counselor: {appointment.counselorName}
                        </p>
                      )}
                    </div>

                    {appointment.notes && <p className="mt-4 text-sm leading-6 text-muted-foreground">{appointment.notes}</p>}

                    {appointment.meetingLink && appointment.status === "CONFIRMED" && (
                      <a href={appointment.meetingLink} target="_blank" rel="noreferrer" className="mt-4 inline-flex text-sm font-medium text-primary">
                        Join meeting
                      </a>
                    )}
                  </div>

                  <div className="flex flex-col items-start gap-3">
                    {(appointment.status === "REQUESTED" || appointment.status === "CONFIRMED") && (
                      <Button
                        variant="outline"
                        onClick={() => void cancelAppointment(appointment.id)}
                        disabled={busyId === appointment.id}
                      >
                        {busyId === appointment.id ? "Canceling..." : "Cancel Appointment"}
                      </Button>
                    )}
                    <Link to={`/colleges/${appointment.college.id}`} className="text-sm font-medium text-primary">
                      View college
                    </Link>
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
