import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, RefreshControl } from 'react-native';
import { Calendar, DateData } from 'react-native-calendars';
import { useFocusEffect } from '@react-navigation/native';
import * as FileSystem from 'expo-file-system/legacy';
import PhotoViewer from './PhotoViewer';

interface PhotoEntry {
  uri: string;
  timestamp: number;
  date: string;
  filename: string;
  dateString: string; // YYYY-MM-DD format
  tags?: string[];
  note?: string;
}

export default function CalendarScreen() {
  const [photos, setPhotos] = useState<PhotoEntry[]>([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [markedDates, setMarkedDates] = useState<any>({});
  const [refreshing, setRefreshing] = useState(false);
  const [viewerVisible, setViewerVisible] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoEntry | null>(null);
  
  const photosDirectory = (FileSystem.documentDirectory || '') + 'photos/';

  // Auto-refresh when tab is focused
  useFocusEffect(
    useCallback(() => {
      console.log('Calendar tab focused - loading photos...');
      loadPhotos();
    }, [])
  );

  const loadPhotos = async () => {
    try {
      setRefreshing(true);
      console.log('Loading photos from:', photosDirectory);
      
      const dirInfo = await FileSystem.getInfoAsync(photosDirectory);
      if (!dirInfo.exists) {
        console.log('Photos directory does not exist, creating...');
        await FileSystem.makeDirectoryAsync(photosDirectory, { intermediates: true });
      }

      const files = await FileSystem.readDirectoryAsync(photosDirectory);
      console.log('Found files:', files);
      
      const photoEntries: PhotoEntry[] = [];
      const dates: any = {};

      for (const filename of files) {
        if (filename.endsWith('.jpg')) {
          const uri = photosDirectory + filename;
          const info = await FileSystem.getInfoAsync(uri);
          // File system returns timestamp in SECONDS, convert to MILLISECONDS
          const timestamp = info.exists && 'modificationTime' in info 
            ? (info.modificationTime || Date.now()) * 1000
            : Date.now();

          const dateObj = new Date(timestamp);
          // Use local date without timezone conversion
          const year = dateObj.getFullYear();
          const month = String(dateObj.getMonth() + 1).padStart(2, '0');
          const day = String(dateObj.getDate()).padStart(2, '0');
          const dateString = `${year}-${month}-${day}`; // YYYY-MM-DD

          console.log(`Photo: ${filename}, Date: ${dateString}, Timestamp: ${timestamp}`);

          // Try to load tags and note from metadata file
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
            date: dateObj.toLocaleString(),
            filename,
            dateString,
            tags,
            note
          });

          // Mark dates that have photos
          if (!dates[dateString]) {
            dates[dateString] = { marked: true, dotColor: '#007AFF' };
          }
        }
      }

      console.log('Total photos loaded:', photoEntries.length);
      console.log('Marked dates:', Object.keys(dates));

      photoEntries.sort((a, b) => b.timestamp - a.timestamp);
      setPhotos(photoEntries);
      setMarkedDates(dates);
      setRefreshing(false);
    } catch (error) {
      console.error('Error loading photos:', error);
      setRefreshing(false);
    }
  };

  const onDayPress = (day: DateData) => {
    console.log('Selected date:', day.dateString);
    setSelectedDate(day.dateString);
  };

  const openPhotoViewer = (photo: PhotoEntry) => {
    setSelectedPhoto(photo);
    setViewerVisible(true);
  };

  // Filter photos for selected date
  const photosForSelectedDate = photos.filter(photo => {
    return photo.dateString === selectedDate;
  });

  console.log(`Photos for ${selectedDate}:`, photosForSelectedDate.length);

  // Format selected date for display
  const formatSelectedDate = (dateString: string) => {
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Photo Journal</Text>
        <Text style={styles.headerSubtitle}>
          {photos.length} {photos.length === 1 ? 'entry' : 'entries'}
        </Text>
      </View>

      <Calendar
        markedDates={{
          ...markedDates,
          [selectedDate]: {
            ...markedDates[selectedDate],
            selected: true,
            selectedColor: '#007AFF'
          }
        }}
        onDayPress={onDayPress}
        theme={{
          backgroundColor: '#ffffff',
          calendarBackground: '#ffffff',
          textSectionTitleColor: '#b6c1cd',
          selectedDayBackgroundColor: '#007AFF',
          selectedDayTextColor: '#ffffff',
          todayTextColor: '#007AFF',
          dayTextColor: '#2d4150',
          textDisabledColor: '#d9e1e8',
          dotColor: '#007AFF',
          selectedDotColor: '#ffffff',
          arrowColor: '#007AFF',
          monthTextColor: '#2d4150',
          indicatorColor: '#007AFF',
          textDayFontFamily: 'System',
          textMonthFontFamily: 'System',
          textDayHeaderFontFamily: 'System',
          textDayFontWeight: '400',
          textMonthFontWeight: 'bold',
          textDayHeaderFontWeight: '600',
          textDayFontSize: 16,
          textMonthFontSize: 18,
          textDayHeaderFontSize: 14
        }}
      />

      <View style={styles.photosSection}>
        {selectedDate ? (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                {formatSelectedDate(selectedDate)}
              </Text>
              <TouchableOpacity onPress={loadPhotos} style={styles.refreshButton}>
                <Text style={styles.refreshText}>Refresh</Text>
              </TouchableOpacity>
            </View>
            <ScrollView 
              style={styles.photosList}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={loadPhotos} />
              }
            >
              {photosForSelectedDate.length === 0 ? (
                <Text style={styles.emptyText}>No photos for this date</Text>
              ) : (
                photosForSelectedDate.map((photo) => (
                  <TouchableOpacity 
                    key={photo.uri} 
                    style={styles.photoItem}
                    onPress={() => openPhotoViewer(photo)}
                    activeOpacity={0.7}
                  >
                    <Image source={{ uri: photo.uri }} style={styles.photoPreview} />
                    <View style={styles.photoDetails}>
                      <Text style={styles.photoTime}>
                        {new Date(photo.timestamp).toLocaleTimeString('en-US', {
                          hour: 'numeric',
                          minute: '2-digit',
                          hour12: true
                        })}
                      </Text>
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
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>Select a date to view photos</Text>
            <Text style={styles.emptyStateSubtext}>
              Dates with dots have photo entries
            </Text>
          </View>
        )}
        {selectedPhoto && (
          <PhotoViewer
            visible={viewerVisible}
            photoUri={selectedPhoto.uri}
            date={selectedPhoto.date}
            onClose={() => setViewerVisible(false)}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#fff',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  photosSection: {
    flex: 1,
    backgroundColor: '#fff',
    marginTop: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f9f9f9',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
  },
  refreshButton: {
    padding: 8,
  },
  refreshText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
  },
  photosList: {
    flex: 1,
  },
  photoItem: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    alignItems: 'center',
  },
  photoPreview: {
    width: 100,
    height: 100,
    borderRadius: 12,
  },
  photoDetails: {
    marginLeft: 16,
    flex: 1,
  },
  photoTime: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  photoNote: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
    lineHeight: 18,
  },
  photoTagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
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
  emptyText: {
    textAlign: 'center',
    marginTop: 40,
    fontSize: 16,
    color: '#999',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyStateText: {
    fontSize: 18,
    color: '#666',
    fontWeight: '500',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#999',
  },
});