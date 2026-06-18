import { useEffect, useState } from "react";
import { Save, Share2 } from "lucide-react";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { apiGet, apiPatch } from "@/lib/api";

type SocialLink = {
  label: string;
  href: string;
  icon: "MessageCircle" | "Send" | "Instagram" | "Facebook" | "Youtube";
};

type SiteSettings = {
  brandTagline: string;
  connectText: string;
  socialLinks: SocialLink[];
};

const icons = ["MessageCircle", "Send", "Instagram", "Facebook", "Youtube"];

export default function AdminSocial() {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const response = await apiGet<{ success: boolean; item: SiteSettings }>("/admin-content/site-settings");
    setSettings(response.item);
  };

  useEffect(() => {
    void load();
  }, []);

  const saveSettings = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      await apiPatch("/admin-content/site-settings", settings);
      await load();
    } finally {
      setSaving(false);
    }
  };

  if (!settings) {
    return <DashboardLayout><p className="text-muted-foreground">Loading social integration...</p></DashboardLayout>;
  }

  return (
    <DashboardLayout>
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Social Media Integration</h1>
          <p className="mt-1 text-muted-foreground">Edit the footer message and official social channels shown across the frontend.</p>
        </div>
        <Button onClick={() => void saveSettings()} disabled={saving}><Save className="mr-2 h-4 w-4" />{saving ? "Saving..." : "Save Settings"}</Button>
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <div className="mb-4 flex items-center gap-2"><Share2 className="h-5 w-5 text-primary" /><h2 className="font-display text-lg font-semibold text-foreground">Footer Social Links</h2></div>
        <div className="grid gap-4">
          <Input value={settings.brandTagline} onChange={(e) => setSettings((prev) => prev ? { ...prev, brandTagline: e.target.value } : prev)} placeholder="Brand tagline" />
          <Textarea value={settings.connectText} onChange={(e) => setSettings((prev) => prev ? { ...prev, connectText: e.target.value } : prev)} placeholder="Connect text" />
          {settings.socialLinks.map((link, index) => (
            <div key={`${link.label}-${index}`} className="grid gap-3 rounded-lg border border-border/60 bg-muted/20 p-4 md:grid-cols-3">
              <Input value={link.label} onChange={(e) => setSettings((prev) => prev ? { ...prev, socialLinks: prev.socialLinks.map((item, itemIndex) => itemIndex === index ? { ...item, label: e.target.value } : item) } : prev)} placeholder="Label" />
              <Input value={link.href} onChange={(e) => setSettings((prev) => prev ? { ...prev, socialLinks: prev.socialLinks.map((item, itemIndex) => itemIndex === index ? { ...item, href: e.target.value } : item) } : prev)} placeholder="URL" />
              <select value={link.icon} onChange={(e) => setSettings((prev) => prev ? { ...prev, socialLinks: prev.socialLinks.map((item, itemIndex) => itemIndex === index ? { ...item, icon: e.target.value as SocialLink["icon"] } : item) } : prev)} className="rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground">
                {icons.map((icon) => <option key={icon} value={icon}>{icon}</option>)}
              </select>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
