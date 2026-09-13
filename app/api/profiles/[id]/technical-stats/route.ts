import { NextResponse } from "next/server";

import {
  createClient,
} from "@/lib/supabase/server";

export async function GET(
  _request: Request,
  {
    params,
  }: {
    params: Promise<{
      id: string;
    }>;
  }
) {
  const { id } =
    await params;

  const supabase =
    await createClient();

  const {
    data: { user },
  } =
    await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      {
        error:
          "Unauthorized",
      },
      {
        status: 401,
      }
    );
  }

  const {
    data,
    error,
  } =
    await supabase.rpc(
      "get_profile_numeric_stats",
      {
        target_user_id:
          id,
      }
    );

  if (error) {
    return NextResponse.json(
      {
        error:
          error.message,
      },
      {
        status: 500,
      }
    );
  }

  if (!data) {
    return NextResponse.json(
      {
        error:
          "Profile technical stats not found",
      },
      {
        status: 404,
      }
    );
  }

  return NextResponse.json(
    data,
    {
      headers: {
        "Cache-Control":
          "private, no-store",
      },
    }
  );
}
