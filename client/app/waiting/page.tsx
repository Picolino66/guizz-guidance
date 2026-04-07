import { Suspense } from "react";
import { WaitingPageClient } from "../../components/waiting-page-client";

export default function WaitingPage() {
  return (
    <Suspense fallback={<div />}>
      <WaitingPageClient />
    </Suspense>
  );
}
