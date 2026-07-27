"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const NAV_LINKS = [
  { href: "/plagiarism", label: "Plagiarism" },
  { href: "/ai-detector", label: "AI Detector" },
  { href: "/search", label: "Search" },
  { href: "/citations", label: "Citations" },
] as const;

export function NavBar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg/80 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-screen-xl items-center justify-between px-6">
        <Link
          href="/"
          className="text-h3 font-semibold tracking-tight text-fg hover:opacity-80 transition-opacity"
        >
          Origo<span className="text-accent">Text</span>
        </Link>
        <nav className="flex items-center gap-6" aria-label="Primary">
          {NAV_LINKS.map((link) => {
            const active = pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "text-body-sm font-medium transition-colors",
                  active
                    ? "text-accent"
                    : "text-fg-muted hover:text-fg",
                )}
                aria-current={active ? "page" : undefined}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
