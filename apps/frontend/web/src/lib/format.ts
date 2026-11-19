const MOCK_TODAY = '2026-11-18';
const MS_PER_DAY = 86_400_000;
const CLOSING_SOON_DAYS = 2;

const dateFormat = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});
const amountFormat = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const countFormat = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });

export const formatDate = (iso: string) => dateFormat.format(new Date(`${iso.slice(0, 10)}T00:00:00Z`));

export const formatAmount = (amount: number) => amountFormat.format(amount);

export const formatMoney = (amount: number, currency: string, unit?: string) =>
  `${currency} ${formatAmount(amount)}${unit ? ` / ${unit}` : ''}`;

export const formatQuantity = (quantity: number, unit: string) => `${countFormat.format(quantity)} ${unit}`;

export function formatFileSize(kilobytes: number) {
  return kilobytes >= 1024 ? `${(kilobytes / 1024).toFixed(1)} MB` : `${kilobytes} KB`;
}

export function daysUntil(iso: string, today = MOCK_TODAY) {
  const days = (Date.parse(`${iso}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / MS_PER_DAY;
  return Math.round(days);
}

export function closesInLabel(deadline: string) {
  const days = daysUntil(deadline);
  if (days < 0) return 'Closed';
  if (days === 0) return 'Closes today';
  return `Closes in ${days} ${days === 1 ? 'day' : 'days'}`;
}

export const isClosingSoon = (deadline: string) => {
  const days = daysUntil(deadline);
  return days >= 0 && days <= CLOSING_SOON_DAYS;
};

export const pluralise = (count: number, singular: string, plural = `${singular}s`) =>
  `${count} ${count === 1 ? singular : plural}`;
