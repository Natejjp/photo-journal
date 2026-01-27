import { Modal, View, Image, StyleSheet, TouchableOpacity, Text, Dimensions } from 'react-native';

interface PhotoViewerProps {
  visible: boolean;
  photoUri: string;
  date: string;
  onClose: () => void;
}

const { width, height } = Dimensions.get('window');

export default function PhotoViewer({ visible, photoUri, date, onClose }: PhotoViewerProps) {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Close button */}
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Text style={styles.closeText}>✕</Text>
        </TouchableOpacity>

        {/* Photo */}
        <Image
          source={{ uri: photoUri }}
          style={styles.photo}
          resizeMode="contain"
        />

        {/* Date info */}
        <View style={styles.infoBar}>
          <Text style={styles.dateText}>{date}</Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeText: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '300',
  },
  photo: {
    width: width,
    height: height,
  },
  infoBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 20,
    paddingBottom: 40,
  },
  dateText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
  },
});