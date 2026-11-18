import type { HTMLAttributes, ReactNode } from 'react';
import clsx from 'clsx';
import { Icon, type IconName } from '@/icons';

export type EmptyStateProps = Omit<HTMLAttributes<HTMLDivElement>, 'title'> & {
  icon: IconName;
  title: string;
  description: string;
  /** The one primary action. */
  action?: ReactNode;
  /** Optional secondary link. */
  link?: ReactNode;
};

export function EmptyState({ icon, title, description, action, link, className, ...rest }: EmptyStateProps) {
  return (
    <div className={clsx('sa-empty', className)} {...rest}>
      <div className="sa-empty__icon">
        <Icon name={icon} size={32} />
      </div>
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
      {link}
    </div>
  );
}
