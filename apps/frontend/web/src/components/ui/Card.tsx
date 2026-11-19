import type { ComponentProps } from 'react';
import clsx from 'clsx';

export type CardProps = ComponentProps<'div'> & { flush?: boolean };

export function Card({ flush, className, ...props }: CardProps) {
  return (
    <div className={clsx('sa-card', flush && 'sa-card--flush', 'min-w-0 max-w-full', className)} {...props} />
  );
}

export function CardLink({ className, ...props }: ComponentProps<'a'>) {
  return <a className={clsx('sa-card sa-card--link', 'min-w-0 max-w-full', className)} {...props} />;
}

export function CardBody({ className, ...props }: ComponentProps<'div'>) {
  return <div className={clsx('sa-card__body', className)} {...props} />;
}
