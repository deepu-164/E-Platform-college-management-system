import { useEffect, useState } from "react";
import { Plus, Search, Trash2 } from "lucide-react";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api";

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

const emptyForm = {
  title: "",
  provider: "",
  duration: "6 Weeks",
  enrolled: "0",
  rating: "4.5",
  level: "Beginner",
  price: "?9,999",
  description: "",
  requirements: "Basic interest in the subject"
};

export default function AdminCourses() {
  const { toast } = useToast();
  const [items, setItems] = useState<Certification[]>([]);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(emptyForm);

  const load = async () => {
    try {
      const response = await apiGet<{ success: boolean; items: Certification[] }>("/admin-content/certifications");
      const filtered = search
        ? response.items.filter((item) => [item.title, item.provider, item.level].some((value) => value.toLowerCase().includes(search.toLowerCase())))
        : response.items;
      setItems(filtered);
    } catch {
      toast({ title: "Unable to load courses", description: "Please try again.", variant: "destructive" });
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const createItem = async () => {
    const title = form.title.trim();
    const provider = form.provider.trim();
    const description = form.description.trim();
    const requirements = form.requirements.split("\n").map((item) => item.trim()).filter(Boolean);
    const enrolled = Number(form.enrolled);
    const rating = Number(form.rating);

    if (!title || !provider) {
      toast({ title: "Title and provider are required", variant: "destructive" });
      return;
    }

    if (description.length < 10) {
      toast({ title: "Description is too short", description: "Use at least 10 characters.", variant: "destructive" });
      return;
    }

    if (requirements.length === 0) {
      toast({ title: "At least one requirement is needed", variant: "destructive" });
      return;
    }

    if (!Number.isFinite(enrolled) || enrolled < 0 || !Number.isFinite(rating) || rating < 0 || rating > 5) {
      toast({ title: "Invalid enrolled or rating values", variant: "destructive" });
      return;
    }

    try {
      await apiPost("/admin-content/certifications", {
        ...form,
        title,
        provider,
        description,
        enrolled,
        rating,
        requirements
      });
      setForm(emptyForm);
      await load();
      toast({ title: "Course added", description: "The new course is now listed below." });
    } catch {
      toast({ title: "Failed to add course", description: "Please check all fields and try again.", variant: "destructive" });
    }
  };

  const updateItem = async (id: string, payload: Partial<Certification>) => {
    try {
      await apiPatch(`/admin-content/certifications/${id}`, payload);
      await load();
    } catch {
      toast({ title: "Failed to update course", variant: "destructive" });
    }
  };

  const deleteItem = async (id: string) => {
    try {
      await apiDelete(`/admin-content/certifications/${id}`);
      await load();
    } catch {
      toast({ title: "Failed to delete course", variant: "destructive" });
    }
  };

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="font-display text-2xl font-bold text-foreground">Manage Courses</h1>
        <p className="mt-1 text-muted-foreground">Create and maintain certification and upskilling course cards shown to students.</p>
      </div>

      <div className="mb-6 rounded-xl border border-border bg-card p-5">
        <div className="mb-4 flex items-center gap-2"><Plus className="h-5 w-5 text-primary" /><h2 className="font-display text-lg font-semibold text-foreground">Add Course</h2></div>
        <div className="grid gap-3 md:grid-cols-3">
          <Input placeholder="Course title" value={form.title} onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))} />
          <Input placeholder="Provider" value={form.provider} onChange={(e) => setForm((prev) => ({ ...prev, provider: e.target.value }))} />
          <Input placeholder="Duration" value={form.duration} onChange={(e) => setForm((prev) => ({ ...prev, duration: e.target.value }))} />
          <Input placeholder="Enrolled" value={form.enrolled} onChange={(e) => setForm((prev) => ({ ...prev, enrolled: e.target.value }))} />
          <Input placeholder="Rating" value={form.rating} onChange={(e) => setForm((prev) => ({ ...prev, rating: e.target.value }))} />
          <Input placeholder="Level" value={form.level} onChange={(e) => setForm((prev) => ({ ...prev, level: e.target.value }))} />
          <Input placeholder="Price" value={form.price} onChange={(e) => setForm((prev) => ({ ...prev, price: e.target.value }))} />
          <Textarea placeholder="Description" value={form.description} onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))} className="md:col-span-2" />
          <Textarea placeholder="Requirements, one per line" value={form.requirements} onChange={(e) => setForm((prev) => ({ ...prev, requirements: e.target.value }))} className="md:col-span-2" />
          <Button onClick={() => void createItem()}>Add Course</Button>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search courses..." value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === "Enter" && void load()} className="pl-10" />
          </div>
          <Button variant="outline" onClick={() => void load()}>Search</Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Title</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Provider</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Level</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Price</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-muted-foreground">Delete</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 min-w-64"><Input defaultValue={item.title} onBlur={(e) => void updateItem(item.id, { title: e.target.value })} /></td>
                  <td className="px-4 py-3 min-w-52"><Input defaultValue={item.provider} onBlur={(e) => void updateItem(item.id, { provider: e.target.value })} /></td>
                  <td className="px-4 py-3 min-w-36"><Input defaultValue={item.level} onBlur={(e) => void updateItem(item.id, { level: e.target.value })} /></td>
                  <td className="px-4 py-3 min-w-36"><Input defaultValue={item.price} onBlur={(e) => void updateItem(item.id, { price: e.target.value })} /></td>
                  <td className="px-4 py-3 text-right"><Button variant="ghost" size="sm" onClick={() => void deleteItem(item.id)}><Trash2 className="h-4 w-4" /></Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}
