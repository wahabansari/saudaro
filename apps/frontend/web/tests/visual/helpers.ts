import fs from 'node:fs';
import path from 'node:path';

export const WEB = path.resolve(__dirname, '../..');
export const OUT = path.join(__dirname, '.output');
export const COMPONENTS_DIR = path.join(WEB, 'reference/components');
export const components = fs.readdirSync(COMPONENTS_DIR).sort();

export const writeJson = (name: string, data: unknown) => {
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, name), JSON.stringify(data, null, 2));
};
export const readJson = <T>(name: string): T | null => {
  const file = path.join(OUT, name);
  return fs.existsSync(file) ? (JSON.parse(fs.readFileSync(file, 'utf8')) as T) : null;
};

/** Workers restart after a failing test, so results are merged into the file as they come. */
export const record = (name: string, section: string, key: string, value: unknown) => {
  const all = readJson<Record<string, Record<string, unknown>>>(name) ?? {};
  writeJson(name, { ...all, [section]: { ...all[section], [key]: value } });
};
