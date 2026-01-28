import { PhotoTagsContainer } from '@/components/PhotoTag';
import PhotoViewer from '@/components/PhotoViewer';
import { loadAllPhotos } from '@/services/photoService';
import { PhotoEntry } from '@/types';
import { formatDateString } from '@/utils/dateUtils';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { Image, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Calendar, DateData } from 'react-native-calendars';

export default function CalendarScreen() {
  const [photos, setPhotos] = useState<PhotoEntry[]>([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [markedDates, setMarkedDates] = useState<Record<string, any>>({});
  const [refreshing, setRefreshing] = useState(false);
  const [viewerVisible, setViewerVisible] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoEntry | null>(null);

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
      const photoEntries = await loadAllPhotos();
      
      // Build marked dates object
      const dates: Record<string, any> = {};
      photoEntries.forEach(photo => {
        if (!dates[photo.dateString]) {
          dates[photo.dateString] = { marked: true, dotColor: '#007AFF' };
        }
      });

      console.log('Total photos loaded:', photoEntries.length);
      console.log('Marked dates:', Object.keys(dates));

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
                {formatDateString(selectedDate)}
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
                        <PhotoTagsContainer tags={photo.tags} variant="compact" />
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
