import type { Metadata } from "next";
import { CoolorsPaletteGenerator } from "@/components/generator/CoolorsPaletteGenerator";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";

export const metadata: Metadata = {
  title: "Palette generator — Figmanity Color Palettes",
  description:
    "Full-screen five-color palette. Press spacebar to generate harmonious palettes.",
};

export default function GeneratorPage() {
  return (
    <div className="flex min-h-screen flex-col bg-black text-zinc-100">
      <div className="grain" aria-hidden />
      <SiteHeader />
      <main className="flex min-h-0 flex-1 flex-col pt-[calc(3.5rem+env(safe-area-inset-top,0px))] sm:pt-16">
        <CoolorsPaletteGenerator className="flex min-h-0 flex-1 flex-col" />
      </main>
      <SiteFooter />
    </div>
  );
}
