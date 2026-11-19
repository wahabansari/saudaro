import { Skeleton } from '@/components/ui/Skeleton';
import { PageSkeleton } from '../../../_components/PageSkeleton';

export default function Loading() {
  return (
    <PageSkeleton>
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton variant="block" />
        <Skeleton variant="block" />
      </div>
    </PageSkeleton>
  );
}
