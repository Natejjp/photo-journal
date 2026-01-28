import { PHOTOS_DIRECTORY } from '@/constants/photos';
import { PhotoEntry, PhotoMetadata } from '@/types';
import { timestampToDateString } from '@/utils/dateUtils';
import * as FileSystem from 'expo-file-system/legacy';

/**
 * Ensures the photos directory exists
 */
export async function ensurePhotosDirectory(): Promise<void> {
  const dirInfo = await FileSystem.getInfoAsync(PHOTOS_DIRECTORY);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(PHOTOS_DIRECTORY, { intermediates: true });
  }
}

/**
 * Loads metadata for a photo from its JSON file
 */
export async function loadPhotoMetadata(filename: string): Promise<PhotoMetadata> {
  const metadataFile = PHOTOS_DIRECTORY + filename.replace('.jpg', '.json');
  try {
    const metadataInfo = await FileSystem.getInfoAsync(metadataFile);
    if (metadataInfo.exists) {
      const metadataContent = await FileSystem.readAsStringAsync(metadataFile);
      return JSON.parse(metadataContent);
    }
  } catch (e) {
    // No metadata file, that's ok
  }
  return {};
}

/**
 * Saves metadata for a photo to its JSON file
 */
export async function savePhotoMetadata(
  filename: string,
  metadata: PhotoMetadata
): Promise<void> {
  if (metadata.tags?.length === 0 && !metadata.note?.trim()) {
    return; // Don't create empty metadata files
  }

  const metadataFile = PHOTOS_DIRECTORY + filename.replace('.jpg', '.json');
  await FileSystem.writeAsStringAsync(metadataFile, JSON.stringify(metadata));
}

/**
 * Deletes a photo and its metadata file
 */
export async function deletePhoto(photoUri: string): Promise<void> {
  await FileSystem.deleteAsync(photoUri);
  
  // Also delete metadata file if it exists
  const metadataFile = photoUri.replace('.jpg', '.json');
  try {
    await FileSystem.deleteAsync(metadataFile);
  } catch (e) {
    // Metadata file might not exist
  }
}

/**
 * Loads all photos from the photos directory
 */
export async function loadAllPhotos(): Promise<PhotoEntry[]> {
  await ensurePhotosDirectory();
  
  const files = await FileSystem.readDirectoryAsync(PHOTOS_DIRECTORY);
  const photoEntries: PhotoEntry[] = [];

  for (const filename of files) {
    if (filename.endsWith('.jpg')) {
      const uri = PHOTOS_DIRECTORY + filename;
      const info = await FileSystem.getInfoAsync(uri);
      
      // File system returns timestamp in SECONDS, convert to MILLISECONDS
      const timestamp = info.exists && 'modificationTime' in info 
        ? (info.modificationTime || Date.now()) * 1000
        : Date.now();

      const dateString = timestampToDateString(timestamp);
      const metadata = await loadPhotoMetadata(filename);

      photoEntries.push({
        uri,
        timestamp,
        date: new Date(timestamp).toLocaleString(),
        filename,
        dateString,
        tags: metadata.tags,
        note: metadata.note
      });
    }
  }

  // Sort by newest first
  photoEntries.sort((a, b) => b.timestamp - a.timestamp);
  return photoEntries;
}

/**
 * Saves a photo from a temporary URI to permanent storage
 */
export async function savePhoto(
  tempUri: string,
  tags?: string[],
  note?: string
): Promise<PhotoEntry> {
  await ensurePhotosDirectory();
  
  const timestamp = Date.now();
  const filename = `photo_${timestamp}.jpg`;
  const newUri = PHOTOS_DIRECTORY + filename;

  // Copy from temp cache to permanent storage
  await FileSystem.copyAsync({
    from: tempUri,
    to: newUri
  });

  // Save metadata if provided
  if (tags?.length || note?.trim()) {
    await savePhotoMetadata(filename, {
      tags: tags?.length ? tags : undefined,
      note: note?.trim() || undefined
    });
  }

  const dateString = timestampToDateString(timestamp);
  
  return {
    uri: newUri,
    timestamp,
    date: new Date(timestamp).toLocaleString(),
    filename,
    dateString,
    tags: tags?.length ? tags : undefined,
    note: note?.trim() || undefined
  };
}
