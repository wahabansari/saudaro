import { Skeleton } from '@/components/ui/Skeleton';

export default function Loading() {
  return (
    <div
      className="mx-auto grid w-full max-w-container gap-6 px-4 py-16 md:px-6 md:py-20 lg:py-24"
      aria-busy="true"
    >
      <Skeleton className="w-1/4" />
      <Skeleton variant="title" className="w-1/3" />
      <Skeleton className="w-1/4" />
      <Skeleton variant="block" />
      <Skeleton variant="block" />
    </div>
  );
}
