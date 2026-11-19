import { DisplayView } from './_view/DisplayView';
import { FormsView } from './_view/FormsView';
import { GridView } from './_view/GridView';
import { LayoutView } from './_view/LayoutView';
import { MarketplaceView } from './_view/MarketplaceView';
import { OverlaysView } from './_view/OverlaysView';

const groups = [
  { id: 'forms', title: 'Actions and forms', View: FormsView },
  { id: 'display', title: 'Data display, feedback and loaders', View: DisplayView },
  { id: 'overlays', title: 'Overlays and menus', View: OverlaysView },
  { id: 'grid', title: 'Data grid', View: GridView },
  { id: 'layout', title: 'Layout and navigation', View: LayoutView },
  { id: 'marketplace', title: 'Marketplace', View: MarketplaceView },
] as const;

export default function ComponentsPage() {
  return (
    <main className="mx-auto w-full max-w-container px-[clamp(1rem,4vw,2rem)] py-[clamp(2rem,6vw,5rem)]">
      <h1 className="text-h1">Components</h1>
      <nav aria-label="Groups" className="my-6 flex flex-wrap gap-x-6 gap-y-2">
        {groups.map(({ id, title }) => (
          <a key={id} href={`#${id}`} className="text-link">
            {title}
          </a>
        ))}
      </nav>
      {groups.map(({ id, title, View }) => (
        <section
          key={id}
          id={id}
          aria-labelledby={`${id}-h`}
          className="mt-[clamp(2rem,6vw,4rem)] grid min-w-0 gap-8 [&>*]:min-w-0 [&>div]:grid-cols-[minmax(0,1fr)]"
        >
          <h2 id={`${id}-h`} className="text-h2">
            {title}
          </h2>
          <View />
        </section>
      ))}
    </main>
  );
}
