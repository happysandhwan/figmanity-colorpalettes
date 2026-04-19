"use client";

import { CategoryPaletteCard } from "@/components/landing/CategoryPaletteCard";
import {
  PALETTE_CATEGORIES,
  PALETTE_CATEGORY_COUNT,
} from "@/data/paletteCategories";
import Link from "next/link";
import { useCallback, useMemo, useState } from "react";

const PAGE_SIZE = 60;
const HOME_PREVIEW_COUNT = 9;

type Props = {
  onCopyHex: (hex: string) => void;
  onCopyPaletteLines: (hexes: string[]) => void;
  /** `preview` = first 9 on home, no search/load more. `full` = full index. */
  variant?: "full" | "preview";
};

export function CategoryExplorer({
  onCopyHex,
  onCopyPaletteLines,
  variant = "full",
}: Props) {
  const isPreview = variant === "preview";
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    if (isPreview) {
      return PALETTE_CATEGORIES.slice(0, HOME_PREVIEW_COUNT);
    }
    const q = query.trim().toLowerCase();
    if (!q) return PALETTE_CATEGORIES;
    return PALETTE_CATEGORIES.filter((c) => c.toLowerCase().includes(q));
  }, [query, isPreview]);

  const visible = useMemo(() => {
    if (isPreview) return filtered;
    return filtered.slice(0, page * PAGE_SIZE);
  }, [filtered, page, isPreview]);

  const hasMore = !isPreview && visible.length < filtered.length;

  const onSearch = useCallback((v: string) => {
    setQuery(v);
    setPage(1);
  }, []);

  return (
    <div className="flex flex-col gap-8">
      {!isPreview ? (
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0 max-w-xl flex-1">
            <label htmlFor="cat-search" className="sr-only">
              Search categories
            </label>
            <input
              id="cat-search"
              type="search"
              value={query}
              onChange={(e) => onSearch(e.target.value)}
              placeholder="Search categories…"
              className="hover-smooth h-12 w-full min-w-0 rounded-xl border border-white/10 bg-white/[0.04] px-4 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none ring-0 focus:border-violet-500/50 hover:border-white/18"
              autoComplete="off"
            />
            <p className="mt-2 text-xs leading-relaxed text-zinc-500 break-words">
              Showing {visible.length.toLocaleString()} of {filtered.length.toLocaleString()} match
              {filtered.length === 1 ? "" : "es"} · each card is a unique 5-color palette · total{" "}
              {PALETTE_CATEGORY_COUNT.toLocaleString()} categories
            </p>
          </div>
          {query ? (
            <button
              type="button"
              onClick={() => onSearch("")}
              className="hover-smooth h-11 w-full shrink-0 rounded-full border border-white/10 px-4 text-sm text-zinc-300 hover:border-white/25 hover:bg-white/[0.04] hover:text-zinc-100 sm:w-auto md:self-start"
            >
              Clear filters
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {visible.map((name) => (
          <CategoryPaletteCard
            key={name}
            name={name}
            onCopyHex={onCopyHex}
            onCopyPalette={onCopyPaletteLines}
          />
        ))}
      </div>

      {isPreview ? (
        <div className="flex flex-col items-center gap-3 border-t border-white/[0.06] pt-10">
          <p className="text-center text-sm text-zinc-500">
            Previewing {HOME_PREVIEW_COUNT} of {PALETTE_CATEGORY_COUNT.toLocaleString()} — search and
            load the rest in the gallery.
          </p>
          <Link
            href="/categories"
            className="hover-smooth inline-flex h-12 items-center justify-center rounded-full border border-violet-400/35 bg-violet-500/[0.12] px-10 text-sm font-semibold text-violet-100 shadow-[0_0_0_1px_rgba(139,92,246,0.08)] hover:border-violet-400/55 hover:bg-violet-500/20 hover:text-white active:scale-[0.98] sm:px-12"
          >
            View all categories
          </Link>
        </div>
      ) : null}

      {hasMore ? (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => setPage((p) => p + 1)}
            className="hover-smooth inline-flex h-11 items-center justify-center rounded-full border border-white/15 bg-white/[0.04] px-8 text-sm font-medium text-zinc-100 hover:border-violet-400/45 hover:bg-white/[0.07] active:scale-[0.98]"
          >
            Load more
          </button>
        </div>
      ) : null}

      {!filtered.length && (
        <p className="text-center text-sm text-zinc-500">No categories match “{query}”.</p>
      )}
    </div>
  );
}
