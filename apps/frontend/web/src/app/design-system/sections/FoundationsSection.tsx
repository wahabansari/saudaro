import { Icon, icons, type IconName } from '@/icons';
import tokens from '@/styles/tokens.json';

const LOGOS = [
  'saudaro-lockup-horizontal-ink',
  'saudaro-lockup-horizontal-navy',
  'saudaro-lockup-horizontal-white',
  'saudaro-lockup-stacked-ink',
  'saudaro-lockup-stacked-navy',
  'saudaro-lockup-stacked-white',
  'saudaro-mark-ink',
  'saudaro-mark-navy',
  'saudaro-mark-white',
  'saudaro-wordmark-ink',
  'saudaro-wordmark-navy',
  'saudaro-wordmark-white',
  'saudaro-app-icon',
  'saudaro-favicon',
];

const SCALES = ['primary', 'grey', 'success', 'warning', 'danger'];

const TYPE_STYLES = [
  ['display-2xl', 'text-display-2xl'],
  ['display-xl', 'text-display-xl'],
  ['display-lg', 'text-display-lg'],
  ['h1', 'text-h1'],
  ['h2', 'text-h2'],
  ['h3', 'text-h3'],
  ['h4', 'text-h4'],
  ['h5', 'text-h5'],
  ['body-lg', 'text-body-lg'],
  ['body', 'text-body'],
  ['body-sm', 'text-body-sm'],
  ['label', 'text-label'],
  ['caption', 'text-caption'],
  ['overline', 'text-overline'],
  ['mono-lg', 'text-mono-lg'],
  ['mono', 'text-mono'],
  ['mono-sm', 'text-mono-sm'],
] as const;

const tokenNames = tokens.color.tokens.map((token) => token.name);

const scaleSwatches = (scale: string) =>
  tokenNames
    .filter((name) => new RegExp(`^${scale}-\\d+$`).test(name))
    .sort((a, b) => Number(a.split('-')[1]) - Number(b.split('-')[1]));

const iconNames = Object.keys(icons) as IconName[];

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-4">
      <h3 className="text-h4">{title}</h3>
      {children}
    </section>
  );
}

export function FoundationsSection() {
  return (
    <div className="grid gap-12">
      <Group title="Logo">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {LOGOS.map((name) => (
            <figure key={name} className="m-0 grid gap-2">
              <div
                className={`flex h-24 items-center justify-center rounded-lg border-2 border-card-border p-4 ${name.endsWith('white') ? 'sa-ground' : 'bg-card'}`}
              >
                <img src={`/brand/${name}.svg`} alt={name} className="max-h-full max-w-full" />
              </div>
              <figcaption className="sa-mono text-caption">{name}</figcaption>
            </figure>
          ))}
        </div>
      </Group>

      <Group title="Colour scales">
        {SCALES.map((scale) => (
          <div key={scale} className="grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
            {scaleSwatches(scale).map((name) => (
              <figure key={name} className="m-0 grid gap-2">
                <div
                  className="h-12 rounded-md border-2 border-card-border"
                  style={{ background: `var(--${name})` }}
                />
                <figcaption className="sa-mono text-caption">{name}</figcaption>
              </figure>
            ))}
          </div>
        ))}
      </Group>

      <Group title="Type scale">
        <div className="grid gap-4">
          {TYPE_STYLES.map(([name, className]) => (
            <div key={name} className="grid gap-1">
              <span className="sa-mono text-caption">{name}</span>
              <span className={className}>Import and export, in one place</span>
            </div>
          ))}
        </div>
      </Group>

      <Group title="Icons">
        <div className="grid grid-cols-3 gap-4 sm:grid-cols-5 md:grid-cols-8 lg:grid-cols-10">
          {iconNames.map((name) => (
            <figure key={name} className="m-0 grid justify-items-center gap-2">
              <Icon name={name} size={24} />
              <figcaption className="sa-mono text-caption">{name}</figcaption>
            </figure>
          ))}
        </div>
      </Group>
    </div>
  );
}
