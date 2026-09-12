import { InvoiceForm } from "@/components/invoice-form";
import { PageHeading } from "@/components/page-heading";
import { isDemoMode } from "@/lib/data";

export const dynamic = "force-dynamic";

export default function NewInvoicePage() {
  return (
    <div className="mx-auto w-full max-w-[1480px] px-5 py-7 sm:px-8 lg:px-10 lg:py-9">
      <PageHeading eyebrow="Invoice entry" title="Create invoice draft" description="Enter the references and received quantities from Metro. The owner will review the draft before it is issued." />
      <InvoiceForm demoMode={isDemoMode()} />
    </div>
  );
}
