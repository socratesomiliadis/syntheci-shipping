import { redirect } from "next/navigation";

export default async function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/workspace/tasks/${id}`);
}
