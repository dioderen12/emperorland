"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { LATEST_ID } from "@/lib/changelog";

const LINKS: { href: string; label: string; news?: boolean }[] = [
  { href: "/packs", label: "Packs" },
  { href: "/inventory", label: "Bag" },
  { href: "/collection", label: "Dex" },
  { href: "/staking", label: "Dungeons" },
  { href: "/boss", label: "Raid" },
  { href: "/arena", label: "Arena" },
  { href: "/market", label: "Market" },
  { href: "/changelog", label: "News", news: true },
];

// Responsive nav: inline links on desktop, a hamburger dropdown on mobile.
// Folds in the News "unread" dot (localStorage, no backend).
export function NavLinks() {
  const [open, setOpen] = useState(false);
  const [unseen, setUnseen] = useState(false);
  useEffect(() => {
    try {
      setUnseen(localStorage.getItem("changelogSeen") !== LATEST_ID);
    } catch {
      /* ignore */
    }
  }, []);

  const Dot = () => <span className="absolute -top-1 -right-2.5 w-2 h-2 rounded-full bg-[var(--accent-3)] animate-pulse" />;

  return (
    <>
      {/* Desktop: inline links */}
      <nav className="hidden md:flex gap-3 lg:gap-4 text-base lg:text-lg uppercase tracking-wide text-slate-400">
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href} className="relative hover:text-[var(--accent-2)] transition">
            {l.label}
            {l.news && unseen && <Dot />}
          </Link>
        ))}
      </nav>

      {/* Mobile: hamburger */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="md:hidden relative text-2xl leading-none text-slate-200 px-1"
        aria-label="Menu"
        aria-expanded={open}
      >
        {open ? "✕" : "☰"}
        {!open && unseen && <Dot />}
      </button>

      {/* Mobile: dropdown panel */}
      {open && (
        <div className="md:hidden absolute left-0 right-0 top-full bg-[#0c0f1c] border-b-[3px] border-[var(--ink)] z-30 shadow-xl">
          <nav className="flex flex-col">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="relative px-5 py-3 text-lg uppercase tracking-wide text-slate-200 hover:bg-white/5 border-b border-white/5"
              >
                {l.label}
                {l.news && unseen && <span className="ml-2 inline-block w-2 h-2 rounded-full bg-[var(--accent-3)] align-middle" />}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </>
  );
}
