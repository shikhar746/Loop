import type { Metadata } from "next";
import { Suspense } from "react";
import { TrendsView } from "@/components/themes/trends-view";
import TrendsLoading from "./loading";

export const metadata: Metadata = { title: "Trends" };

export default function TrendsPage() {
  return (
    <Suspense fallback={<TrendsLoading />}>
      <TrendsView />
    </Suspense>
  );
}
