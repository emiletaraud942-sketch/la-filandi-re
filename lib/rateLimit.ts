import { sql } from './db';

const WINDOW_MINUTES = 15;
const MAX_FAILED_ATTEMPTS = 5;

export async function isLockedOut(username: string): Promise<boolean> {
  const { rows } = await sql<{ failed: number }>`
    SELECT count(*)::int AS failed
    FROM login_attempts
    WHERE username = ${username}
      AND success = false
      AND attempted_at > now() - make_interval(mins => ${WINDOW_MINUTES})
  `;
  return (rows[0]?.failed ?? 0) >= MAX_FAILED_ATTEMPTS;
}

export async function recordLoginAttempt(username: string, ip: string | null, success: boolean): Promise<void> {
  await sql`INSERT INTO login_attempts (username, ip, success) VALUES (${username}, ${ip}, ${success})`;
}
