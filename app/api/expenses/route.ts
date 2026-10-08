import { requireUser } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const { supabase, userId } = await requireUser();
    if (!userId) return Response.json({ error: "Please sign in again." }, { status: 401 });

    const body = await request.json();
    const amount = Math.max(0, Math.round(Number(body.amount)));
    if (!body.title?.trim() || !amount) {
      return Response.json(
        { error: "Expense name and amount are required." },
        { status: 400 },
      );
    }

    const { data, error } = await supabase
      .from("expenses")
      .insert({
        user_id: userId,
        title: body.title.trim(),
        amount,
        expense_date: body.expenseDate || new Date().toISOString().slice(0, 10),
      })
      .select()
      .single();
    if (error) throw error;

    return Response.json(
      {
        expense: {
          id: data.id,
          title: data.title,
          amount: Number(data.amount),
          expenseDate: data.expense_date,
          createdAt: data.created_at,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Could not save expense" },
      { status: 500 },
    );
  }
}
