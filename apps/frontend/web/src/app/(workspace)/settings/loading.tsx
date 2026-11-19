import { Skeleton } from '@/components/ui/Skeleton';
import { PageSkeleton } from '../../_components/PageSkeleton';

export default function Loading() {
  return (
    <PageSkeleton>
      <Skeleton variant="block" />
    </PageSkeleton>
  );
}
