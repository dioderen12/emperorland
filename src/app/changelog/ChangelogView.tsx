"use client";

import { useEffect } from "react";
import { CHANGELOG, LATEST_ID, type ChangeTag } from "@/lib/changelog";

const TAG: Record<ChangeTag, { label: string; cls: string }> = {
  new: { label: "NEW", cls: "bg-emerald-500 text-emerald-950" },
  buff: { label: "BUFF", cls: "bg-sky-500 text-sky-950" },
  nerf: { label: "NERF", cls: "bg-rose-500 text-rose-950" },
  fix: { label: "FIX", cls: "bg-amber-500 text-amber-950" },
};

export function ChangelogView() {
  // Mark the latest update as read so the nav dot clears.
  useEffect(() => {
    try {
      localStorage.setItem("changelogSeen", LATEST_ID);
    } catch {
      /* ignore */
    }
  }, []);

  return (
    <div className="space-y-6">
      <section>
        <h1 className="font-display text-xl sm:text-2xl text-[var(--accent)]">📢 What&apos;s New</h1>
        <p className="text-slate-400 mt-2 text-lg">Updates from the dev — new features, buffs, nerfs &amp; fixes.</p>
      </section>

      <div className="space-y-4">
        {CHANGELOG.map((e) => (
          <section key={e.id} className="pixel-panel p-5">
            <div className="flex items-baseline justify-between flex-wrap gap-1">
              <h2 className="font-display text-sm text-white">{e.title}</h2>
              <span className="text-sm text-slate-500">{e.date}</span>
            </div>
            <ul className="mt-3 space-y-2">
              {e.items.map((it, i) => (
                <li key={i} className="flex items-start gap-2 text-lg leading-snug">
                  <span className={`shrink-0 mt-0.5 text-[9px] font-bold uppercase px-1.5 py-0.5 border-2 border-[var(--ink)] ${TAG[it.tag].cls}`}>
                    {TAG[it.tag].label}
                  </span>
                  <span className="text-slate-200">{it.text}</span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
