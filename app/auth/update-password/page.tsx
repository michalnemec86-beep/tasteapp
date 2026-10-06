import { UpdatePasswordForm } from "@/components/update-password-form";
import { createClient } from "@/lib/supabase/server";

export default async function Page({ searchParams }: {
  searchParams: Promise<{ first?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const params = await searchParams;
  // Keep the initial flow after a reload, even if its previous response was lost.
  // The Edge Function authorizes using live Auth metadata, never this URL flag.
  const initialPasswordRequired = user?.app_metadata?.must_change_password === true || params.first === "1";
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <UpdatePasswordForm initialPasswordRequired={initialPasswordRequired} accountEmail={user?.email} />
      </div>
    </div>
  );
}
