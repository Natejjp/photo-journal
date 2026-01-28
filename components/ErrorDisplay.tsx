import { AppError } from '@/hooks/useErrorHandler';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface ErrorDisplayProps {
  error: AppError | null;
  onDismiss?: () => void;
  variant?: 'banner' | 'fullscreen';
  showDetails?: boolean;
}

export default function ErrorDisplay({ 
  error, 
  onDismiss, 
  variant = 'banner',
  showDetails = false 
}: ErrorDisplayProps) {
  if (!error) return null;

  if (variant === 'fullscreen') {
    return (
      <View style={styles.fullscreenContainer}>
        <View style={styles.fullscreenContent}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.fullscreenTitle}>Something went wrong</Text>
          <Text style={styles.fullscreenMessage}>{error.message}</Text>
          {showDetails && error.details && (
            <Text style={styles.errorDetails}>{error.details}</Text>
          )}
          {onDismiss && (
            <TouchableOpacity style={styles.dismissButton} onPress={onDismiss}>
              <Text style={styles.dismissButtonText}>Dismiss</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.bannerContainer}>
      <View style={styles.bannerContent}>
        <Text style={styles.bannerIcon}>⚠️</Text>
        <View style={styles.bannerTextContainer}>
          <Text style={styles.bannerMessage}>{error.message}</Text>
          {showDetails && error.code && (
            <Text style={styles.errorCode}>Code: {error.code}</Text>
          )}
        </View>
        {onDismiss && (
          <TouchableOpacity onPress={onDismiss} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bannerContainer: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 8,
  },
  bannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bannerIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  bannerTextContainer: {
    flex: 1,
  },
  bannerMessage: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  errorCode: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    marginTop: 2,
  },
  closeButton: {
    padding: 4,
    marginLeft: 8,
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  fullscreenContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#fff',
  },
  fullscreenContent: {
    alignItems: 'center',
    maxWidth: 300,
  },
  errorIcon: {
    fontSize: 64,
    marginBottom: 24,
  },
  fullscreenTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 12,
    textAlign: 'center',
  },
  fullscreenMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  errorDetails: {
    fontSize: 12,
    color: '#999',
    fontFamily: 'monospace',
    textAlign: 'left',
    marginBottom: 24,
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    width: '100%',
  },
  dismissButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  dismissButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
