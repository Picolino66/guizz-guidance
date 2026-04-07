import { Suspense } from "react";
import { QuizPageClient } from "../../components/quiz-page-client";

export default function QuizPage() {
  return (
    <Suspense fallback={<div />}>
      <QuizPageClient />
    </Suspense>
  );
}
