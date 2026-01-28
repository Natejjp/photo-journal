import ErrorToast from '@/components/ErrorToast';
import { PhotoTagsContainer } from '@/components/PhotoTag';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { deletePhoto as deletePhotoService, loadAllPhotos, savePhoto } from '@/services/photoService';
import { PhotoEntry } from '@/types';
import { isPhotoFromToday } from '@/utils/dateUtils';
import { ErrorMessages } from '@/utils/errorMessages';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useEffect, useRef, useState } from 'react';
import {
    Alert,
    Button,
    Image,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

export default function CameraScreen() {
  const { error, clearError, executeWithErrorHandling } = useErrorHandler();
  const [permission, requestPermission] = useCameraPermissions();
  const [photos, setPhotos] = useState<PhotoEntry[]>([]);
  const [showCamera, setShowCamera] = useState(true);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [tagInput, setTagInput] = useState('');
  const [currentTags, setCurrentTags] = useState<string[]>([]);
  const [noteText, setNoteText] = useState('');
  const cameraRef = useRef<CameraView>(null);

  // Load saved photos when app starts
  useEffect(() => {
    loadPhotos();
  }, []);

  const loadPhotos = async () => {
    await executeWithErrorHandling(
      async () => {
        const photoEntries = await loadAllPhotos();
        setPhotos(photoEntries);
      },
      {
        defaultErrorMessage: ErrorMessages.LOAD_PHOTOS_FAILED,
      }
    );
  };

  const takePhoto = async () => {
    if (cameraRef.current) {
      await executeWithErrorHandling(
        async () => {
          const photo = await cameraRef.current!.takePictureAsync();
          if (photo) {
            setCapturedPhoto(photo.uri);
            setCurrentTags([]);
            setTagInput('');
            setNoteText('');
          }
        },
        {
          defaultErrorMessage: ErrorMessages.TAKE_PHOTO_FAILED,
        }
      );
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

  const savePhotoHandler = async () => {
    if (!capturedPhoto) return;

    const result = await executeWithErrorHandling(
      async () => {
        return await savePhoto(
          capturedPhoto,
          currentTags.length > 0 ? currentTags : undefined,
          noteText.trim() || undefined
        );
      },
      {
        defaultErrorMessage: ErrorMessages.SAVE_PHOTO_FAILED,
        onSuccess: (newPhoto) => {
          setPhotos([newPhoto, ...photos]);
          
          // Reset state
          setCapturedPhoto(null);
          setCurrentTags([]);
          setTagInput('');
          setNoteText('');
          
          Alert.alert('Success', 'Photo saved!');
        },
      }
    );
  };

  const retakePhoto = () => {
    setCapturedPhoto(null);
    setCurrentTags([]);
    setTagInput('');
    setNoteText('');
  };

  const deletePhotoHandler = async (photo: PhotoEntry) => {
    Alert.alert(
      'Delete Photo',
      'Are you sure you want to delete this photo?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await executeWithErrorHandling(
              async () => {
                await deletePhotoService(photo.uri);
                setPhotos(photos.filter(p => p.uri !== photo.uri));
              },
              {
                defaultErrorMessage: ErrorMessages.DELETE_PHOTO_FAILED,
              }
            );
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
                  <PhotoTagsContainer tags={currentTags} onRemove={removeTag} />
                )}
              </View>
            </ScrollView>

            <View style={styles.previewButtons}>
              <TouchableOpacity style={styles.retakeButton} onPress={retakePhoto}>
                <Text style={styles.retakeButtonText}>Retake</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={savePhotoHandler}>
                <Text style={styles.saveButtonText}>Save Photo</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    );
  }

  // Filter photos for today
  const todaysPhotos = photos.filter(photo => isPhotoFromToday(photo.timestamp));

  return (
    <View style={styles.container}>
      <ErrorToast error={error} onDismiss={clearError} />
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
            {todaysPhotos.length === 0 ? (
              <Text style={styles.emptyText}>No photos taken today. Take your first one!</Text>
            ) : (
              todaysPhotos.map((photo) => (
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
                      <PhotoTagsContainer tags={photo.tags} variant="compact" />
                    )}
                  </View>
                  <TouchableOpacity 
                    onPress={() => deletePhotoHandler(photo)}
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
  deleteButton: {
    padding: 8,
  },
  deleteButtonText: {
    color: '#FF3B30',
    fontSize: 14,
    fontWeight: '600',
  },
});
