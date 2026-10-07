import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const orders = sqliteTable("orders", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  customerName: text("customer_name").notNull(),
  customerPhone: text("customer_phone").notNull().default(""),
  itemName: text("item_name").notNull(),
  category: text("category").notNull(),
  photoKey: text("photo_key"),
  sellingPrice: integer("selling_price").notNull(),
  wholesalePrice: integer("wholesale_price"),
  extraCosts: integer("extra_costs").notNull().default(0),
  amountPaid: integer("amount_paid").notNull().default(0),
  paymentMethod: text("payment_method").notNull().default("Cash"),
  status: text("status").notNull().default("New order"),
  dueDate: text("due_date").notNull().default(""),
  notes: text("notes").notNull().default(""),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const expenses = sqliteTable("expenses", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  amount: integer("amount").notNull(),
  expenseDate: text("expense_date").notNull(),
  createdAt: text("created_at").notNull(),
});
