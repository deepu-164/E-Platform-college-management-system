import { useEffect, useState } from "react";
import { Plus, Search, Trash2 } from "lucide-react";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api";

type Question = {
  id: string;
  examType: string;
  difficulty: string;
  question: string;
  options: string[];
  answer: number;
  explanation?: string | null;
};

const emptyForm = {
  examType: "KCET",
  difficulty: "Easy",
  question: "",
  optionA: "",
  optionB: "",
  optionC: "",
  optionD: "",
  answer: "0",
  explanation: ""
};

export default function AdminExams() {
  const [items, setItems] = useState<Question[]>([]);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(emptyForm);

  const load = async () => {
    const response = await apiGet<{ success: boolean; items: Question[] }>("/admin-content/mock-questions");
    const filtered = search ? response.items.filter((item) => [item.examType, item.difficulty, item.question].some((value) => value.toLowerCase().includes(search.toLowerCase()))) : response.items;
    setItems(filtered);
  };

  useEffect(() => {
    void load();
  }, []);

  const createItem = async () => {
    await apiPost("/admin-content/mock-questions", {
      examType: form.examType,
      difficulty: form.difficulty,
      question: form.question,
      options: [form.optionA, form.optionB, form.optionC, form.optionD],
      answer: Number(form.answer),
      explanation: form.explanation || undefined
    });
    setForm(emptyForm);
    await load();
  };

  const updateItem = async (id: string, payload: Partial<Question>) => {
    await apiPatch(`/admin-content/mock-questions/${id}`, payload);
    await load();
  };

  const deleteItem = async (id: string) => {
    await apiDelete(`/admin-content/mock-questions/${id}`);
    await load();
  };

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="font-display text-2xl font-bold text-foreground">Manage Exams</h1>
        <p className="mt-1 text-muted-foreground">Maintain the mock-test question bank, difficulty levels, and explanations shown in practice exams.</p>
      </div>

      <div className="mb-6 rounded-xl border border-border bg-card p-5">
        <div className="mb-4 flex items-center gap-2"><Plus className="h-5 w-5 text-primary" /><h2 className="font-display text-lg font-semibold text-foreground">Add Mock Question</h2></div>
        <div className="grid gap-3 md:grid-cols-2">
          <Input placeholder="Exam type" value={form.examType} onChange={(e) => setForm((prev) => ({ ...prev, examType: e.target.value }))} />
          <Input placeholder="Difficulty" value={form.difficulty} onChange={(e) => setForm((prev) => ({ ...prev, difficulty: e.target.value }))} />
          <Textarea placeholder="Question" value={form.question} onChange={(e) => setForm((prev) => ({ ...prev, question: e.target.value }))} className="md:col-span-2" />
          <Input placeholder="Option A" value={form.optionA} onChange={(e) => setForm((prev) => ({ ...prev, optionA: e.target.value }))} />
          <Input placeholder="Option B" value={form.optionB} onChange={(e) => setForm((prev) => ({ ...prev, optionB: e.target.value }))} />
          <Input placeholder="Option C" value={form.optionC} onChange={(e) => setForm((prev) => ({ ...prev, optionC: e.target.value }))} />
          <Input placeholder="Option D" value={form.optionD} onChange={(e) => setForm((prev) => ({ ...prev, optionD: e.target.value }))} />
          <Input placeholder="Correct answer index (0-3)" value={form.answer} onChange={(e) => setForm((prev) => ({ ...prev, answer: e.target.value }))} />
          <Textarea placeholder="Explanation" value={form.explanation} onChange={(e) => setForm((prev) => ({ ...prev, explanation: e.target.value }))} className="md:col-span-2" />
          <Button onClick={() => void createItem()}>Add Question</Button>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search questions..." value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === "Enter" && void load()} className="pl-10" />
          </div>
          <Button variant="outline" onClick={() => void load()}>Search</Button>
        </div>
        <div className="space-y-3 p-4">
          {items.map((item) => (
            <div key={item.id} className="rounded-lg border border-border/60 bg-muted/20 p-4">
              <div className="grid gap-3 md:grid-cols-[1fr_auto_auto_auto] md:items-start">
                <Textarea defaultValue={item.question} onBlur={(e) => void updateItem(item.id, { question: e.target.value })} className="min-h-24" />
                <Input defaultValue={item.examType} onBlur={(e) => void updateItem(item.id, { examType: e.target.value })} />
                <Input defaultValue={item.difficulty} onBlur={(e) => void updateItem(item.id, { difficulty: e.target.value })} />
                <Button variant="ghost" size="sm" onClick={() => void deleteItem(item.id)}><Trash2 className="h-4 w-4" /></Button>
              </div>
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                {item.options.map((option, index) => (
                  <div key={`${item.id}-${index}`} className="rounded-md border border-border px-3 py-2 text-sm text-muted-foreground">
                    {String.fromCharCode(65 + index)}. {option}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
