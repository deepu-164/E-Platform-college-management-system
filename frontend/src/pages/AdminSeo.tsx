import { useEffect, useState } from "react";
import { Globe } from "lucide-react";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { apiGet } from "@/lib/api";

type SeoSummary = {
  sitemapUrl: string;
  robotsUrl: string;
  pagesIndexed: { colleges: number; blogPosts: number; certifications: number };
  recommendations: string[];
};

export default function AdminSeo() {
  const [seoSummary, setSeoSummary] = useState<SeoSummary | null>(null);

  useEffect(() => {
    const load = async () => {
      const response = await apiGet<{ success: boolean; item: SeoSummary }>("/seo/summary");
      setSeoSummary(response.item);
    };

    void load();
  }, []);

  if (!seoSummary) {
    return <DashboardLayout><p className="text-muted-foreground">Loading SEO management...</p></DashboardLayout>;
  }

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="font-display text-2xl font-bold text-foreground">SEO Management</h1>
        <p className="mt-1 text-muted-foreground">Track indexed content, search visibility, and portal recommendations.</p>
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-5"><p className="text-sm text-muted-foreground">Indexed colleges</p><p className="mt-2 text-2xl font-semibold text-foreground">{seoSummary.pagesIndexed.colleges}</p></div>
        <div className="rounded-xl border border-border bg-card p-5"><p className="text-sm text-muted-foreground">Indexed blog posts</p><p className="mt-2 text-2xl font-semibold text-foreground">{seoSummary.pagesIndexed.blogPosts}</p></div>
        <div className="rounded-xl border border-border bg-card p-5"><p className="text-sm text-muted-foreground">Indexed certifications</p><p className="mt-2 text-2xl font-semibold text-foreground">{seoSummary.pagesIndexed.certifications}</p></div>
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <div className="mb-4 flex items-center gap-2"><Globe className="h-5 w-5 text-primary" /><h2 className="font-display text-lg font-semibold text-foreground">Search Visibility</h2></div>
        <p className="text-sm text-muted-foreground">Sitemap: {seoSummary.sitemapUrl}</p>
        <p className="mt-1 text-sm text-muted-foreground">Robots: {seoSummary.robotsUrl}</p>
        <div className="mt-4 space-y-2">
          {seoSummary.recommendations.map((item) => <div key={item} className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-sm text-muted-foreground">{item}</div>)}
        </div>
      </div>
    </DashboardLayout>
  );
}
