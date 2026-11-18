import clsx from 'clsx';
import type { ComponentPropsWithRef } from 'react';

export type CardProps = ComponentPropsWithRef<'div'> & { flush?: boolean };
export type CardLinkProps = ComponentPropsWithRef<'a'> & { flush?: boolean };
export type CardMediaProps = ComponentPropsWithRef<'div'>;
export type CardBodyProps = ComponentPropsWithRef<'div'>;

export function Card({ flush, className, ...props }: CardProps) {
  return <div className={clsx('sa-card', flush && 'sa-card--flush', className)} {...props} />;
}

export function CardLink({ flush, className, ...props }: CardLinkProps) {
  return <a className={clsx('sa-card sa-card--link', flush && 'sa-card--flush', className)} {...props} />;
}

export function CardMedia({ className, ...props }: CardMediaProps) {
  return <div className={clsx('sa-card__media', className)} {...props} />;
}

export function CardBody({ className, ...props }: CardBodyProps) {
  return <div className={clsx('sa-card__body', className)} {...props} />;
}
