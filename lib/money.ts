export function formatPkr(paisa: number) {
  return `Rs ${Math.round(paisa / 100).toLocaleString("en-PK")}`;
}

export function parsePkr(value: unknown) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0) return null;
  return Math.round(amount * 100);
}

export function parseKg(value: unknown) {
  const quantity = Number(value);
  if (!Number.isFinite(quantity) || quantity < 0) return null;
  return Math.round(quantity * 1000);
}

export function formatKg(millis: number) {
  return (millis / 1000).toLocaleString("en-PK", { maximumFractionDigits: 3 });
}
