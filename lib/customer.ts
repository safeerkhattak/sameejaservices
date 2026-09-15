const LEGAL_SUFFIXES = new Set(["limited", "ltd", "private", "pvt"]);

export function customerKey(value: string) {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase("en")
    .replace(/&/g, " and ")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .split(/\s+/)
    .filter((part) => !LEGAL_SUFFIXES.has(part))
    .join(" ");
}

export function uniqueCustomerNames(values: string[]) {
  const names = new Map<string, string>();
  values.forEach((value) => {
    const key = customerKey(value);
    const existing = names.get(key);
    if (key && (!existing || value.length > existing.length)) names.set(key, value);
  });
  return Array.from(names.values());
}
