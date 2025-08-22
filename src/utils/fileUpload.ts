import { supabase } from './supabase';

type UploadResponse = {
  url: string;
  path: string;
  error?: string;
};

export async function uploadMediaFile(file: File): Promise<UploadResponse> {
  try {
    // First, get a signed URL for the upload
    const fileName = `${Date.now()}-${file.name}`;
    const filePath = `posts/${fileName}`;

    // Get a signed URL for the upload
    const { data: uploadData, error: urlError } = await supabase.functions.invoke('upload-media', {
      body: { 
        path: filePath,
        contentType: file.type,
        action: 'upload'
      }
    });

    if (urlError || !uploadData?.signedUrl) {
      console.error('Error getting signed URL:', urlError || 'No signed URL returned');
      throw new Error('Failed to get upload URL');
    }

    // Upload the file using the signed URL
    const uploadResponse = await fetch(uploadData.signedUrl, {
      method: 'PUT',
      body: file,
      headers: {
        'Content-Type': file.type,
        'x-upsert': 'true',
      },
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error('Upload failed:', uploadResponse.status, errorText);
      throw new Error(`Upload failed: ${uploadResponse.statusText}`);
    }

    // Get the public URL for the uploaded file
    const { data: publicUrlData } = supabase.storage
      .from('posts')
      .getPublicUrl(filePath);

    return {
      url: publicUrlData.publicUrl,
      path: filePath,
    };
  } catch (error) {
    console.error('Error uploading file:', error);
    return {
      url: '',
      path: '',
      error: error instanceof Error ? error.message : 'Failed to upload file',
    };
  }
}

export async function uploadPostImages(files: File[]): Promise<{ urls: string[]; error?: string }> {
  try {
    const uploadPromises = files.map(file => uploadMediaFile(file));
    const results = await Promise.all(uploadPromises);
    
    const errors = results.filter(result => result.error);
    if (errors.length > 0) {
      console.error('Some files failed to upload:', errors);
      return {
        urls: results.filter(r => r.url).map(r => r.url),
        error: `Failed to upload ${errors.length} file(s)`
      };
    }

    return {
      urls: results.map(r => r.url)
    };
  } catch (error) {
    console.error('Error in uploadPostImages:', error);
    return {
      urls: [],
      error: error instanceof Error ? error.message : 'Failed to upload files'
    };
  }
}
