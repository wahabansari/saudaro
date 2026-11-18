type Props = { text: string; query: string };

export function Highlight({ text, query }: Props) {
  const needle = query.trim();
  const start = needle ? text.toLowerCase().indexOf(needle.toLowerCase()) : -1;
  if (start < 0) return text;
  const end = start + needle.length;
  return (
    <>
      {text.slice(0, start)}
      <mark>{text.slice(start, end)}</mark>
      {text.slice(end)}
    </>
  );
}
