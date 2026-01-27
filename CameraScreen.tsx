import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRef, useState, useEffect } from 'react';
import { 
  Button, 
  StyleSheet, 
  Text, 
  TouchableOpacity, 
  View, 
  ScrollView, 
  Image, 
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';

interface PhotoEntry {
  uri: string;
  timestamp: number;
  date: string;
  filename: string;
  tags?: string[];
  note?: string;
}

export default function CameraScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [photos, setPhotos] = useState<PhotoEntry[]>([]);
  const [showCamera, setShowCamera] = useState(true);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [tagInput, setTagInput] = useState('');
  const [currentTags, setCurrentTags] = useState<string[]>([]);
  const [noteText, setNoteText] = useState('');
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
          
          // File system returns timestamp in SECONDS, convert to MILLISECONDS
          const timestamp = info.exists && 'modificationTime' in info 
            ? (info.modificationTime || Date.now()) * 1000
            : Date.now();

          // Try to load tags from metadata file
          const metadataFile = photosDirectory + filename.replace('.jpg', '.json');
          let tags: string[] = [];
          let note: string | undefined;
          try {
            const metadataInfo = await FileSystem.getInfoAsync(metadataFile);
            if (metadataInfo.exists) {
              const metadataContent = await FileSystem.readAsStringAsync(metadataFile);
              const metadata = JSON.parse(metadataContent);
              tags = metadata.tags || [];
              note = metadata.note;
            }
          } catch (e) {
            // No metadata file, that's ok
          }

          photoEntries.push({
            uri,
            timestamp,
            date: new Date(timestamp).toLocaleString(),
            filename,
            tags,
            note
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
          setCapturedPhoto(photo.uri);
          setCurrentTags([]);
          setTagInput('');
          setNoteText('');
        }
      } catch (error) {
        console.error('Error taking photo:', error);
        Alert.alert('Error', 'Failed to take photo');
      }
    }
  };

  const addTag = () => {
    const tag = tagInput.trim();
    if (tag && !currentTags.includes(tag)) {
      setCurrentTags([...currentTags, tag]);
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setCurrentTags(currentTags.filter(tag => tag !== tagToRemove));
  };

  const savePhoto = async () => {
    if (!capturedPhoto) return;

    try {
      // Generate filename with timestamp
      const timestamp = Date.now();
      const filename = `photo_${timestamp}.jpg`;
      const newUri = photosDirectory + filename;

      // Copy from temp cache to permanent storage
      await FileSystem.copyAsync({
        from: capturedPhoto,
        to: newUri
      });

      // Save metadata (tags and note) as JSON
      if (currentTags.length > 0 || noteText.trim()) {
        const metadataFile = photosDirectory + filename.replace('.jpg', '.json');
        const metadata = { 
          tags: currentTags,
          note: noteText.trim() || undefined
        };
        await FileSystem.writeAsStringAsync(metadataFile, JSON.stringify(metadata));
      }

      console.log('Photo saved permanently:', newUri);

      // Add to photos list
      const newPhoto: PhotoEntry = {
        uri: newUri,
        timestamp,
        date: new Date(timestamp).toLocaleString(),
        filename,
        tags: currentTags.length > 0 ? currentTags : undefined,
        note: noteText.trim() || undefined
      };

      setPhotos([newPhoto, ...photos]);
      
      // Reset state
      setCapturedPhoto(null);
      setCurrentTags([]);
      setNoteText('');
      
      Alert.alert('Success', 'Photo saved!');
    } catch (error) {
      console.error('Error saving photo:', error);
      Alert.alert('Error', 'Failed to save photo');
    }
  };

  const retakePhoto = () => {
    setCapturedPhoto(null);
    setCurrentTags([]);
    setTagInput('');
    setNoteText('');
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
              // Also delete metadata file if it exists
              const metadataFile = photo.uri.replace('.jpg', '.json');
              try {
                await FileSystem.deleteAsync(metadataFile);
              } catch (e) {
                // Metadata file might not exist
              }
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

  // Photo preview and tagging screen
  if (capturedPhoto) {
    return (
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.previewContainer}>
          <Image source={{ uri: capturedPhoto }} style={styles.previewImage} />
          
          <View style={styles.previewOverlay}>
            <ScrollView style={styles.overlayScroll}>
              {/* Note input */}
              <View style={styles.noteSection}>
                <Text style={styles.sectionLabel}>Add a note</Text>
                <TextInput
                  style={styles.noteInput}
                  value={noteText}
                  onChangeText={setNoteText}
                  placeholder="What's happening in this moment?"
                  placeholderTextColor="#999"
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>

              {/* Tags section */}
              <View style={styles.tagsSection}>
                <Text style={styles.sectionLabel}>Add tags (optional)</Text>
                
                <View style={styles.tagInputContainer}>
                  <TextInput
                    style={styles.tagInput}
                    value={tagInput}
                    onChangeText={setTagInput}
                    placeholder="e.g., work, family, travel"
                    placeholderTextColor="#999"
                    onSubmitEditing={addTag}
                    returnKeyType="done"
                  />
                  <TouchableOpacity onPress={addTag} style={styles.addTagButton}>
                    <Text style={styles.addTagText}>Add</Text>
                  </TouchableOpacity>
                </View>

                {currentTags.length > 0 && (
                  <View style={styles.tagsContainer}>
                    {currentTags.map((tag, index) => (
                      <TouchableOpacity
                        key={index}
                        style={styles.tag}
                        onPress={() => removeTag(tag)}
                      >
                        <Text style={styles.tagText}>{tag}</Text>
                        <Text style={styles.tagRemove}> ✕</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            </ScrollView>

            <View style={styles.previewButtons}>
              <TouchableOpacity style={styles.retakeButton} onPress={retakePhoto}>
                <Text style={styles.retakeButtonText}>Retake</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={savePhoto}>
                <Text style={styles.saveButtonText}>Save Photo</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
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
              <Text style={styles.toggleButtonText}>Photos from Today</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.captureButton} onPress={takePhoto}>
              <View style={styles.captureButtonInner} />
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={styles.photosContainer}>
          <View style={styles.header}>
            <Text style={styles.headerText}>Today Photos</Text>
            <TouchableOpacity onPress={() => setShowCamera(true)}>
              <Text style={styles.backButton}>Back to Camera</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.photosList}>
            {photos.length === 0 ? (
              <Text style={styles.emptyText}>No photos yet. Take your first photo!</Text>
            ) : (
              (() => {
                // Filter photos for today
                const today = new Date();
                const todayString = today.toISOString().split('T')[0]; // YYYY-MM-DD
                
                const todaysPhotos = photos.filter(photo => {
                  const photoDate = new Date(photo.timestamp);
                  const photoDateString = photoDate.toISOString().split('T')[0];
                  return photoDateString === todayString;
                });

                if (todaysPhotos.length === 0) {
                  return <Text style={styles.emptyText}>No photos taken today. Take your first one!</Text>;
                }

                return todaysPhotos.map((photo) => (
                <View key={photo.uri} style={styles.photoItem}>
                  <Image source={{ uri: photo.uri }} style={styles.thumbnail} />
                  <View style={styles.photoInfo}>
                    <Text style={styles.photoDate}>{photo.date}</Text>
                    {photo.note && (
                      <Text style={styles.photoNote} numberOfLines={2}>
                        {photo.note}
                      </Text>
                    )}
                    {photo.tags && photo.tags.length > 0 && (
                      <View style={styles.photoTagsContainer}>
                        {photo.tags.map((tag, i) => (
                          <View key={i} style={styles.photoTag}>
                            <Text style={styles.photoTagText}>{tag}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                  <TouchableOpacity 
                    onPress={() => deletePhoto(photo)}
                    style={styles.deleteButton}
                  >
                    <Text style={styles.deleteButtonText}>Delete</Text>
                  </TouchableOpacity>
                </View>
                ));
              })()
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
  previewContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  previewImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  previewOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.9)',
    paddingBottom: 40,
    maxHeight: '50%',
  },
  overlayScroll: {
    maxHeight: 300,
  },
  noteSection: {
    padding: 20,
    paddingBottom: 10,
  },
  sectionLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  noteInput: {
    backgroundColor: '#333',
    color: '#fff',
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
    minHeight: 80,
  },
  tagsSection: {
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  tagsLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  tagInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  tagInput: {
    flex: 1,
    backgroundColor: '#333',
    color: '#fff',
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
    marginRight: 8,
  },
  addTagButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  addTagText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    flexDirection: 'row',
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignItems: 'center',
  },
  tagText: {
    color: '#fff',
    fontSize: 14,
  },
  tagRemove: {
    color: '#fff',
    fontSize: 16,
    marginLeft: 4,
  },
  previewButtons: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
  },
  retakeButton: {
    flex: 1,
    backgroundColor: '#333',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  retakeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
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
  photoNote: {
    fontSize: 13,
    color: '#666',
    marginBottom: 6,
    lineHeight: 18,
  },
  photoTagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  photoTag: {
    backgroundColor: '#E8F4FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  photoTagText: {
    color: '#007AFF',
    fontSize: 11,
    fontWeight: '500',
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