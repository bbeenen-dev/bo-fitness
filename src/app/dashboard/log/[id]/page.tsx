export default async function LogDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <div className="p-6">Workout log: {id}</div>
}