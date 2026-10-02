import { notFound, redirect } from "next/navigation";
import { getStyleHref } from "@/lib/entity-navigation";

export default async function StyleRedirect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[1-9]\d*$/.test(id)) notFound();
  redirect(getStyleHref(id));
}
