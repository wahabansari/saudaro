'use client';

import clsx from 'clsx';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState, type ComponentProps } from 'react';

const START_DELAY_MS = 120;
const FADE_MS = 200;

type Phase = 'idle' | 'loading' | 'done';

export type RouteProgressProps = Omit<ComponentProps<'div'>, 'children'>;

function isRouteChangeClick(event: MouseEvent): boolean {
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return false;
  if (!(event.target instanceof Element)) return false;
  const anchor = event.target.closest('a[href]');
  if (
    !(anchor instanceof HTMLAnchorElement) ||
    anchor.target === '_blank' ||
    anchor.hasAttribute('download')
  ) {
    return false;
  }
  return anchor.origin === window.location.origin && anchor.pathname !== window.location.pathname;
}

export function RouteProgress({ className, ...props }: RouteProgressProps) {
  const pathname = usePathname();
  const [phase, setPhase] = useState<Phase>('idle');
  const startTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (!isRouteChangeClick(event)) return;
      window.clearTimeout(startTimer.current);
      startTimer.current = window.setTimeout(() => setPhase('loading'), START_DELAY_MS);
    };
    document.addEventListener('click', handleClick, true);
    return () => {
      document.removeEventListener('click', handleClick, true);
      window.clearTimeout(startTimer.current);
    };
  }, []);

  useEffect(() => {
    window.clearTimeout(startTimer.current);
    setPhase((current) => (current === 'loading' ? 'done' : current));
  }, [pathname]);

  useEffect(() => {
    if (phase !== 'done') return;
    const fadeTimer = setTimeout(() => setPhase('idle'), FADE_MS);
    return () => clearTimeout(fadeTimer);
  }, [phase]);

  if (phase === 'idle') return null;

  return (
    <div
      className={clsx(
        'fixed inset-x-0 top-0 z-toast transition-opacity duration-[200ms]',
        phase === 'done' && 'opacity-0',
        className,
      )}
      {...props}
    >
      <div className="sa-route" role="progressbar" aria-label="Loading page" />
    </div>
  );
}
