import { CustomerManager } from "@/components/customer-manager";
import { PageHeading } from "@/components/page-heading";
import { requireOwner } from "@/lib/authz";
import { getCustomers } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function CustomersPage() {
  const [, customers] = await Promise.all([requireOwner("/customers"), getCustomers()]);
  return (
    <div className="mx-auto w-full max-w-[1280px] px-5 py-7 sm:px-8 lg:px-10 lg:py-9">
      <PageHeading eyebrow="Invoice setup" title="Customers" description="Manage delivery customers by their permanent internal ID. Names and cities are descriptive and can be updated without mixing invoice histories." />
      <CustomerManager customers={customers.map((customer) => ({ id: customer.id, name: customer.name, city: customer.city, isActive: customer.is_active }))} />
    </div>
  );
}
