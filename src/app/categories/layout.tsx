import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Palette categories — Figmanity",
  description:
    "Browse every palette category: search, copy HEX swatches, or copy all five lines. Full index of category-named palettes.",
};

export default function CategoriesLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
