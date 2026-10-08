import { requireUser } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const { supabase, userId } = await requireUser();
  if (!userId) return Response.json({ error: "Please sign in again." }, { status: 401 });

  const form = await request.formData();
  const file = form.get("photo");
  if (!(file instanceof File)) {
    return Response.json({ error: "Choose a photo." }, { status: 400 });
  }
  if (!file.type.startsWith("image/")) {
    return Response.json({ error: "Only image files are allowed." }, { status: 400 });
  }
  if (file.size > 8 * 1024 * 1024) {
    return Response.json({ error: "Photo must be under 8 MB." }, { status: 400 });
  }

  const extension = file.name.split(".").pop()?.replace(/[^a-z0-9]/gi, "").slice(0, 5) || "jpg";
  const key = `${userId}/${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage.from("order-photos").upload(key, file, {
    contentType: file.type,
    upsert: false,
  });
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ key });
}
