import { Suspense } from "react";
import { RankingPageClient } from "../../components/ranking-page-client";

export default function RankingPage() {
  return (
    <Suspense fallback={<div />}>
      <RankingPageClient />
    </Suspense>
  );
}
