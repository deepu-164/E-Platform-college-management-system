import { useEffect, useState } from "react";
import { ArrowLeft, Calendar, User } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { apiGet, type ApiItemResponse } from "@/lib/api";

type BlogPost = {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  externalUrl?: string | null;
  author: string;
  category: string;
  readTime: string;
  publishedAt: string;
};

export default function BlogDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!id) return;

      try {
        const response = await apiGet<ApiItemResponse<BlogPost>>(`/blog-posts/${id}`);
        if (response.item.externalUrl) {
          window.location.href = response.item.externalUrl;
          return;
        }
        setPost(response.item);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [id]);

  if (loading) {
    return (
      <DashboardLayout>
        <p className="text-muted-foreground">Loading article...</p>
      </DashboardLayout>
    );
  }

  if (!post) {
    return (
      <DashboardLayout>
        <div className="space-y-4">
          <p className="text-muted-foreground">Blog post not found.</p>
          <button onClick={() => navigate("/blog")} className="text-sm text-primary hover:underline">Back to Blog</button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <Link to="/blog" className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to Blog
      </Link>

      <article className="mx-auto max-w-4xl rounded-2xl border border-border bg-card p-6 lg:p-10">
        <span className="inline-flex rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">{post.category}</span>
        <h1 className="mt-4 font-display text-3xl font-bold text-foreground">{post.title}</h1>
        <p className="mt-4 text-lg leading-8 text-muted-foreground">{post.excerpt}</p>

        <div className="mt-6 flex flex-wrap gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1"><User className="h-4 w-4" /> {post.author}</span>
          <span className="flex items-center gap-1"><Calendar className="h-4 w-4" /> {new Date(post.publishedAt).toLocaleDateString()}</span>
          <span>{post.readTime} read</span>
        </div>

        <div className="mt-8 whitespace-pre-line text-base leading-8 text-foreground">
          {post.content}
        </div>
      </article>
    </DashboardLayout>
  );
}
