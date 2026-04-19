import type { Metadata } from "next";
import { LogoPreviewTool } from "@/components/logo-preview/LogoPreviewTool";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";

export const metadata: Metadata = {
  title: "Logo lab — Figmanity Color Palettes",
  description:
    "Upload PNG or SVG logos to extract colours, analyse tone, preview on smart backgrounds, and export PNG previews plus a ZIP of every variation.",
};

export default function LogoPreviewPage() {
  return (
    <div className="flex min-h-screen flex-col bg-black text-zinc-100">
      <SiteHeader />
      <main className="flex min-h-0 flex-1 flex-col pt-[calc(3.5rem+env(safe-area-inset-top,0px))] sm:pt-16">
        <LogoPreviewTool />
      </main>
      <SiteFooter />
    </div>
  );
}
