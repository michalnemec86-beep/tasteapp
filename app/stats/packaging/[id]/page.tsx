import { redirect } from "next/navigation";

import { isPackaging } from "@/lib/packaging";

type PackagingRedirectPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function PackagingRedirectPage({
  params,
}: PackagingRedirectPageProps) {
  const { id } = await params;

  if (!isPackaging(id)) {
    redirect("/stats");
  }

  redirect(
    `/stats?packaging=${encodeURIComponent(id)}`
  );
}
