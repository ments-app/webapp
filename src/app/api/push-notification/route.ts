import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Call the Supabase edge function from the server side
    const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/push-on-message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      // 404 = no FCM tokens for the user (they haven't enabled push notifications) — not an error
      if (response.status === 404) {
        return NextResponse.json({ skipped: true, reason: 'No push tokens registered' }, { status: 200 });
      }
      console.error('Push notification edge function error:', error);
      return NextResponse.json({ error: 'Failed to send push notification' }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Push notification error:', error);
    return NextResponse.json({ error: 'Failed to send push notification' }, { status: 500 });
  }
}