import { getDb } from "@/db";
import { expenses } from "@/db/schema";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const amount = Math.max(0, Math.round(Number(body.amount)));
    if (!body.title?.trim() || !amount) return Response.json({ error: "Expense name and amount are required." }, { status: 400 });
    const [expense] = await getDb().insert(expenses).values({
      title: body.title.trim(), amount,
      expenseDate: body.expenseDate || new Date().toISOString().slice(0, 10),
      createdAt: new Date().toISOString(),
    }).returning();
    return Response.json({ expense }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Could not save expense" }, { status: 500 });
  }
}
