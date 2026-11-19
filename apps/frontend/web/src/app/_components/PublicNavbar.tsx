'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { Navbar } from '@/components/ui/Navbar';
import { Sheet, SheetClose, SheetContent, SheetTrigger } from '@/components/ui/Sheet';
import { isCurrentPath, PUBLIC_LINKS } from '@/lib/navigation';

function Actions({ className }: { className?: string }) {
  return (
    <div className={className}>
      <Button asChild variant="text">
        <Link href="/account">Sign in</Link>
      </Button>
      <Button asChild>
        <Link href="/rfqs/new">Post an RFQ</Link>
      </Button>
    </div>
  );
}

export function PublicNavbar() {
  const pathname = usePathname();
  const links = PUBLIC_LINKS.map((link) => ({
    ...link,
    current: !link.href.includes('#') && isCurrentPath(pathname, link.href),
  }));

  return (
    <Navbar links={links} className="sa-vt-head sticky top-0 z-sticky max-md:[&>nav]:hidden">
      <Actions className="hidden items-center gap-2 md:flex" />
      <Sheet key={pathname}>
        <SheetTrigger asChild>
          <IconButton icon="list" aria-label="Open menu" className="md:hidden" />
        </SheetTrigger>
        <SheetContent title="Menu">
          <nav aria-label="Menu" className="grid gap-2">
            {PUBLIC_LINKS.map((link) => (
              <SheetClose key={link.label} asChild>
                <Button asChild variant="text">
                  <Link href={link.href}>{link.label}</Link>
                </Button>
              </SheetClose>
            ))}
          </nav>
          <Actions className="grid gap-2" />
        </SheetContent>
      </Sheet>
    </Navbar>
  );
}
