import { PageHeading } from "@/components/page-heading";
import { PaymentForm } from "@/components/payment-form";
import { getOpenInvoices, isDemoMode, paidAmount } from "@/lib/data";
import { requireOwner } from "@/lib/authz";

export const dynamic = "force-dynamic";

export default async function NewPaymentPage() {
  const [, invoices] = await Promise.all([requireOwner("/payments/new"), getOpenInvoices()]);
  return (
    <div className="mx-auto w-full max-w-[1480px] px-5 py-7 sm:px-8 lg:px-10 lg:py-9">
      <PageHeading eyebrow="Owner action" title="Record a payment" description="Choose the invoices and allocation amounts yourself. The system will not apply payments automatically." />
      <PaymentForm
        demoMode={isDemoMode()}
        invoices={invoices.map((invoice) => ({
          id: invoice.id,
          invoiceNumber: invoice.invoice_number,
          storeName: invoice.store_name,
          invoiceDate: invoice.invoice_date,
          totalPaisa: invoice.total_paisa,
          paidPaisa: paidAmount(invoice),
          balancePaisa: Math.max(0, invoice.total_paisa - paidAmount(invoice)),
          customerName: invoice.customer_name,
        }))}
      />
    </div>
  );
}
