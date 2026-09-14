import { PageHeading } from "@/components/page-heading";
import { ProductManager } from "@/components/product-manager";
import { requireOwner } from "@/lib/authz";
import { getProducts } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const [, products] = await Promise.all([requireOwner("/products"), getProducts()]);
  return (
    <div className="mx-auto w-full max-w-[1280px] px-5 py-7 sm:px-8 lg:px-10 lg:py-9">
      <PageHeading eyebrow="Invoice setup" title="Products" description="Manage the articles available on invoices. Unit and rate are defaults that can be changed for each delivery; the final invoice values are preserved in its history." />
      <ProductManager products={products.map((product) => ({ id: product.id, articleName: product.article_name, mgmCode: product.mgm_code, subsysCode: product.subsys_code, unit: product.unit, defaultRatePaisa: product.default_rate_paisa, isActive: product.is_active }))} />
    </div>
  );
}
