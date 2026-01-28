import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface PhotoTagProps {
  tag: string;
  onRemove?: (tag: string) => void;
  variant?: 'default' | 'compact';
}

export function PhotoTag({ tag, onRemove, variant = 'default' }: PhotoTagProps) {
  if (variant === 'compact') {
    return (
      <View style={styles.compactTag}>
        <Text style={styles.compactTagText}>{tag}</Text>
      </View>
    );
  }

  return (
    <TouchableOpacity
      style={styles.tag}
      onPress={() => onRemove?.(tag)}
      disabled={!onRemove}
    >
      <Text style={styles.tagText}>{tag}</Text>
      {onRemove && <Text style={styles.tagRemove}> ✕</Text>}
    </TouchableOpacity>
  );
}

interface PhotoTagsContainerProps {
  tags: string[];
  onRemove?: (tag: string) => void;
  variant?: 'default' | 'compact';
}

export function PhotoTagsContainer({ tags, onRemove, variant = 'default' }: PhotoTagsContainerProps) {
  if (tags.length === 0) return null;

  return (
    <View style={styles.container}>
      {tags.map((tag, index) => (
        <PhotoTag key={index} tag={tag} onRemove={onRemove} variant={variant} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
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
  compactTag: {
    backgroundColor: '#E8F4FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  compactTagText: {
    color: '#007AFF',
    fontSize: 11,
    fontWeight: '500',
  },
});
