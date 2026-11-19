import type { ComponentProps } from 'react';
import clsx from 'clsx';

type Props = ComponentProps<'button'> & {
  variant?:
    | 'primary'
    | 'secondary'
    | 'outline'
    | 'dashed'
    | 'text'
    | 'link'
    | 'danger'
    | 'danger-soft'
    | 'ghost'
    | 'inverse'
    | 'inverse-outline'
    | 'inverse-ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  href?: string;
};

export type ButtonProps = Props;

export function Button({
  variant = 'primary',
  size = 'md',
  loading,
  href,
  className,
  children,
  ...props
}: Props) {
  const Tag = href ? 'a' : 'button';
  const label = typeof children === 'string' ? children : 'Loading';
  return (
    <Tag
      {...(props as object)}
      href={href}
      type={href ? undefined : (props.type ?? 'button')}
      aria-busy={loading || undefined}
      className={clsx(
        'sa-btn max-w-full',
        variant !== 'primary' && `sa-btn--${variant}`,
        size !== 'md' && `sa-btn--${size}`,
        className,
      )}
    >
      {loading ? (
        <>
          <span className="sa-btn__label">{children}</span>
          <span className="sa-spinner" role="status" aria-label={label} />
        </>
      ) : (
        children
      )}
    </Tag>
  );
}
