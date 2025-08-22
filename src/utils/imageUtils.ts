import { supabase } from './supabase';

/**
 * Fetches a signed URL for an image from Supabase Storage
 * @param imagePath The path to the image in the storage bucket
 * @returns A signed URL for the image or null if there was an error
 */
export async function getImageUrl(imagePath: string | null): Promise<string | null> {
  if (!imagePath) return null;
  
  try {
    // If the path is already a full URL, return it as is
    if (imagePath.startsWith('http')) {
      return imagePath;
    }

    // If it's a storage path, get a signed URL
    const { data, error } = await supabase.storage
      .from('your-bucket-name') // Replace with your bucket name
      .createSignedUrl(imagePath, 3600); // URL expires in 1 hour

    if (error) {
      console.error('Error getting signed URL:', error);
      return null;
    }

    return data.signedUrl;
  } catch (error) {
    console.error('Error in getImageUrl:', error);
    return null;
  }
}

/**
 * Gets a processed image URL from the Supabase function
 * @param imagePath The path to the image
 * @returns Processed image URL or null if there was an error
 */
export async function getProcessedImageUrl(imagePath: string | null): Promise<string | null> {
  if (!imagePath) return null;

  try {
    const response = await fetch('https://lrgwsbslfqiwoazmitre.supabase.co/functions/v1/get-image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({ imagePath })
    });

    if (!response.ok) {
      throw new Error(`Failed to get processed image: ${response.statusText}`);
    }

    const data = await response.json();
    return data.url || null;
  } catch (error) {
    console.error('Error getting processed image URL:', error);
    return null;
  }
}
