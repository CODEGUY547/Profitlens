import { env } from "cloudflare:workers";

export async function POST(request: Request) {
  const form = await request.formData();
  const file = form.get("photo");
  if (!(file instanceof File)) return Response.json({ error: "Choose a photo." }, { status: 400 });
  if (!file.type.startsWith("image/")) return Response.json({ error: "Only image files are allowed." }, { status: 400 });
  if (file.size > 8 * 1024 * 1024) return Response.json({ error: "Photo must be under 8 MB." }, { status: 400 });
  if (!env.BUCKET) return Response.json({ error: "Photo storage is unavailable." }, { status: 500 });
  const extension = file.name.split(".").pop()?.replace(/[^a-z0-9]/gi, "").slice(0, 5) || "jpg";
  const key = `orders/${crypto.randomUUID()}.${extension}`;
  await env.BUCKET.put(key, await file.arrayBuffer(), { httpMetadata: { contentType: file.type } });
  return Response.json({ key });
}
