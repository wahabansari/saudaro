import { Skeleton } from '@/components/ui/Skeleton';
import { PageSkeleton } from '../../../_components/PageSkeleton';

export default function Loading() {
  return (
    <PageSkeleton>
      <div className="grid gap-6 lg:grid-cols-3">
        <Skeleton variant="block" />
        <Skeleton variant="block" className="lg:col-span-2" />
      </div>
    </PageSkeleton>
  );
}
