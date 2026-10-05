import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/supabase/current-user";
import ProfilePage from "./profiles/[id]/page";

type HomeSearchParams = {
  view?: string | string[];
  sort?: string | string[];
  country?: string | string[];
  q?: string | string[];
  letter?: string | string[];
};

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<HomeSearchParams>;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth/login");
  }

  return (
    <ProfilePage
      params={Promise.resolve({
        id: user.id,
      })}
      searchParams={searchParams}
    />
  );
}
