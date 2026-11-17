/**
 * Minimal Prometheus-text metrics registry (counters, gauges, histograms). Scraped from `/metrics`; no
 * external dependency, no per-request allocation beyond the label key. Cardinality rule: labels must be
 * low-cardinality (route templates, status classes, operation names) — NEVER user, company or request ids.
 */
type Labels = Record<string, string>;

const esc = (v: string): string => v.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
const key = (names: string[], labels: Labels): string =>
  names.map((n) => `${n}="${esc(labels[n] ?? '')}"`).join(',');

export interface Counter {
  inc(labels?: Labels, value?: number): void;
}
export interface Gauge {
  set(value: number, labels?: Labels): void;
}
export interface Histogram {
  observe(value: number, labels?: Labels): void;
}

export const DEFAULT_BUCKETS_SECONDS = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10];

export class MetricsRegistry {
  private readonly render_: Array<() => string> = [];

  counter(name: string, help: string, labelNames: string[] = []): Counter {
    const values = new Map<string, number>();
    this.render_.push(() => {
      const lines = [`# HELP ${name} ${help}`, `# TYPE ${name} counter`];
      for (const [k, v] of values) lines.push(`${name}${k ? `{${k}}` : ''} ${v}`);
      return lines.join('\n');
    });
    return {
      inc: (labels = {}, value = 1) => {
        const k = key(labelNames, labels);
        values.set(k, (values.get(k) ?? 0) + value);
      },
    };
  }

  gauge(name: string, help: string, labelNames: string[] = []): Gauge {
    const values = new Map<string, number>();
    this.render_.push(() => {
      const lines = [`# HELP ${name} ${help}`, `# TYPE ${name} gauge`];
      for (const [k, v] of values) lines.push(`${name}${k ? `{${k}}` : ''} ${v}`);
      return lines.join('\n');
    });
    return { set: (value, labels = {}) => void values.set(key(labelNames, labels), value) };
  }

  histogram(
    name: string,
    help: string,
    labelNames: string[] = [],
    buckets: number[] = DEFAULT_BUCKETS_SECONDS,
  ): Histogram {
    const series = new Map<string, { counts: number[]; sum: number; count: number }>();
    this.render_.push(() => {
      const lines = [`# HELP ${name} ${help}`, `# TYPE ${name} histogram`];
      for (const [k, s] of series) {
        const sep = k ? `${k},` : '';
        let cumulative = 0;
        buckets.forEach((b, i) => {
          cumulative += s.counts[i] ?? 0;
          lines.push(`${name}_bucket{${sep}le="${b}"} ${cumulative}`);
        });
        lines.push(`${name}_bucket{${sep}le="+Inf"} ${s.count}`);
        lines.push(`${name}_sum${k ? `{${k}}` : ''} ${s.sum}`);
        lines.push(`${name}_count${k ? `{${k}}` : ''} ${s.count}`);
      }
      return lines.join('\n');
    });
    return {
      observe: (value, labels = {}) => {
        const k = key(labelNames, labels);
        const s = series.get(k) ?? { counts: new Array<number>(buckets.length).fill(0), sum: 0, count: 0 };
        const i = buckets.findIndex((b) => value <= b);
        if (i >= 0) s.counts[i] = (s.counts[i] ?? 0) + 1;
        s.sum += value;
        s.count += 1;
        series.set(k, s);
      },
    };
  }

  render(): string {
    return this.render_.map((r) => r()).join('\n') + '\n';
  }
}
