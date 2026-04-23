import { redirect } from "next/navigation";

interface PageProps {
  params: Promise<{ slug: string; designId: string }>;
}

export default async function DesignDetailPage({ params }: PageProps) {
  const { designId } = await params;
  redirect(`/canvas?view=${designId}`);
}
