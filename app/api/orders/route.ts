import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { expenses, orders } from "@/db/schema";

function money(value: unknown) {
  const amount = Number(value);
  return Number.isFinite(amount) ? Math.max(0, Math.round(amount)) : 0;
}

export async function GET() {
  try {
    const db = getDb();
    const [orderRows, expenseRows] = await Promise.all([
      db.select().from(orders).orderBy(desc(orders.createdAt)),
      db.select().from(expenses).orderBy(desc(expenses.expenseDate)),
    ]);
    return Response.json({ orders: orderRows, expenses: expenseRows });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Could not load records" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body.customerName?.trim() || !body.itemName?.trim() || money(body.sellingPrice) <= 0) {
      return Response.json({ error: "Customer, item and selling price are required." }, { status: 400 });
    }
    const now = new Date().toISOString();
    const wholesale = body.wholesalePrice === "" || body.wholesalePrice == null ? null : money(body.wholesalePrice);
    const [order] = await getDb().insert(orders).values({
      customerName: body.customerName.trim(), customerPhone: body.customerPhone?.trim() ?? "",
      itemName: body.itemName.trim(), category: body.category ?? "Jewelry", photoKey: body.photoKey || null,
      sellingPrice: money(body.sellingPrice), wholesalePrice: wholesale, extraCosts: money(body.extraCosts),
      amountPaid: money(body.amountPaid), paymentMethod: body.paymentMethod ?? "Cash",
      status: body.status ?? "New order", dueDate: body.dueDate ?? "", notes: body.notes?.trim() ?? "",
      createdAt: now, updatedAt: now,
    }).returning();
    return Response.json({ order }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Could not save order" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const id = Number(body.id);
    if (!Number.isInteger(id)) return Response.json({ error: "Invalid order" }, { status: 400 });
    const values: { status?: string; amountPaid?: number; wholesalePrice?: number | null; updatedAt: string } = { updatedAt: new Date().toISOString() };
    if (body.status) values.status = body.status;
    if (body.amountPaid != null) values.amountPaid = money(body.amountPaid);
    if (body.wholesalePrice !== undefined) values.wholesalePrice = body.wholesalePrice === "" ? null : money(body.wholesalePrice);
    const [order] = await getDb().update(orders).set(values).where(eq(orders.id, id)).returning();
    return Response.json({ order });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Could not update order" }, { status: 500 });
  }
}
