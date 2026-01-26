import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRef, useState, useEffect } from 'react';
import { Button, StyleSheet, Text, TouchableOpacity, View, ScrollView, Image, Alert } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';

interface PhotoEntry {
  uri: string;
  timestamp: number;
  date: string;
  filename: string;
}

export default function CameraScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [photos, setPhotos] = useState<PhotoEntry[]>([]);
  const [showCamera, setShowCamera] = useState(true);
  const cameraRef = useRef<CameraView>(null);

  // Directory where we'll save photos permanently
  const photosDirectory = (FileSystem.documentDirectory || '') + 'photos/'; 
  
  // Load saved photos when app starts
  useEffect(() => {
    loadPhotos();
  }, []);

  const loadPhotos = async () => {
    try {
      // Create photos directory if it doesn't exist
      const dirInfo = await FileSystem.getInfoAsync(photosDirectory);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(photosDirectory, { intermediates: true });
      }

      // Read all photos from directory
      const files = await FileSystem.readDirectoryAsync(photosDirectory);
      
      // Load photo metadata
      const photoEntries: PhotoEntry[] = [];
      for (const filename of files) {
        if (filename.endsWith('.jpg')) {
          const uri = photosDirectory + filename;
          const info = await FileSystem.getInfoAsync(uri);

          // Type guard to check if file exists and has modificationTime
          const timestamp = info.exists && 'modificationTime' in info 
            ? info.modificationTime || Date.now()
            : Date.now();

          photoEntries.push({
            uri,
            timestamp,
            date: new Date(timestamp).toLocaleString(),
            filename
          });
          
        }
      }

      // Sort by newest first
      photoEntries.sort((a, b) => b.timestamp - a.timestamp);
      setPhotos(photoEntries);
    } catch (error) {
      console.error('Error loading photos:', error);
    }
  };

  const takePhoto = async () => {
    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync();
        if (photo) {
          // Generate filename with timestamp
          const timestamp = Date.now();
          const filename = `photo_${timestamp}.jpg`;
          const newUri = photosDirectory + filename;

          // Copy from temp cache to permanent storage
          await FileSystem.copyAsync({
            from: photo.uri,
            to: newUri
          });

          console.log('Photo saved permanently:', newUri);

          // Add to photos list
          const newPhoto: PhotoEntry = {
            uri: newUri,
            timestamp,
            date: new Date(timestamp).toLocaleString(),
            filename
          };

          setPhotos([newPhoto, ...photos]);
          
          // Show confirmation
          Alert.alert('Success', 'Photo saved!');
        }
      } catch (error) {
        console.error('Error taking photo:', error);
        Alert.alert('Error', 'Failed to save photo');
      }
    }
  };

  const deletePhoto = async (photo: PhotoEntry) => {
    Alert.alert(
      'Delete Photo',
      'Are you sure you want to delete this photo?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await FileSystem.deleteAsync(photo.uri);
              setPhotos(photos.filter(p => p.uri !== photo.uri));
            } catch (error) {
              console.error('Error deleting photo:', error);
            }
          }
        }
      ]
    );
  };

  if (!permission) {
    return <View />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>We need your permission to use the camera</Text>
        <Button onPress={requestPermission} title="Grant Permission" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {showCamera ? (
        <View style={styles.camera}>
            <CameraView 
              style={StyleSheet.absoluteFill} 
              ref={cameraRef}
            />
            <View style={styles.cameraControls}>
              <TouchableOpacity 
                style={styles.toggleButton} 
                onPress={() => setShowCamera(false)}
              >
                <Text style={styles.toggleButtonText}>View Photos ({photos.length})</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.captureButton} onPress={takePhoto}>
                <View style={styles.captureButtonInner} />
              </TouchableOpacity>
            </View>
          </View>
      ) : (
        <View style={styles.photosContainer}>
          <View style={styles.header}>
            <Text style={styles.headerText}>My Photo Journal ({photos.length})</Text>
            <TouchableOpacity onPress={() => setShowCamera(true)}>
              <Text style={styles.backButton}>Back to Camera</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.photosList}>
            {photos.length === 0 ? (
              <Text style={styles.emptyText}>No photos yet. Take your first photo!</Text>
            ) : (
              photos.map((photo, index) => (
                <View key={photo.uri} style={styles.photoItem}>
                  <Image source={{ uri: photo.uri }} style={styles.thumbnail} />
                  <View style={styles.photoInfo}>
                    <Text style={styles.photoDate}>{photo.date}</Text>
                    <Text style={styles.photoFilename}>{photo.filename}</Text>
                  </View>
                  <TouchableOpacity 
                    onPress={() => deletePhoto(photo)}
                    style={styles.deleteButton}
                  >
                    <Text style={styles.deleteButtonText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  message: {
    textAlign: 'center',
    paddingBottom: 10,
    color: '#fff',
  },
  camera: {
    flex: 1,
  },
  cameraControls: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'space-between',
    padding: 20,
  },
  toggleButton: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 12,
    borderRadius: 8,
    marginTop: 40,
  },
  toggleButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  captureButton: {
    alignSelf: 'center',
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#fff',
  },
  photosContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 60,
    backgroundColor: '#f8f8f8',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  headerText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  backButton: {
    color: '#007AFF',
    fontSize: 16,
  },
  photosList: {
    flex: 1,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 50,
    fontSize: 16,
    color: '#999',
  },
  photoItem: {
    flexDirection: 'row',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    alignItems: 'center',
  },
  thumbnail: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  photoInfo: {
    flex: 1,
    marginLeft: 12,
  },
  photoDate: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  photoFilename: {
    fontSize: 12,
    color: '#666',
  },
  deleteButton: {
    padding: 8,
  },
  deleteButtonText: {
    color: '#FF3B30',
    fontSize: 14,
    fontWeight: '600',
  },
});