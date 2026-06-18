import { useEffect, useState } from "react";
import { Building2, Plus, Search, Trash2 } from "lucide-react";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { apiDelete, apiGet, apiPatch, apiPost, type ApiListResponse } from "@/lib/api";

type College = {
  id: string;
  name: string;
  location: string;
  type: string;
  rank: number;
  rating: number;
  feesPerYear: number;
};

type CollegeForm = {
  name: string;
  location: string;
  type: string;
  rank: string;
  rating: string;
  feesPerYear: string;
  description: string;
  website: string;
  phone: string;
  email: string;
  established: string;
};

const emptyForm: CollegeForm = {
  name: "",
  location: "",
  type: "Private",
  rank: "9999",
  rating: "4",
  feesPerYear: "150000",
  description: "",
  website: "",
  phone: "",
  email: "",
  established: ""
};

function toPayload(form: CollegeForm) {
  return {
    name: form.name,
    location: form.location,
    type: form.type,
    rank: Number(form.rank),
    rating: Number(form.rating),
    feesPerYear: Number(form.feesPerYear),
    description: form.description || `${form.name} in ${form.location}`,
    admissionRequirements: ["Completed qualifying program", "Academic transcripts"],
    website: form.website || undefined,
    phone: form.phone || undefined,
    email: form.email || undefined,
    established: form.established ? Number(form.established) : undefined
  };
}

export default function AdminColleges() {
  const [colleges, setColleges] = useState<College[]>([]);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<CollegeForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const response = await apiGet<ApiListResponse<College>>("/colleges", { limit: 200, search: search || undefined, sortBy: "name", sortOrder: "asc" });
    setColleges(response.items);
  };

  useEffect(() => {
    void load();
  }, []);

  const createCollege = async () => {
    setSaving(true);
    try {
      await apiPost("/colleges", toPayload(form));
      setForm(emptyForm);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const updateCollege = async (college: College, payload: Partial<College>) => {
    await apiPatch(`/colleges/${college.id}`, payload);
    await load();
  };

  const deleteCollege = async (id: string) => {
    await apiDelete(`/colleges/${id}`);
    await load();
  };

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="font-display text-2xl font-bold text-foreground">Manage Colleges</h1>
        <p className="text-muted-foreground mt-1">Add new colleges, update existing listings, and remove entries that should not appear in Explore Colleges.</p>
      </div>

      <div className="rounded-xl border border-border bg-card p-5 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Plus className="h-5 w-5 text-primary" />
          <h2 className="font-display text-lg font-semibold text-foreground">Add College</h2>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <Input placeholder="College name" value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} />
          <Input placeholder="Location" value={form.location} onChange={(event) => setForm((prev) => ({ ...prev, location: event.target.value }))} />
          <Input placeholder="Type" value={form.type} onChange={(event) => setForm((prev) => ({ ...prev, type: event.target.value }))} />
          <Input placeholder="Rank" value={form.rank} onChange={(event) => setForm((prev) => ({ ...prev, rank: event.target.value }))} />
          <Input placeholder="Rating" value={form.rating} onChange={(event) => setForm((prev) => ({ ...prev, rating: event.target.value }))} />
          <Input placeholder="Fees per year" value={form.feesPerYear} onChange={(event) => setForm((prev) => ({ ...prev, feesPerYear: event.target.value }))} />
          <Input placeholder="Website" value={form.website} onChange={(event) => setForm((prev) => ({ ...prev, website: event.target.value }))} />
          <Input placeholder="Phone" value={form.phone} onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))} />
          <Input placeholder="Email" value={form.email} onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))} />
          <Input placeholder="Established year" value={form.established} onChange={(event) => setForm((prev) => ({ ...prev, established: event.target.value }))} />
          <Textarea placeholder="Description" value={form.description} onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))} className="md:col-span-2" />
          <Button onClick={() => void createCollege()} disabled={saving || !form.name || !form.location}>{saving ? "Saving..." : "Add College"}</Button>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search colleges..." value={search} onChange={(event) => setSearch(event.target.value)} onKeyDown={(event) => event.key === "Enter" && void load()} className="pl-10" />
          </div>
          <Button variant="outline" onClick={() => void load()}>Search</Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase">College</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase">Location</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase">Type</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase">Rank</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase">Rating</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase">Fees</th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-muted-foreground uppercase">Delete</th>
              </tr>
            </thead>
            <tbody>
              {colleges.map((college) => (
                <tr key={college.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                  <td className="py-3 px-4 min-w-64"><Input defaultValue={college.name} onBlur={(event) => void updateCollege(college, { name: event.target.value })} /></td>
                  <td className="py-3 px-4 min-w-40"><Input defaultValue={college.location} onBlur={(event) => void updateCollege(college, { location: event.target.value })} /></td>
                  <td className="py-3 px-4 min-w-36"><Input defaultValue={college.type} onBlur={(event) => void updateCollege(college, { type: event.target.value })} /></td>
                  <td className="py-3 px-4 min-w-24"><Input defaultValue={String(college.rank)} onBlur={(event) => void updateCollege(college, { rank: Number(event.target.value) })} /></td>
                  <td className="py-3 px-4 min-w-24"><Input defaultValue={String(college.rating)} onBlur={(event) => void updateCollege(college, { rating: Number(event.target.value) })} /></td>
                  <td className="py-3 px-4 min-w-32"><Input defaultValue={String(college.feesPerYear)} onBlur={(event) => void updateCollege(college, { feesPerYear: Number(event.target.value) })} /></td>
                  <td className="py-3 px-4 text-right"><Button variant="ghost" size="sm" onClick={() => void deleteCollege(college.id)}><Trash2 className="h-4 w-4" /></Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="border-t border-border p-4 text-sm text-muted-foreground">
          Showing {colleges.length} colleges. Use search to narrow the full database before editing.
        </div>
      </div>
    </DashboardLayout>
  );
}

