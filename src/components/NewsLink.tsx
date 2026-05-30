"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { LATEST_ID } from "@/lib/changelog";

// Nav link with an unread dot — lit until the player opens the News page (state
// kept in localStorage, so it's per-device and needs no backend).
export function NewsLink() {
  const [unseen, setUnseen] = useState(false);
  useEffect(() => {
    try {
      setUnseen(localStorage.getItem("changelogSeen") !== LATEST_ID);
    } catch {
      /* ignore */
    }
  }, []);
  return (
    <Link href="/changelog" className="relative hover:text-[var(--accent)] transition">
      News
      {unseen && <span className="absolute -top-1 -right-2.5 w-2 h-2 rounded-full bg-[var(--accent-3)] animate-pulse" />}
    </Link>
  );
}
