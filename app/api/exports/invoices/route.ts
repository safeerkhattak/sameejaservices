import { getCustomers, getInvoicesForExport } from "@/lib/data";
import { requireApiMember } from "@/lib/authz";
import { filterSummary, parseInvoiceRegisterFilters } from "@/lib/register-filters";
import { invoicePdf, invoiceWorkbook } from "@/lib/register-export";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await requireApiMember();
    const url = new URL(request.url);
    const format = url.searchParams.get("format");
    if (format !== "xlsx" && format !== "pdf") return Response.json({ error: "Choose PDF or Excel format." }, { status: 400 });
    const filters = parseInvoiceRegisterFilters(Object.fromEntries(url.searchParams.entries()));
    const [records, customers] = await Promise.all([getInvoicesForExport(filters), getCustomers()]);
    const customerName = customers.find((customer) => customer.id === filters.customerId)?.name ?? "";
    const description = filterSummary(filters, customerName);
    const bytes = format === "xlsx" ? await invoiceWorkbook(records, description) : await invoicePdf(records, description);
    return downloadResponse(bytes, `sameeja-invoices-${dateStamp()}.${format}`, format);
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
  const message = error instanceof Error ? error.message : "The invoice export could not be generated.";
  if (message === "AUTH_REQUIRED") return Response.json({ error: "Sign in to export invoices." }, { status: 401 });
  return Response.json({ error: "The invoice export could not be generated. Please try again." }, { status: 500 });
}

function dateStamp() { return new Date().toISOString().slice(0, 10); }
