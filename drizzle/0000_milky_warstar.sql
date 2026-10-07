CREATE TABLE `expenses` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`amount` integer NOT NULL,
	`expense_date` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`customer_name` text NOT NULL,
	`customer_phone` text DEFAULT '' NOT NULL,
	`item_name` text NOT NULL,
	`category` text NOT NULL,
	`photo_key` text,
	`selling_price` integer NOT NULL,
	`wholesale_price` integer,
	`extra_costs` integer DEFAULT 0 NOT NULL,
	`amount_paid` integer DEFAULT 0 NOT NULL,
	`payment_method` text DEFAULT 'Cash' NOT NULL,
	`status` text DEFAULT 'New order' NOT NULL,
	`due_date` text DEFAULT '' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
