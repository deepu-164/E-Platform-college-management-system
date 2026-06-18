import { useEffect, useState } from "react";
import { Search } from "lucide-react";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiGet, apiPatch, type ApiListResponse } from "@/lib/api";

type Inquiry = {
  id: string;
  courseName: string;
  message: string;
  status: string;
  createdAt: string;
  user: { name: string; email: string };
  college: { name: string; location: string };
};

const statusOptions = ["NEW", "CONTACTED", "CONVERTED", "CLOSED"];

export default function AdminInquiries() {
  const [items, setItems] = useState<Inquiry[]>([]);
  const [search, setSearch] = useState("");

  const load = async () => {
    const response = await apiGet<ApiListResponse<Inquiry>>("/inquiries", { limit: 5000, search: search || undefined });
    setItems(response.items);
  };

  useEffect(() => {
    void load();
  }, []);

  const updateStatus = async (id: string, status: string) => {
    await apiPatch(`/inquiries/${id}`, { status });
    await load();
  };

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="font-display text-2xl font-bold text-foreground">View Enquiries</h1>
        <p className="mt-1 text-muted-foreground">Review incoming student leads, follow up, and move each enquiry through the pipeline.</p>
      </div>

      <div className="rounded-xl border border-border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search enquiries..." value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === "Enter" && void load()} className="pl-10" />
          </div>
          <Button variant="outline" onClick={() => void load()}>Search</Button>
        </div>
        <div className="space-y-3 p-4">
          {items.map((item) => (
            <div key={item.id} className="rounded-lg border border-border/60 bg-muted/20 p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="font-medium text-foreground">{item.user.name} • {item.college.name}</p>
                  <p className="text-sm text-muted-foreground">{item.user.email} • {item.college.location}</p>
                  <p className="mt-2 text-sm text-foreground">{item.courseName}</p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.message}</p>
                  <p className="mt-2 text-xs text-muted-foreground">{new Date(item.createdAt).toLocaleString()}</p>
                </div>
                <select value={item.status} onChange={(e) => void updateStatus(item.id, e.target.value)} className="rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground">
                  {statusOptions.map((status) => <option key={status} value={status}>{status}</option>)}
                </select>
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
