import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Calendar, User } from "lucide-react";
import { apiGet, type ApiListResponse } from "@/lib/api";

type BlogPost = {
  id: string;
  title: string;
  excerpt: string;
  externalUrl?: string | null;
  author: string;
  category: string;
  readTime: string;
  publishedAt: string;
};

const categoryColors: Record<string, string> = {
  Rankings: "bg-primary/10 text-primary",
  "Exam Prep": "bg-warning/10 text-warning",
  Career: "bg-accent/10 text-accent",
  Education: "bg-info/10 text-info",
  Finance: "bg-success/10 text-success",
  Technology: "bg-primary/10 text-primary"
};

export default function Blog() {
  const [posts, setPosts] = useState<BlogPost[]>([]);

  useEffect(() => {
    const load = async () => {
      const data = await apiGet<ApiListResponse<BlogPost>>("/blog-posts", { limit: 50 });
      setPosts(data.items);
    };

    void load();
  }, []);

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="font-display text-2xl font-bold text-foreground">Blog and Insights</h1>
        <p className="text-muted-foreground mt-1">Expert advice, guides, and latest updates in education</p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {posts.map((post, index) => (
          <a key={post.id} href={post.externalUrl || `/blog/${post.id}`} target={post.externalUrl ? "_blank" : undefined} rel={post.externalUrl ? "noreferrer" : undefined}>
            <article className="bg-card rounded-xl border border-border overflow-hidden hover:shadow-card-hover transition-all group cursor-pointer">
              <div className="h-40 bg-secondary flex items-center justify-center">
                <span className="text-4xl opacity-30">{["IN", "AI", "ED", "UP", "KC", "CA"][index % 6]}</span>
              </div>
              <div className="p-5">
                <div className="flex items-center gap-2 mb-3">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${categoryColors[post.category] || "bg-muted text-muted-foreground"}`}>
                    {post.category}
                  </span>
                  <span className="text-xs text-muted-foreground">{post.readTime} read</span>
                </div>
                <h3 className="font-display font-semibold text-foreground group-hover:text-primary transition-colors leading-snug">{post.title}</h3>
                <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{post.excerpt}</p>
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><User className="h-3 w-3" /> {post.author}</span>
                    <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {new Date(post.publishedAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            </article>
          </a>
        ))}
      </div>
    </DashboardLayout>
  );
}
