import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { DisplaySection } from './sections/DisplaySection';
import { FormsSection } from './sections/FormsSection';
import { FoundationsSection } from './sections/FoundationsSection';
import { GridSection } from './sections/GridSection';
import { LayoutLoadersSection } from './sections/LayoutLoadersSection';
import { LayoutSection } from './sections/LayoutSection';
import { MarketplaceSection } from './sections/MarketplaceSection';
import { OverlaysSection } from './sections/OverlaysSection';

export const metadata: Metadata = { title: 'Design system', robots: { index: false } };

const groups = [
  { id: 'foundations', title: 'Foundations', Section: FoundationsSection },
  { id: 'forms', title: 'Actions and forms', Section: FormsSection },
  { id: 'display', title: 'Data display, feedback and loaders', Section: DisplaySection },
  { id: 'overlays', title: 'Overlays and menus', Section: OverlaysSection },
  { id: 'grid', title: 'Data grid', Section: GridSection },
  { id: 'layout', title: 'Layout and navigation', Section: LayoutSection },
  { id: 'page-loader', title: 'Page loader', Section: LayoutLoadersSection },
  { id: 'marketplace', title: 'Marketplace', Section: MarketplaceSection },
] as const;

export default function DesignSystemPage() {
  if (process.env.NODE_ENV === 'production') notFound();

  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-toast focus:rounded-md focus:bg-card focus:px-4 focus:py-2 focus:shadow-md"
      >
        Skip to content
      </a>
      <main id="main" className="mx-auto w-full max-w-container px-4 py-16 md:px-6">
        <h1 className="mb-8 text-h1">Design system</h1>
        <nav aria-label="Groups" className="mb-8 flex flex-wrap gap-4">
          {groups.map(({ id, title }) => (
            <a key={id} href={`#${id}`} className="text-link">
              {title}
            </a>
          ))}
        </nav>
        {groups.map(({ id, title, Section }) => (
          <section key={id} id={id} aria-labelledby={`${id}-h`} className="mb-16 grid gap-8 [&>*]:min-w-0">
            <h2 id={`${id}-h`} className="text-h2">
              {title}
            </h2>
            <Section />
          </section>
        ))}
      </main>
    </>
  );
}
