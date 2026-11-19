import clsx from 'clsx';
import type { ComponentProps, ReactNode } from 'react';

export type PageHeaderProps = Omit<ComponentProps<'div'>, 'title'> & {
  breadcrumb?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
};

export function PageHeader({
  breadcrumb,
  title,
  description,
  actions,
  className,
  children,
  ...props
}: PageHeaderProps) {
  return (
    <div className={clsx('@container', className)} {...props}>
      <div className="sa-pagehead grid-cols-1">
        {breadcrumb}
        <div className="sa-pagehead__row @max-xs:flex-col">
          <div>
            <h1>{title}</h1>
            {description && <p>{description}</p>}
          </div>
          {actions && <div className="sa-pagehead__actions @max-xs:flex-wrap">{actions}</div>}
        </div>
        {children}
      </div>
    </div>
  );
}
