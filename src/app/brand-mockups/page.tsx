import type { Metadata } from "next";
import { BrandMockupsPage } from "@/components/brand/BrandMockupsPage";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";

export const metadata: Metadata = {
  title: "Brand mockups — Figmanity Color Palettes",
  description:
    "Upload your logo and preview it on billboards, cards, devices, and merch with colours from your image or a random palette.",
};

export default function BrandMockupsRoute() {
  return (
    <div className="flex min-h-screen flex-col bg-black text-zinc-100">
      <SiteHeader />
      <main className="flex min-h-0 flex-1 flex-col pt-[calc(3.5rem+env(safe-area-inset-top,0px))] sm:pt-16">
        <BrandMockupsPage />
      </main>
      <SiteFooter />
    </div>
  );
}
