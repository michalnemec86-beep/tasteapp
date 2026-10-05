import { cache } from "react";
import { createClient } from "./server";

// React resets this memoization for every server render. No account, session or
// Supabase client is shared between requests. Layout/home/profile verify once.
export const getCurrentUser = cache(async () => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
});
