import { requireUser } from "@/lib/supabase/server";

type OrderRow = {
  id: number;
  customer_name: string;
  customer_phone: string;
  item_name: string;
  category: string;
  photo_key: string | null;
  selling_price: number;
  wholesale_price: number | null;
  extra_costs: number;
  amount_paid: number;
  payment_method: string;
  status: string;
  due_date: string;
  notes: string;
  created_at: string;
  updated_at: string;
};

type ExpenseRow = {
  id: number;
  title: string;
  amount: number;
  expense_date: string;
  created_at: string;
};

function money(value: unknown) {
  const amount = Number(value);
  return Number.isFinite(amount) ? Math.max(0, Math.round(amount)) : 0;
}

function orderFromRow(row: OrderRow) {
  return {
    id: row.id,
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    itemName: row.item_name,
    category: row.category,
    photoKey: row.photo_key,
    sellingPrice: Number(row.selling_price),
    wholesalePrice: row.wholesale_price == null ? null : Number(row.wholesale_price),
    extraCosts: Number(row.extra_costs),
    amountPaid: Number(row.amount_paid),
    paymentMethod: row.payment_method,
    status: row.status,
    dueDate: row.due_date,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function expenseFromRow(row: ExpenseRow) {
  return {
    id: row.id,
    title: row.title,
    amount: Number(row.amount),
    expenseDate: row.expense_date,
    createdAt: row.created_at,
  };
}

export async function GET() {
  try {
    const { supabase, userId } = await requireUser();
    if (!userId) return Response.json({ error: "Please sign in again." }, { status: 401 });

    const [ordersResult, expensesResult] = await Promise.all([
      supabase.from("orders").select("*").order("created_at", { ascending: false }),
      supabase.from("expenses").select("*").order("expense_date", { ascending: false }),
    ]);
    if (ordersResult.error) throw ordersResult.error;
    if (expensesResult.error) throw expensesResult.error;

    return Response.json({
      orders: (ordersResult.data as OrderRow[]).map(orderFromRow),
      expenses: (expensesResult.data as ExpenseRow[]).map(expenseFromRow),
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Could not load records" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const { supabase, userId } = await requireUser();
    if (!userId) return Response.json({ error: "Please sign in again." }, { status: 401 });

    const body = await request.json();
    if (!body.customerName?.trim() || !body.itemName?.trim() || money(body.sellingPrice) <= 0) {
      return Response.json(
        { error: "Customer, item and selling price are required." },
        { status: 400 },
      );
    }

    const wholesale =
      body.wholesalePrice === "" || body.wholesalePrice == null
        ? null
        : money(body.wholesalePrice);
    const { data, error } = await supabase
      .from("orders")
      .insert({
        user_id: userId,
        customer_name: body.customerName.trim(),
        customer_phone: body.customerPhone?.trim() ?? "",
        item_name: body.itemName.trim(),
        category: body.category ?? "Jewelry",
        photo_key: body.photoKey || null,
        selling_price: money(body.sellingPrice),
        wholesale_price: wholesale,
        extra_costs: money(body.extraCosts),
        amount_paid: money(body.amountPaid),
        payment_method: body.paymentMethod ?? "Cash",
        status: body.status ?? "New order",
        due_date: body.dueDate ?? "",
        notes: body.notes?.trim() ?? "",
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();
    if (error) throw error;
    return Response.json({ order: orderFromRow(data as OrderRow) }, { status: 201 });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Could not save order" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const { supabase, userId } = await requireUser();
    if (!userId) return Response.json({ error: "Please sign in again." }, { status: 401 });

    const body = await request.json();
    const id = Number(body.id);
    if (!Number.isInteger(id)) {
      return Response.json({ error: "Invalid order" }, { status: 400 });
    }

    const values: Record<string, string | number | null> = {
      updated_at: new Date().toISOString(),
    };
    if (body.status) values.status = body.status;
    if (body.amountPaid != null) values.amount_paid = money(body.amountPaid);
    if (body.wholesalePrice !== undefined) {
      values.wholesale_price = body.wholesalePrice === "" ? null : money(body.wholesalePrice);
    }

    const { data, error } = await supabase
      .from("orders")
      .update(values)
      .eq("id", id)
      .eq("user_id", userId)
      .select()
      .single();
    if (error) throw error;
    return Response.json({ order: orderFromRow(data as OrderRow) });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Could not update order" },
      { status: 500 },
    );
  }
}
