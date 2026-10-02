import { notFound, redirect } from "next/navigation";
import { styleHref } from "@/lib/entity-navigation";
export default async function StyleRedirect({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  if (!Number.isSafeInteger(id) || id < 1) notFound();
  redirect(styleHref(id));
}
