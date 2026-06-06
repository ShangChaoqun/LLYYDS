import { getSupabase, isSupabaseConfigured } from './supabase';

const BUCKET_NAME = 'images';

/**
 * Upload a base64 image to Supabase Storage
 * Returns the public URL of the uploaded image
 */
export async function uploadImage(base64Data: string, path: string): Promise<string> {
  if (!isSupabaseConfigured()) return base64Data; // fallback to base64

  const supabase = getSupabase();

  // Convert base64 to Blob
  const byteString = atob(base64Data.split(',')[1]);
  const mimeType = base64Data.split(',')[0].split(':')[1].split(';')[0];
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  const blob = new Blob([ab], { type: mimeType });

  // Upload to Storage
  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(path, blob, { upsert: true });

  if (error) {
    console.error('Storage upload error:', error);
    return base64Data; // fallback to base64
  }

  // Get public URL
  const { data } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(path);

  return data.publicUrl;
}

/**
 * Upload a thumbnail (smaller base64 image) to Supabase Storage
 */
export async function uploadThumbnail(base64Data: string, path: string): Promise<string> {
  return uploadImage(base64Data, path);
}

/**
 * Check if a string is a URL (from Storage) or base64 data
 */
export function isStorageUrl(str: string): boolean {
  return str.startsWith('http://') || str.startsWith('https://');
}

/**
 * Get the display URL for an image
 * If it's already a URL, return as-is
 * If it's base64, return as-is (fallback)
 */
export function getImageUrl(photo: string): string {
  return photo; // Works for both URLs and base64
}
