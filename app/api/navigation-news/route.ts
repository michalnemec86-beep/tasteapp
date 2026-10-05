import { getNavigationNews } from "@/app/navigation-news/actions";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store" };

// Background reads do not enter React's sequential Server Action queue. This
// endpoint never acknowledges a section; visits still use the validated action.
export async function GET() {
  try {
    const news = await getNavigationNews();
    if (!news) return Response.json({ error: "Unauthorized" }, { status: 401, headers });
    return Response.json(news, { headers });
  } catch {
    return Response.json({ error: "Novinky se nepodařilo načíst." }, { status: 503, headers });
  }
}
