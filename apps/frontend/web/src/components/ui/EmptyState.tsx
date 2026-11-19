import type { ComponentProps, ReactNode } from 'react';
import clsx from 'clsx';
import { Icon, type IconName } from '@/icons';

export type EmptyStateProps = Omit<ComponentProps<'div'>, 'title'> & {
  icon: IconName;
  title: string;
  description?: ReactNode;
};

export function EmptyState({ icon, title, description, className, children, ...props }: EmptyStateProps) {
  return (
    <div {...props} className={clsx('sa-empty', className)}>
      <div className="sa-empty__icon">
        <Icon name={icon} />
      </div>
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {children}
    </div>
  );
}
