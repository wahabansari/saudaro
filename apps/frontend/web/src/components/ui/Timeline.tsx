import clsx from 'clsx';
import type { ComponentPropsWithRef, ReactNode } from 'react';
import { Icon, type IconName } from '@/icons';

export type TimelineProps = ComponentPropsWithRef<'ol'>;
export type TimelineItemProps = Omit<ComponentPropsWithRef<'li'>, 'title'> & {
  state?: 'done' | 'now' | 'upcoming';
  icon?: IconName;
  title: ReactNode;
  meta?: ReactNode;
  text?: ReactNode;
};

export function Timeline({ className, ...props }: TimelineProps) {
  return <ol className={clsx('sa-timeline', className)} {...props} />;
}

export function TimelineItem({
  state = 'upcoming',
  icon,
  title,
  meta,
  text,
  className,
  ...props
}: TimelineItemProps) {
  const iconName = icon ?? (state === 'done' ? 'check' : 'circle');
  return (
    <li className={clsx('sa-tl', state !== 'upcoming' && `sa-tl--${state}`, className)} {...props}>
      <span className="sa-tl__dot">
        <Icon name={iconName} size={20} />
      </span>
      <div>
        <div className="sa-tl__title">{title}</div>
        {meta ? <div className="sa-tl__meta">{meta}</div> : null}
        {text ? <div className="sa-tl__text">{text}</div> : null}
      </div>
    </li>
  );
}
