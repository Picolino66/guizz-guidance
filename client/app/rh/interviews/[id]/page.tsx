import { RhInterviewDetailPageClient } from "../../../../components/rh/rh-interview-detail-page-client"

export default async function RhInterviewDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  return <RhInterviewDetailPageClient id={id} />
}
