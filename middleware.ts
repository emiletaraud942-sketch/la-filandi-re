import { NextRequest, NextResponse } from 'next/server';
import { getSession } from './lib/session';

const PUBLIC_API_PATHS = new Set(['/api/auth/login', '/api/auth/logout', '/api/session']);
// Point d'entrée d'un membre pas encore inscrit (lien d'invitation) —
// forcément public, aucune session n'existe encore à ce stade.
const PUBLIC_API_PREFIXES = ['/api/invites/'];
const MANAGER_ONLY_PREFIXES = ['/api/admin/'];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isApi = pathname.startsWith('/api/');
  const isProtectedPage = pathname === '/app.html' || pathname === '/change-password.html';

  if (isApi && (PUBLIC_API_PATHS.has(pathname) || PUBLIC_API_PREFIXES.some((p) => pathname.startsWith(p)))) {
    return NextResponse.next();
  }
  if (!isApi && !isProtectedPage) return NextResponse.next();

  const session = await getSession(req);

  if (!session) {
    if (isApi) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/login.html', req.url));
  }

  if (isApi && MANAGER_ONLY_PREFIXES.some((p) => pathname.startsWith(p)) && session.role !== 'manager') {
    return NextResponse.json({ error: 'Réservé au responsable technique' }, { status: 403 });
  }

  if (!isApi && session.mustChangePassword && pathname !== '/change-password.html') {
    return NextResponse.redirect(new URL('/change-password.html', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/app.html', '/change-password.html', '/api/:path*'],
};
