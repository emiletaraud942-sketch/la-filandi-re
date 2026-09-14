import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getSession } from '@/lib/auth';

// Export .ics du planning d'un membre (Lot 10). Le tirage matin/après-midi
// n'est pas stocké en base : c'est un calcul déterministe fait côté client
// (public/app.html) à partir de l'index du membre et de la date. On le
// reproduit ici à l'identique pour que l'export corresponde à ce que
// l'écran affiche. Heures exportées en heure locale flottante (pas de
// TZID) : suffisant pour un établissement sur un seul fuseau horaire.
const DAY = 86400000;
function dayIndex(d: Date) {
  return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / DAY);
}
function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function addDays(d: Date, n: number) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

const SHIFTS = {
  matin: { startHour: 6, endHour: 14, label: 'Matin' },
  aprem: { startHour: 13.5, endHour: 21.5, label: 'Après-midi' },
} as const;

function siteName(id: string) {
  return id === 'CLF' ? 'Clairefontaine' : id === 'BMT' ? 'Beaumont' : id;
}
function pad(n: number) {
  return String(n).padStart(2, '0');
}
function icsDate(d: Date, hour: number) {
  const h = Math.floor(hour);
  const m = hour % 1 ? 30 : 0;
  return d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + 'T' + pad(h) + pad(m) + '00';
}
function escapeIcs(s: string) {
  return s.replace(/([,;\\])/g, '\\$1').replace(/\n/g, '\\n');
}

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const requestedId = Number(searchParams.get('memberId')) || session.teamMemberId;
  if (!requestedId) {
    return NextResponse.json({ error: "Aucun membre d'équipe associé à ce compte" }, { status: 400 });
  }
  if (session.role !== 'manager' && requestedId !== session.teamMemberId) {
    return NextResponse.json({ error: 'Vous ne pouvez exporter que votre propre planning' }, { status: 403 });
  }

  const [teamRes, leavesRes] = await Promise.all([
    sql<{ id: number; name: string; site: string }>`SELECT id, name, site FROM team WHERE active ORDER BY id`,
    sql<{ memberId: number; start: string; end: string }>`
      SELECT member_id AS "memberId", start_date AS start, end_date AS "end" FROM leaves
    `,
  ]);

  const staff = teamRes.rows;
  const leaves = leavesRes.rows.map((l) => ({
    memberId: l.memberId,
    from: new Date(l.start + 'T00:00:00'),
    to: new Date(l.end + 'T00:00:00'),
  }));

  const memberIndex = staff.findIndex((p) => p.id === requestedId);
  if (memberIndex === -1) return NextResponse.json({ error: 'Membre introuvable ou inactif' }, { status: 404 });
  const member = staff[memberIndex];

  const today = startOfDay(new Date());
  const weeks = Math.min(Number(searchParams.get('weeks')) || 4, 12);
  const events: string[] = [];

  for (let n = 0; n < weeks * 7; n++) {
    const d = addDays(today, n);
    const t = d.getTime();
    const onLeave = leaves.some((l) => l.memberId === requestedId && t >= l.from.getTime() && t <= l.to.getTime());
    if (onLeave) continue;

    const di = dayIndex(d);
    const dow = d.getDay();
    const weekend = dow === 0 || dow === 6;
    const r = (memberIndex * 2 + di) % 5;
    let shift: 'matin' | 'aprem' | null = null;
    if (weekend) shift = r === 0 ? 'matin' : r === 1 ? 'aprem' : null;
    else shift = r < 2 ? 'matin' : r < 4 ? 'aprem' : null;
    if (!shift) continue;

    const lent = (memberIndex + di) % 5 === 4;
    const site = lent ? (member.site === 'CLF' ? 'BMT' : 'CLF') : member.site;
    const s = SHIFTS[shift];
    const uid = `${member.id}-${d.toISOString().slice(0, 10)}-${shift}@la-filandiere`;
    events.push(
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTART:${icsDate(d, s.startHour)}`,
      `DTEND:${icsDate(d, s.endHour)}`,
      `SUMMARY:${escapeIcs(s.label + ' — ' + siteName(site))}`,
      `LOCATION:${escapeIcs(siteName(site))}`,
      'END:VEVENT'
    );
  }

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Residence Les Cerisiers//Service Technique//FR',
    'CALSCALE:GREGORIAN',
    ...events,
    'END:VCALENDAR',
  ].join('\r\n');

  return new NextResponse(ics, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="planning-${member.name.replace(/\s+/g, '-')}.ics"`,
    },
  });
}
