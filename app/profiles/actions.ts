"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export async function updateOwnRealName(
  formData: FormData
) {
  const supabase =
    await createClient();

  const {
    data: { user },
  } =
    await supabase.auth.getUser();

  if (!user) {
    throw new Error(
      "Pro úpravu profilu musíš být přihlášený."
    );
  }

  const rawValue =
    String(
      formData.get("real_name") ??
        ""
    ).trim();

  const realName =
    rawValue.length > 0
      ? rawValue
      : null;

  if (
    realName &&
    realName.length > 60
  ) {
    throw new Error(
      "Jméno může mít maximálně 60 znaků."
    );
  }

  const { error } =
    await supabase
      .from("profiles")
      .update({
        real_name: realName,
      })
      .eq(
        "id",
        user.id
      );

  if (error) {
    throw new Error(
      error.message
    );
  }

  revalidatePath("/");
  revalidatePath("/profiles");
  revalidatePath(
    `/profiles/${user.id}`
  );
}
