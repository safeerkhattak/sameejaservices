import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function RegisterPagination({
  basePath,
  page,
  pageSize,
  totalPages,
  totalRecords,
  query,
  params,
}: {
  basePath: string;
  page: number;
  pageSize: number;
  totalPages: number;
  totalRecords: number;
  query?: string;
  params?: Record<string, string | undefined>;
}) {
  if (totalRecords === 0) return null;

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalRecords);
  const href = (targetPage: number) => {
    const nextParams = new URLSearchParams();
    Object.entries(params ?? {}).forEach(([key, value]) => { if (value) nextParams.set(key, value); });
    if (query && !nextParams.has("q")) nextParams.set("q", query);
    if (targetPage > 1) nextParams.set("page", String(targetPage));
    const suffix = nextParams.toString();
    return suffix ? `${basePath}?${suffix}` : basePath;
  };

  return (
    <footer className="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
      <p>Showing {start}–{end} of {totalRecords}</p>
      {totalPages > 1 && (
        <nav className="flex items-center gap-2" aria-label="Register pagination">
          {page > 1 ? (
            <Button asChild variant="outline" size="sm" className="cursor-pointer rounded-lg bg-white">
              <Link href={href(page - 1)}><ChevronLeft />Previous</Link>
            </Button>
          ) : (
            <Button variant="outline" size="sm" className="rounded-lg" disabled><ChevronLeft />Previous</Button>
          )}
          <span className="min-w-20 text-center text-xs font-semibold text-slate-600">Page {page} of {totalPages}</span>
          {page < totalPages ? (
            <Button asChild variant="outline" size="sm" className="cursor-pointer rounded-lg bg-white">
              <Link href={href(page + 1)}>Next<ChevronRight /></Link>
            </Button>
          ) : (
            <Button variant="outline" size="sm" className="rounded-lg" disabled>Next<ChevronRight /></Button>
          )}
        </nav>
      )}
    </footer>
  );
}
