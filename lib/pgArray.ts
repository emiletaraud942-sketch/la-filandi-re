// @vercel/postgres ne sait lier que des types primitifs (string, number,
// boolean, null, Date) — un tableau JS doit être converti en littéral
// Postgres ('{"a","b"}') puis casté côté SQL avec ::text[].
export function toPgTextArrayLiteral(values: string[]): string {
  const escaped = values.map((v) => `"${v.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`);
  return `{${escaped.join(',')}}`;
}
