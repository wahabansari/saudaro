import clsx from 'clsx';
import Link from 'next/link';
import type { ComponentProps, ReactNode } from 'react';

export type PageHeaderCrumb = { label: string; href: string };

export type PageHeaderProps = Omit<ComponentProps<'div'>, 'title'> & {
  breadcrumb: PageHeaderCrumb[];
  currentCrumb: string;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
};

export function PageHeader({
  breadcrumb,
  currentCrumb,
  title,
  description,
  actions,
  className,
  children,
  ...props
}: PageHeaderProps) {
  return (
    <div className={clsx('sa-pagehead', className)} {...props}>
      <nav aria-label="Breadcrumb">
        <ol className="sa-crumb">
          {breadcrumb.map((crumb) => (
            <li key={crumb.href}>
              <Link href={crumb.href}>{crumb.label}</Link>
            </li>
          ))}
          <li aria-current="page">{currentCrumb}</li>
        </ol>
      </nav>
      <div className="sa-pagehead__row">
        <div>
          <h1>{title}</h1>
          {description ? <p>{description}</p> : null}
        </div>
        {actions ? <div className="sa-pagehead__actions">{actions}</div> : null}
      </div>
      {children}
    </div>
  );
}
