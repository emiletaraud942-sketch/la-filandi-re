import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Retour du lien « mot de passe oublié » : échange le code contre une session, puis ouvre « Mon compte ».
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) return NextResponse.redirect(`${origin}/compte?nouveau=1`)
  }
  return NextResponse.redirect(`${origin}/login?erreur=lien`)
}
