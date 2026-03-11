import { NextRequest, NextResponse } from 'next/server';
import { createAuthClient } from '@/utils/supabase-server';

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const ALLOWED_DECK_TYPES = ['application/pdf'];
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_DECK_SIZE = 20 * 1024 * 1024; // 20MB

type UploadType = 'logo' | 'banner' | 'pitch-deck';

export async function POST(req: NextRequest) {
  try {
    const authClient = await createAuthClient();
    const { data: { user } } = await authClient.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const type = formData.get('type') as UploadType | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    if (!type || !['logo', 'banner', 'pitch-deck'].includes(type)) {
      return NextResponse.json({ error: 'Invalid upload type' }, { status: 400 });
    }

    const isDeck = type === 'pitch-deck';
    const allowedTypes = isDeck ? ALLOWED_DECK_TYPES : ALLOWED_IMAGE_TYPES;
    const maxSize = isDeck ? MAX_DECK_SIZE : MAX_IMAGE_SIZE;

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: isDeck ? 'Only PDF files are supported' : 'Only JPEG, PNG, WebP, and GIF images are supported' },
        { status: 400 }
      );
    }

    if (file.size > maxSize) {
      return NextResponse.json(
        { error: `File too large. Max ${isDeck ? '20MB' : '5MB'}.` },
        { status: 400 }
      );
    }

    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const fileName = `${Date.now()}-${safeName}`;
    // Path: {userId}/{category}/{file} — userId always first for consistent storage policies
    const category = isDeck ? 'pitch-decks' : `startup-${type}`;
    const filePath = `${user.id}/${category}/${fileName}`;

    const buffer = Buffer.from(await file.arrayBuffer());

    // Use the auth client for storage — requires proper storage policies
    const { error: uploadError } = await authClient.storage
      .from('media')
      .upload(filePath, buffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: true,
      });

    if (uploadError) {
      console.error(`Startup ${type} upload error:`, JSON.stringify(uploadError, null, 2));
      return NextResponse.json({ error: uploadError.message || `Failed to upload ${type}` }, { status: 500 });
    }

    const { data: { publicUrl } } = authClient.storage
      .from('media')
      .getPublicUrl(filePath);

    return NextResponse.json({ url: publicUrl });
  } catch (error) {
    console.error('Startup upload error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
