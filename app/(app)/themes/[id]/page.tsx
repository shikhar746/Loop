import type { Metadata } from "next";
import { ThemeDetailView } from "@/components/themes/theme-detail-view";

export const metadata: Metadata = { title: "Theme" };

export default function ThemePage({ params }: { params: { id: string } }) {
  return <ThemeDetailView id={params.id} />;
}
