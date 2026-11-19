import type { ComponentProps, ReactNode } from 'react';
import clsx from 'clsx';
import { Icon, type IconName } from '@/icons';

export function Timeline({ className, ...props }: ComponentProps<'ol'>) {
  return (
    <div className="@container min-w-0 max-w-full">
      <ol className={clsx('sa-timeline', className)} {...props} />
    </div>
  );
}

export type TimelineItemProps = Omit<ComponentProps<'li'>, 'title'> & {
  icon: IconName;
  title: ReactNode;
  status?: 'done' | 'now';
  badge?: ReactNode;
  meta?: ReactNode;
  text?: ReactNode;
};

export function TimelineItem({
  icon,
  title,
  status,
  badge,
  meta,
  text,
  className,
  ...props
}: TimelineItemProps) {
  return (
    <li className={clsx('sa-tl', status && `sa-tl--${status}`, className)} {...props}>
      <span className="sa-tl__dot">
        <Icon name={icon} size={20} />
      </span>
      <div className="min-w-0">
        <div className="sa-tl__title">
          {title} {badge}
        </div>
        {meta && <div className="sa-tl__meta break-words">{meta}</div>}
        {text && <div className="sa-tl__text">{text}</div>}
      </div>
    </li>
  );
}
