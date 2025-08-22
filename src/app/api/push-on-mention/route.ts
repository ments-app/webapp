import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { postId, mentionerId, mentionedUserId } = await request.json();

    if (!postId || !mentionerId || !mentionedUserId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get Supabase service role key for authentication
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseServiceKey) {
      console.error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    console.log(`[push-on-mention] Sending notification: postId=${postId}, mentionerId=${mentionerId}, mentionedUserId=${mentionedUserId}`);

    // Call the Supabase Edge Function to send push notification with proper auth
    const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/push-on-mention`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({
        postId,
        mentionerId,
        mentionedUserId
      })
    });

    console.log(`[push-on-mention] Edge function response status: ${response.status}`);
    console.log(`[push-on-mention] Edge function response headers:`, Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      let errorData;
      const responseText = await response.text();
      console.log(`[push-on-mention] Error response text:`, responseText);
      
      try {
        errorData = JSON.parse(responseText);
      } catch {
        errorData = { error: responseText || 'Unknown error' };
      }
      
      console.error(`[push-on-mention] Edge function failed:`, errorData);
      return NextResponse.json(
        { 
          error: errorData.error || 'Failed to send notification',
          details: errorData,
          status: response.status
        },
        { status: response.status }
      );
    }

    let data;
    const responseText = await response.text();
    try {
      data = JSON.parse(responseText);
    } catch {
      data = { success: true, response: responseText };
    }
    
    console.log(`[push-on-mention] Success:`, data);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in push-on-mention:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}