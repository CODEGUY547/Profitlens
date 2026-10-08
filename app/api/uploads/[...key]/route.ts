import { requireUser } from "@/lib/supabase/server";

export async function GET(
  _request: Request,
  context: { params: Promise<{ key: string[] }> },
) {
  const { supabase, userId } = await requireUser();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const { key } = await context.params;
  const pathname = key.join("/");
  if (!pathname.startsWith(`${userId}/`)) return new Response("Forbidden", { status: 403 });

  const { data, error } = await supabase.storage.from("order-photos").download(pathname);
  if (error || !data) return new Response("Not found", { status: 404 });

  return new Response(await data.arrayBuffer(), {
    headers: {
      "content-type": data.type || "application/octet-stream",
      "cache-control": "private, max-age=3600",
    },
  });
}
