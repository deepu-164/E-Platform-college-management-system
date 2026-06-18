import { Facebook, Instagram, MessageCircle, Send, Youtube } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { apiGet } from "@/lib/api";

type FooterLink = {
  label: string;
  href: string;
  external?: boolean;
};

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

const quickLinks: FooterLink[] = [
  { label: "Explore Colleges", href: "/colleges" },
  { label: "Rank Predictor", href: "/rank-predictor" },
  { label: "Mock Exams", href: "/mock-exam" },
  { label: "Results", href: "/results" }
];

const helpLinks: FooterLink[] = [
  { label: "Blog", href: "/blog" },
  { label: "Career Guide", href: "/career" },
  { label: "Appointments", href: "/appointments" },
  { label: "AI Assistant", href: "/chatbot" }
];

const defaultSettings: SiteSettings = {
  brandTagline: "College search, applications, exam practice, and counseling guidance through one cleaner student-first experience.",
  connectText: "Official social channels for notices, videos, updates, and student support.",
  socialLinks: [
    { label: "WhatsApp", href: "https://wa.me/919876543210", icon: "MessageCircle" },
    { label: "Telegram", href: "https://t.me/eplatform_updates", icon: "Send" },
    { label: "Instagram", href: "https://www.instagram.com/eplatform.india", icon: "Instagram" },
    { label: "Facebook", href: "https://www.facebook.com/eplatform.india", icon: "Facebook" },
    { label: "YouTube", href: "https://www.youtube.com/@eplatformindia", icon: "Youtube" }
  ]
};

const iconMap = {
  MessageCircle,
  Send,
  Instagram,
  Facebook,
  Youtube
};

function FooterLinkItem({ item }: { item: FooterLink }) {
  if (item.external) {
    return <a href={item.href} target="_blank" rel="noreferrer" className="text-sm text-muted-foreground hover:text-foreground">{item.label}</a>;
  }

  return <Link to={item.href} className="text-sm text-muted-foreground hover:text-foreground">{item.label}</Link>;
}

export function SiteFooter() {
  const [settings, setSettings] = useState<SiteSettings>(defaultSettings);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await apiGet<{ success: boolean; item: SiteSettings }>("/admin-content/site-settings");
        setSettings(response.item);
      } catch {
        setSettings(defaultSettings);
      }
    };

    void load();
  }, []);

  const socialLinks = useMemo(() => settings.socialLinks.length ? settings.socialLinks : defaultSettings.socialLinks, [settings.socialLinks]);

  return (
    <footer className="mt-14 rounded-lg border border-border bg-card/55">
      <div className="mx-auto max-w-7xl px-5 py-8 lg:px-8 lg:py-10">
        <div className="grid gap-8 lg:grid-cols-[1.3fr_0.8fr_0.8fr_1fr]">
          <div>
            <p className="font-display text-xl font-semibold text-foreground">E-platform</p>
            <p className="mt-3 max-w-md text-sm leading-6 text-muted-foreground">{settings.brandTagline}</p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Explore</p>
            <div className="mt-4 space-y-2.5">
              {quickLinks.map((item) => <FooterLinkItem key={item.label} item={item} />)}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Support</p>
            <div className="mt-4 space-y-2.5">
              {helpLinks.map((item) => <FooterLinkItem key={item.label} item={item} />)}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Connect</p>
            <p className="mt-4 text-sm leading-6 text-muted-foreground">{settings.connectText}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {socialLinks.map((item) => {
                const Icon = iconMap[item.icon];
                return (
                  <a key={item.label} href={item.href} target="_blank" rel="noreferrer" aria-label={item.label} className="rounded-lg border border-border bg-background/60 px-3 py-2 text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary">
                    <Icon className="h-4 w-4" />
                  </a>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-2 border-t border-border pt-5 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
          <p>2026 E-platform. Built for practical admissions work.</p>
          <p>Dark, structured, and simple enough to scan quickly.</p>
        </div>
      </div>
    </footer>
  );
}
