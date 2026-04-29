import { RhTechInterviewDetailPageClient } from "../../../../../components/rh/rh-tech-interview-detail-page-client"

export default async function RhTechInterviewDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  return <RhTechInterviewDetailPageClient id={id} />
}
