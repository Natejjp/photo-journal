import * as FileSystem from 'expo-file-system/legacy';

export const PHOTOS_DIRECTORY = (FileSystem.documentDirectory || '') + 'photos/';
