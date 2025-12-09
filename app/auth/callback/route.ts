import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const origin = requestUrl.origin;

  if (code) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          persistSession: false,
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (error) {
      console.error('Error exchanging code for session:', error);
      // Still redirect to account, they can sign in again if needed
      return NextResponse.redirect(new URL('/account', origin));
    }
  }

  // Redirect to account page after OAuth callback
  return NextResponse.redirect(new URL('/account', origin));
}
