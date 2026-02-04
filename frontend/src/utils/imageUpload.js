import imageCompression from 'browser-image-compression';
import { supabase } from '../config/supabase.js';

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const STORAGE_BUCKET = 'question-images';

/**
 * Compress and upload image directly to Supabase Storage
 * @param {File} file - Image file to upload
 * @param {string} quizId - Quiz ID for path organization
 * @returns {Promise<string>} Public URL of uploaded image
 */
export async function uploadQuestionImage(file, quizId) {
  // Validate file size before compression
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`Image size exceeds 2MB limit. Current size: ${(file.size / 1024 / 1024).toFixed(2)}MB`);
  }

  // Validate file type
  if (!file.type.startsWith('image/')) {
    throw new Error('File must be an image');
  }

  // Compress image
  const options = {
    maxSizeMB: 2,
    maxWidthOrHeight: 1920,
    useWebWorker: true,
    fileType: file.type,
  };

  let compressedFile;
  try {
    compressedFile = await imageCompression(file, options);
  } catch (error) {
    throw new Error(`Failed to compress image: ${error.message}`);
  }

  // Generate unique filename
  const fileExt = file.name.split('.').pop() || 'jpg';
  const fileName = `${quizId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

  // Upload to Supabase Storage
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(fileName, compressedFile, {
      contentType: compressedFile.type,
      upsert: false,
    });

  if (error) {
    throw new Error(`Upload failed: ${error.message}`);
  }

  // Get public URL
  const { data: urlData } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(data.path);
  
  if (!urlData?.publicUrl) {
    throw new Error('Failed to get public URL');
  }

  return urlData.publicUrl;
}
