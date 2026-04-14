"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";

interface EaSearchItem {
  ea_name: string;
  ea_user_id: number;
  school: string;
}

interface EaSearchProps {
  eas: EaSearchItem[];
}

export function EaSearch({ eas }: EaSearchProps) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return eas;
    return eas.filter(
      (ea) =>
        ea.ea_name.toLowerCase().includes(q) ||
        ea.school.toLowerCase().includes(q),
    );
  }, [query, eas]);

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search
          className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
          aria-hidden="true"
        />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by EA name or school…"
          className="w-full rounded-md border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          autoFocus
        />
      </div>

      <p className="text-xs text-slate-500">
        {filtered.length}{" "}
        {filtered.length === 1 ? "EA matches" : "EAs match"} your search
      </p>

      <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
        {filtered.length === 0 ? (
          <li className="px-4 py-6 text-center text-sm text-slate-400">
            No EAs match &ldquo;{query}&rdquo;
          </li>
        ) : (
          filtered.map((ea) => (
            // Composite key: Django's ea_performance view groups by
            // ea_name (TeampactSession.user_name), so the same ea_user_id
            // can legitimately appear under different display names (e.g.
            // an EA's name was changed in TeamPact mid-year and both
            // variants show up in historical session rows). Combining
            // both fields gives a stable unique key.
            <li key={`${ea.ea_user_id}-${ea.ea_name}`}>
              <Link
                href={`/pm/ea-mobile-view/${ea.ea_user_id}`}
                className="flex items-center justify-between gap-3 px-4 py-3 text-sm hover:bg-slate-50"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-slate-900">
                    {ea.ea_name}
                  </p>
                  <p className="truncate text-xs text-slate-500">
                    {ea.school}
                  </p>
                </div>
                <span className="shrink-0 text-xs text-slate-400">
                  View →
                </span>
              </Link>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
