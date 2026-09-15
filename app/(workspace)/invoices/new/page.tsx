import { InvoiceForm } from "@/components/invoice-form";
import { PageHeading } from "@/components/page-heading";
import { requireMember } from "@/lib/authz";
import { getCustomers, getProducts, isDemoMode } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function NewInvoicePage() {
  const [member, productRows, customerRows] = await Promise.all([requireMember("/invoices/new"), getProducts({ activeOnly: true }), getCustomers({ activeOnly: true })]);
  const products = productRows.map((product) => ({
    id: product.id,
    mgmCode: product.mgm_code,
    subsysCode: product.subsys_code,
    articleName: product.article_name,
    unit: product.unit,
    defaultRate: product.default_rate_paisa === null ? "" : String(product.default_rate_paisa / 100),
    isActive: product.is_active,
  }));
  return (
    <div className="mx-auto w-full max-w-[1480px] px-5 py-7 sm:px-8 lg:px-10 lg:py-9">
      <PageHeading eyebrow="Invoice entry" title="Create invoice draft" description="Enter the references and received quantities from Metro. The owner will review the draft before it is issued." />
      <InvoiceForm
        demoMode={isDemoMode()}
        products={products}
        customers={customerRows.map((customer) => ({ id: customer.id, name: customer.name, city: customer.city, isActive: customer.is_active }))}
        canManageProducts={member.role === "owner"}
        canManageCustomers={member.role === "owner"}
      />
    </div>
  );
}
