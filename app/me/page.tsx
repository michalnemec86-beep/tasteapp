import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function MyProfilePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  redirect(`/profiles/${user.id}`);
}