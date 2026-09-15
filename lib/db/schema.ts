import { sql } from "drizzle-orm";
import { bigint, boolean, check, date, index, integer, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

export const appUsers = pgTable("app_users", {
  id: uuid("id").primaryKey(),
  email: text("email").notNull(),
  displayName: text("display_name").notNull(),
  role: text("role").notNull().default("staff"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("app_users_email_key").on(table.email),
  uniqueIndex("app_users_single_owner_key").on(table.role).where(sql`${table.role} = 'owner'`),
  check("app_users_role_check", sql`${table.role} in ('owner', 'staff')`),
]);

export const products = pgTable("products", {
  id: uuid("id").primaryKey().defaultRandom(),
  mgmCode: text("mgm_code").notNull(),
  subsysCode: text("subsys_code").notNull(),
  articleName: text("article_name").notNull(),
  unit: text("unit").notNull().default("Kg"),
  defaultRatePaisa: bigint("default_rate_paisa", { mode: "number" }),
  isActive: boolean("is_active").notNull().default(true),
  createdBy: uuid("created_by").notNull().references(() => appUsers.id),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("products_mgm_code_key").on(table.mgmCode),
  uniqueIndex("products_subsys_code_key").on(table.subsysCode),
  uniqueIndex("products_article_name_key").on(table.articleName),
  index("idx_products_active").on(table.isActive),
  check("products_default_rate_check", sql`${table.defaultRatePaisa} is null or ${table.defaultRatePaisa} >= 0`),
]);

export const customers = pgTable("customers", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  city: text("city").notNull().default(""),
  isActive: boolean("is_active").notNull().default(true),
  createdBy: uuid("created_by").notNull().references(() => appUsers.id),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
}, (table) => [
  index("idx_customers_name").on(table.name),
  index("idx_customers_active").on(table.isActive),
]);

export const invoices = pgTable("invoices", {
  id: uuid("id").primaryKey().defaultRandom(),
  invoiceNumber: text("invoice_number").notNull(),
  customerId: uuid("customer_id").notNull().references(() => customers.id),
  customerName: text("customer_name").notNull(),
  customerCity: text("customer_city").notNull().default(""),
  supplierNumber: text("supplier_number").notNull().default(""),
  storeNumber: text("store_number").notNull().default(""),
  storeName: text("store_name").notNull(),
  invoiceDate: date("invoice_date", { mode: "string" }).notNull(),
  poNumber: text("po_number").notNull().default(""),
  goodsReceivingNumber: text("goods_receiving_number").notNull().default(""),
  status: text("status").notNull().default("pending_review"),
  totalPaisa: bigint("total_paisa", { mode: "number" }).notNull(),
  notes: text("notes").notNull().default(""),
  createdBy: uuid("created_by").notNull().references(() => appUsers.id),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("invoices_invoice_number_key").on(table.invoiceNumber),
  index("idx_invoices_date").on(table.invoiceDate),
  index("idx_invoices_status").on(table.status),
  index("idx_invoices_store").on(table.storeName),
  index("idx_invoices_customer").on(table.customerId),
  check("invoices_status_check", sql`${table.status} in ('pending_review', 'issued', 'cancelled')`),
  check("invoices_total_check", sql`${table.totalPaisa} >= 0`),
]);

export const invoiceItems = pgTable("invoice_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  invoiceId: uuid("invoice_id").notNull().references(() => invoices.id, { onDelete: "cascade" }),
  productId: uuid("product_id").references(() => products.id),
  position: integer("position").notNull(),
  mgmCode: text("mgm_code").notNull().default(""),
  subsysCode: text("subsys_code").notNull().default(""),
  articleName: text("article_name").notNull(),
  unit: text("unit").notNull().default("Kg"),
  quantityMillis: bigint("quantity_millis", { mode: "number" }).notNull(),
  ratePaisa: bigint("rate_paisa", { mode: "number" }).notNull(),
  totalPaisa: bigint("total_paisa", { mode: "number" }).notNull(),
}, (table) => [
  index("idx_invoice_items_invoice").on(table.invoiceId),
  index("idx_invoice_items_product").on(table.productId),
  check("invoice_items_quantity_check", sql`${table.quantityMillis} > 0`),
  check("invoice_items_rate_check", sql`${table.ratePaisa} > 0`),
  check("invoice_items_total_check", sql`${table.totalPaisa} >= 0`),
]);

export const payments = pgTable("payments", {
  id: uuid("id").primaryKey().defaultRandom(),
  customerId: uuid("customer_id").notNull().references(() => customers.id),
  customerName: text("customer_name").notNull(),
  paymentDate: date("payment_date", { mode: "string" }).notNull(),
  amountPaisa: bigint("amount_paisa", { mode: "number" }).notNull(),
  referenceNumber: text("reference_number").notNull().default(""),
  notes: text("notes").notNull().default(""),
  createdBy: uuid("created_by").notNull().references(() => appUsers.id),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
}, (table) => [
  index("idx_payments_date").on(table.paymentDate),
  index("idx_payments_customer").on(table.customerId),
  check("payments_amount_check", sql`${table.amountPaisa} > 0`),
]);

export const paymentAllocations = pgTable("payment_allocations", {
  id: uuid("id").primaryKey().defaultRandom(),
  paymentId: uuid("payment_id").notNull().references(() => payments.id, { onDelete: "cascade" }),
  invoiceId: uuid("invoice_id").notNull().references(() => invoices.id),
  amountPaisa: bigint("amount_paisa", { mode: "number" }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("payment_allocations_payment_invoice_key").on(table.paymentId, table.invoiceId),
  index("idx_allocations_invoice").on(table.invoiceId),
  check("payment_allocations_amount_check", sql`${table.amountPaisa} > 0`),
]);

export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  actorId: uuid("actor_id").notNull().references(() => appUsers.id),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  details: jsonb("details").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
}, (table) => [index("idx_audit_entity").on(table.entityType, table.entityId)]);
