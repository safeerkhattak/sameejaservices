import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return <div className="mx-auto w-full max-w-[1480px] px-5 py-9 sm:px-8 lg:px-10"><Skeleton className="h-5 w-28 rounded-full" /><Skeleton className="mt-3 h-10 w-72 rounded-xl" /><div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[0, 1, 2, 3].map((item) => <Skeleton key={item} className="h-36 rounded-2xl" />)}</div><Skeleton className="mt-6 h-96 rounded-2xl" /></div>;
}
