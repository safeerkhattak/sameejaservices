import { getCustomers, getPaymentsForExport } from "@/lib/data";
import { requireApiMember } from "@/lib/authz";
import { filterSummary, parsePaymentRegisterFilters } from "@/lib/register-filters";
import { paymentPdf, paymentWorkbook } from "@/lib/register-export";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await requireApiMember({ owner: true });
    const url = new URL(request.url);
    const format = url.searchParams.get("format");
    if (format !== "xlsx" && format !== "pdf") return Response.json({ error: "Choose PDF or Excel format." }, { status: 400 });
    const filters = parsePaymentRegisterFilters(Object.fromEntries(url.searchParams.entries()));
    const [records, customers] = await Promise.all([getPaymentsForExport(filters), getCustomers()]);
    const customerName = customers.find((customer) => customer.id === filters.customerId)?.name ?? "";
    const description = filterSummary(filters, customerName);
    const bytes = format === "xlsx" ? await paymentWorkbook(records, description) : await paymentPdf(records, description);
    return downloadResponse(bytes, `sameeja-payments-${dateStamp()}.${format}`, format);
  } catch (error) {
    return exportErrorResponse(error);
  }
}

function downloadResponse(bytes: Uint8Array, filename: string, format: "xlsx" | "pdf") {
  return new Response(Uint8Array.from(bytes).buffer, { headers: {
    "Content-Type": format === "xlsx" ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" : "application/pdf",
    "Content-Disposition": `attachment; filename="${filename}"`,
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
  } });
}

function exportErrorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "The payment export could not be generated.";
  if (message === "AUTH_REQUIRED") return Response.json({ error: "Sign in to export payments." }, { status: 401 });
  if (message === "OWNER_REQUIRED") return Response.json({ error: "Only the owner can export payments." }, { status: 403 });
  return Response.json({ error: "The payment export could not be generated. Please try again." }, { status: 500 });
}

function dateStamp() { return new Date().toISOString().slice(0, 10); }
