import { NextResponse } from 'next/server';
import { createAuthClient } from '@/utils/supabase-server';
import { extractTopics } from '@/lib/feed/topic-extractor';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const supabase = await createAuthClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { post_id, content, post_type } = await request.json();

    if (!post_id || !content) {
      return NextResponse.json({ error: 'Missing post_id or content' }, { status: 400 });
    }

    // Extract topics
    const embedding = await extractTopics(post_id, content, post_type || 'text');

    // Store in content_embeddings
    const { error: insertError } = await supabase
      .from('content_embeddings')
      .upsert({
        post_id: embedding.post_id,
        topics: embedding.topics,
        keywords: embedding.keywords,
        sentiment: embedding.sentiment,
        language: embedding.language,
        computed_at: embedding.computed_at,
      }, { onConflict: 'post_id' });

    if (insertError) {
      console.error('Error storing content embedding:', insertError);
      return NextResponse.json({ error: 'Failed to store embedding' }, { status: 500 });
    }

    // Also compute post features if they don't exist
    try {
      await supabase.rpc('compute_post_features', { p_post_id: post_id });
    } catch { /* ignore */ }

    return NextResponse.json({
      ok: true,
      topics: embedding.topics,
      keywords: embedding.keywords,
    });
  } catch (error) {
    console.error('Error in extract-topics API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
