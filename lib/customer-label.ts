type CustomerLabelInput = { id: string; name: string; city: string };

export function customerLabel(customer: CustomerLabelInput, customers: CustomerLabelInput[]) {
  const base = customer.city ? `${customer.name} — ${customer.city}` : customer.name;
  const hasDuplicate = customers.some((other) => other.id !== customer.id && other.name === customer.name && other.city === customer.city);
  return hasDuplicate ? `${base} · ${customer.id.slice(0, 8)}` : base;
}
