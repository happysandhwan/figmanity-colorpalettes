"use client";

import { generatePaletteForCategory } from "@/lib/categoryPalette";
import { memo, useMemo } from "react";

type Props = {
  name: string;
  onCopyHex: (hex: string) => void;
  onCopyPalette: (hexes: string[]) => void;
};

export const CategoryPaletteCard = memo(function CategoryPaletteCard({
  name,
  onCopyHex,
  onCopyPalette,
}: Props) {
  const swatches = useMemo(() => generatePaletteForCategory(name), [name]);

  return (
    <article className="hover-smooth group overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0c0c10] hover:border-violet-400/30 hover:shadow-[0_20px_50px_-36px_rgba(139,92,246,0.2)] hover:-translate-y-0.5">
      <div className="flex h-[7rem] overflow-hidden sm:h-36">
        {swatches.map((hex, idx) => (
          <button
            key={`${idx}-${hex}`}
            type="button"
            title={`Copy ${hex}`}
            onClick={() => onCopyHex(hex)}
            className="hover-swatch relative min-w-0 flex-1 group-hover:flex-[1.08] hover:flex-[1.15] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
            style={{ backgroundColor: hex }}
          >
            <span className="sr-only">Copy {hex}</span>
          </button>
        ))}
      </div>
      <div className="flex flex-col gap-3 px-3 py-5 sm:flex-row sm:items-start sm:justify-between sm:gap-2 sm:px-4 sm:py-6">
        <h3 className="min-w-0 flex-1 font-[family-name:var(--font-display)] text-sm font-semibold leading-snug text-zinc-100">
          {name}
        </h3>
        <button
          type="button"
          onClick={() => onCopyPalette(swatches)}
          className="hover-smooth w-full shrink-0 rounded-lg border border-white/10 bg-white/[0.04] px-2 py-2 text-[10px] font-medium uppercase tracking-wider text-zinc-400 hover:border-white/25 hover:bg-white/[0.07] hover:text-zinc-100 sm:w-auto sm:py-1"
        >
          Copy all
        </button>
      </div>
    </article>
  );
});
