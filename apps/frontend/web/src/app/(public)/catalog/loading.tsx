import { Skeleton } from '@/components/ui/Skeleton';

const PLACEHOLDER_CARDS = ['a', 'b', 'c', 'd'];

export default function Loading() {
  return (
    <div
      className="mx-auto grid w-full max-w-container gap-6 px-4 py-16 md:px-6 md:py-20 lg:py-24"
      aria-busy="true"
    >
      <Skeleton variant="title" className="w-1/4" />
      <Skeleton className="w-1/3" />
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {PLACEHOLDER_CARDS.map((id) => (
          <Skeleton key={id} variant="block" />
        ))}
      </div>
    </div>
  );
}
