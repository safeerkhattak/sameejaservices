import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local" });
const databaseUrl = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is not configured.");

const sql = postgres(databaseUrl, { max: 1, prepare: false, ssl: "require" });

try {
  const [checks] = await sql`
    select
      (select count(*)::int from invoices i left join customers c on c.id = i.customer_id where c.id is null) as orphaned_invoices,
      (select count(*)::int from payments p left join customers c on c.id = p.customer_id where c.id is null) as orphaned_payments,
      (select count(*)::int from payment_allocations pa join payments p on p.id = pa.payment_id join invoices i on i.id = pa.invoice_id where p.customer_id <> i.customer_id) as cross_customer_allocations,
      (select count(*)::int from (
        select p.id from payments p left join payment_allocations pa on pa.payment_id = p.id
        group by p.id, p.amount_paisa having coalesce(sum(pa.amount_paisa), 0) <> p.amount_paisa
      ) mismatched) as payment_total_mismatches,
      (select count(*)::int from (
        select i.id from invoices i left join payment_allocations pa on pa.invoice_id = i.id
        group by i.id, i.total_paisa having coalesce(sum(pa.amount_paisa), 0) > i.total_paisa
      ) overpaid) as overpaid_invoices,
      (select count(*)::int from (
        select i.id from invoices i left join invoice_items item on item.invoice_id = i.id
        group by i.id, i.total_paisa having coalesce(sum(item.total_paisa), 0) <> i.total_paisa
      ) mismatched) as invoice_total_mismatches
  `;

  const failures = Object.entries(checks).filter(([, value]) => Number(value) !== 0);
  if (failures.length) {
    throw new Error(`Data integrity check failed: ${failures.map(([name, count]) => `${name}=${count}`).join(", ")}`);
  }

  console.log("Data integrity check passed: customer links, allocations, payments, and invoice totals are consistent.");
} finally {
  await sql.end();
}
