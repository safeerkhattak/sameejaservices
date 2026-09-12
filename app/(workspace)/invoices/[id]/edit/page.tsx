import { notFound, redirect } from "next/navigation";
import { InvoiceForm, type InvoiceFormValues } from "@/components/invoice-form";
import { PageHeading } from "@/components/page-heading";
import { getCurrentMember } from "@/lib/authz";
import { getInvoice, isDemoMode } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function EditInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [member, invoice] = await Promise.all([getCurrentMember("/invoices/" + id + "/edit"), getInvoice(id)]);
  if (!invoice) notFound();
  if (member.role !== "owner") redirect("/invoices/" + id);
  const initialValues: InvoiceFormValues = {
    invoiceNumber: invoice.invoice_number,
    customerName: invoice.customer_name,
    customerCity: invoice.customer_city,
    supplierNumber: invoice.supplier_number,
    storeNumber: invoice.store_number,
    storeName: invoice.store_name,
    invoiceDate: invoice.invoice_date,
    poNumber: invoice.po_number,
    goodsReceivingNumber: invoice.goods_receiving_number,
    notes: invoice.notes,
    items: [...(invoice.invoice_items ?? [])].sort((a, b) => a.position - b.position).map((item) => ({
      mgmCode: item.mgm_code,
      subsysCode: item.subsys_code,
      articleName: item.article_name,
      unit: item.unit,
      quantity: String(item.quantity_millis / 1000),
      rate: String(item.rate_paisa / 100),
    })),
  };
  return <div className="mx-auto w-full max-w-[1480px] px-5 py-7 sm:px-8 lg:px-10 lg:py-9"><PageHeading eyebrow="Owner review" title={"Edit invoice " + invoice.invoice_number} description="Correct the draft or issued invoice while preserving a record of the change." /><InvoiceForm mode="edit" invoiceId={id} initialValues={initialValues} demoMode={isDemoMode()} /></div>;
}
