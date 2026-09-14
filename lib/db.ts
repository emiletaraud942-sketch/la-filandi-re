import { neon } from '@neondatabase/serverless';

// `@vercel/postgres`'s `sql` par défaut n'accepte que la variable
// `POSTGRES_URL` (l'ancien nom, propre au produit natif "Vercel Postgres").
// L'intégration Neon installée depuis le Marketplace Vercel injecte plutôt
// `DATABASE_URL` (et des variantes PG*) — on cherche donc parmi les noms
// plausibles au lieu d'imposer un renommage manuel des variables Vercel.
const connectionString =
  process.env.POSTGRES_URL ||
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL_NO_SSL ||
  process.env.POSTGRES_URL_NON_POOLING;

if (!connectionString) {
  throw new Error(
    "Aucune variable d'environnement de connexion Postgres trouvée " +
      '(POSTGRES_URL, DATABASE_URL, POSTGRES_URL_NO_SSL...). ' +
      'Vérifiez que la base Neon est bien reliée au projet Vercel.'
  );
}

const query = neon(connectionString, { fullResults: true });

function sqlTemplate(strings: TemplateStringsArray, values: unknown[]): [string, unknown[]] {
  let text = strings[0] ?? '';
  for (let i = 1; i < strings.length; i++) {
    text += `$${i}${strings[i] ?? ''}`;
  }
  return [text, values];
}

// Signature compatible avec `sql` de @vercel/postgres : un tag de template
// littéral renvoyant `{ rows }`, utilisé partout ailleurs dans le code.
export async function sql<T = any>(
  strings: TemplateStringsArray,
  ...values: unknown[]
): Promise<{ rows: T[] }> {
  const [text, params] = sqlTemplate(strings, values);
  const result = await query(text, params);
  return { rows: result.rows as T[] };
}
