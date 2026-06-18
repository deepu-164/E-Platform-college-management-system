import { ChangeEvent, useEffect, useState } from "react";
import { Camera, Save } from "lucide-react";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiGet, apiPatch, type ApiItemResponse } from "@/lib/api";

type Profile = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  city?: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
  targetCourse?: string | null;
};

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function Profile() {
  const { toast } = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      const response = await apiGet<ApiItemResponse<Profile>>("/users/me/profile");
      setProfile(response.item);
    };

    void load();
  }, []);

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !profile) return;
    const avatarUrl = await fileToDataUrl(file);
    setProfile({ ...profile, avatarUrl });
  };

  const save = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      const response = await apiPatch<ApiItemResponse<Profile>, Profile>("/users/me/profile", profile);
      setProfile(response.item);
      toast({ title: "Profile updated", description: "Your profile changes were saved." });
    } finally {
      setSaving(false);
    }
  };

  if (!profile) {
    return <DashboardLayout><p className="text-muted-foreground">Loading profile...</p></DashboardLayout>;
  }

  return (
    <DashboardLayout>
      <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="rounded-xl border border-border bg-card p-6">
          <h1 className="font-display text-2xl font-bold text-foreground">My Profile</h1>
          <p className="mt-1 text-muted-foreground">Manage your personal details, avatar, and target course.</p>

          <div className="mt-6 flex flex-col items-center gap-4">
            <Avatar className="h-28 w-28 border border-border">
              <AvatarImage src={profile.avatarUrl ?? undefined} />
              <AvatarFallback>{profile.name.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-foreground hover:bg-muted/40">
              <Camera className="h-4 w-4" />
              Change Photo
              <input type="file" accept="image/*" className="hidden" onChange={handleFile} />
            </label>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-6">
          <div className="grid gap-4 md:grid-cols-2">
            <Input value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} placeholder="Full name" />
            <Input value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} placeholder="Email" />
            <Input value={profile.phone ?? ""} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} placeholder="Phone" />
            <Input value={profile.city ?? ""} onChange={(e) => setProfile({ ...profile, city: e.target.value })} placeholder="City" />
            <Input value={profile.targetCourse ?? ""} onChange={(e) => setProfile({ ...profile, targetCourse: e.target.value })} placeholder="Target course" className="md:col-span-2" />
            <Textarea value={profile.bio ?? ""} onChange={(e) => setProfile({ ...profile, bio: e.target.value })} placeholder="Short bio" rows={5} className="md:col-span-2" />
          </div>

          <Button onClick={() => void save()} disabled={saving} className="mt-6 gradient-primary text-primary-foreground border-0">
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Saving..." : "Save Profile"}
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
