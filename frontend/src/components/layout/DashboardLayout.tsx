import { type ReactNode } from "react";

import { AppSidebar } from "./AppSidebar";
import { BackButton } from "./BackButton";
import { SiteFooter } from "./SiteFooter";

export function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppSidebar />
      <main className="ml-16 min-h-screen lg:ml-64 transition-all duration-300">
        <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-5 py-6 lg:px-8 lg:py-8">
          <div className="mb-5">
            <BackButton />
          </div>
          <div className="flex-1 space-y-8">{children}</div>
          <SiteFooter />
        </div>
      </main>
    </div>
  );
}
