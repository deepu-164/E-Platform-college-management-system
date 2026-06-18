import { useEffect, useMemo, useState } from "react";
import { Building2, Search, Trash2, UserPlus } from "lucide-react";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiDelete, apiGet, apiPatch, apiPost, type ApiListResponse } from "@/lib/api";

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  managedCollegeId?: string | null;
  createdAt: string;
};

type College = {
  id: string;
  name: string;
  location: string;
};

const roleOptions = ["STUDENT", "COLLEGE", "ADMIN"];
const statusOptions = ["ACTIVE", "INACTIVE"];
const emptyUser = { name: "", email: "", password: "", role: "STUDENT", status: "ACTIVE", managedCollegeId: "" };

export default function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [colleges, setColleges] = useState<College[]>([]);
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [newUser, setNewUser] = useState(emptyUser);

  const collegeOptions = useMemo(() => colleges.map((college) => ({
    value: college.id,
    label: `${college.name} (${college.location})`
  })), [colleges]);

  const load = async () => {
    const [userResponse, collegeResponse] = await Promise.all([
      apiGet<ApiListResponse<User>>("/users", { limit: 5000, search: search || undefined }),
      apiGet<ApiListResponse<College>>("/colleges", { limit: 5000, sortBy: "name", sortOrder: "asc" })
    ]);

    setUsers(userResponse.items);
    setColleges(collegeResponse.items);
  };

  useEffect(() => {
    void load();
  }, []);

  const createUser = async () => {
    setCreating(true);
    try {
      await apiPost("/users", {
        ...newUser,
        managedCollegeId: newUser.role === "COLLEGE" && newUser.managedCollegeId ? newUser.managedCollegeId : undefined
      });
      setNewUser(emptyUser);
      await load();
    } finally {
      setCreating(false);
    }
  };

  const updateUser = async (id: string, payload: Record<string, string | null>) => {
    await apiPatch(`/users/${id}`, payload);
    await load();
  };

  const deleteUser = async (id: string) => {
    await apiDelete(`/users/${id}`);
    await load();
  };

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="font-display text-2xl font-bold text-foreground">Manage Users</h1>
        <p className="mt-1 text-muted-foreground">Create accounts, assign real colleges to college managers, update access, and remove old accounts.</p>
      </div>

      <div className="mb-6 rounded-xl border border-border bg-card p-5">
        <div className="mb-4 flex items-center gap-2">
          <UserPlus className="h-5 w-5 text-primary" />
          <h2 className="font-display text-lg font-semibold text-foreground">Create User</h2>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <Input placeholder="Full name" value={newUser.name} onChange={(event) => setNewUser((prev) => ({ ...prev, name: event.target.value }))} />
          <Input placeholder="Email" type="email" value={newUser.email} onChange={(event) => setNewUser((prev) => ({ ...prev, email: event.target.value }))} />
          <Input placeholder="Password" type="password" value={newUser.password} onChange={(event) => setNewUser((prev) => ({ ...prev, password: event.target.value }))} />
          <select value={newUser.role} onChange={(event) => setNewUser((prev) => ({ ...prev, role: event.target.value, managedCollegeId: event.target.value === "COLLEGE" ? prev.managedCollegeId : "" }))} className="rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground">
            {roleOptions.map((role) => <option key={role} value={role}>{role}</option>)}
          </select>
          <select value={newUser.status} onChange={(event) => setNewUser((prev) => ({ ...prev, status: event.target.value }))} className="rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground">
            {statusOptions.map((status) => <option key={status} value={status}>{status}</option>)}
          </select>
          {newUser.role === "COLLEGE" ? (
            <select value={newUser.managedCollegeId} onChange={(event) => setNewUser((prev) => ({ ...prev, managedCollegeId: event.target.value }))} className="rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground">
              <option value="">Select managed college</option>
              {collegeOptions.map((college) => <option key={college.value} value={college.value}>{college.label}</option>)}
            </select>
          ) : (
            <div className="flex items-center rounded-md border border-dashed border-border px-3 py-2 text-sm text-muted-foreground">
              College link not required for this role.
            </div>
          )}
          <Button onClick={() => void createUser()} disabled={creating} className="md:col-span-3">{creating ? "Creating..." : "Create User"}</Button>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search users..." value={search} onChange={(event) => setSearch(event.target.value)} onKeyDown={(event) => event.key === "Enter" && void load()} className="pl-10" />
          </div>
          <Button variant="outline" onClick={() => void load()}>Search</Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Email</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Role</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Managed College</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Joined</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-muted-foreground">Delete</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b border-border/50 transition-colors hover:bg-muted/30">
                  <td className="px-4 py-3 text-sm font-medium text-foreground">{user.name}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{user.email}</td>
                  <td className="px-4 py-3">
                    <select value={user.role} onChange={(event) => void updateUser(user.id, { role: event.target.value, managedCollegeId: event.target.value === "COLLEGE" ? user.managedCollegeId ?? null : null })} className="rounded-md border border-input bg-background px-2 py-1 text-xs font-medium text-foreground">
                      {roleOptions.map((role) => <option key={role} value={role}>{role}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <select value={user.status} onChange={(event) => void updateUser(user.id, { status: event.target.value })} className="rounded-md border border-input bg-background px-2 py-1 text-xs font-medium text-foreground">
                      {statusOptions.map((status) => <option key={status} value={status}>{status}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    {user.role === "COLLEGE" ? (
                      <div className="flex min-w-[260px] items-center gap-2">
                        <Building2 className="h-4 w-4 text-primary" />
                        <select value={user.managedCollegeId ?? ""} onChange={(event) => void updateUser(user.id, { managedCollegeId: event.target.value || null })} className="w-full rounded-md border border-input bg-background px-2 py-1 text-xs font-medium text-foreground">
                          <option value="">Unassigned</option>
                          {collegeOptions.map((college) => <option key={college.value} value={college.value}>{college.label}</option>)}
                        </select>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">Not applicable</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{new Date(user.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="ghost" size="sm" onClick={() => void deleteUser(user.id)}><Trash2 className="h-4 w-4" /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}
