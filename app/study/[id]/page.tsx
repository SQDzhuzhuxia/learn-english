import { MaterialStudyClient } from "@/components/study/material-study-client";

export default async function StudyMaterialPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <MaterialStudyClient materialId={id} />;
}
