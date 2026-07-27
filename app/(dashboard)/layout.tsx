import type { ReactNode } from "react";
import { NavBar } from "@/components/layout/NavBar";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-bg">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-accent focus:px-4 focus:py-2 focus:text-body-sm focus:font-medium focus:text-white"
      >
        Skip to content
      </a>
      <NavBar />
      <main id="main-content" className="mx-auto max-w-screen-xl px-6 py-8">
        {children}
      </main>
    </div>
  );
}
