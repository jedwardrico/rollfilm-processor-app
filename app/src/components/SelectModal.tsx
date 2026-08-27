import { FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View, StyleProp, ViewStyle } from 'react-native';
import { useState } from 'react';

interface Option {
  label: string;
  value: string;
}

interface Props {
  visible: boolean;
  title: string;
  options: Option[];
  selected?: string;
  allowCustom?: boolean;
  onSelect: (value: string) => void;
  onClose: () => void;
}

export function SelectModal({ visible, title, options, selected, allowCustom, onSelect, onClose }: Props) {
  const [customText, setCustomText] = useState('');

  function choose(value: string) {
    onSelect(value);
    setCustomText('');
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
        <View style={styles.handle} />
        <Text style={styles.title}>{title}</Text>

        {allowCustom && (
          <View style={styles.customRow}>
            <TextInput
              style={styles.customInput}
              value={customText}
              onChangeText={setCustomText}
              placeholder="Type custom value…"
              placeholderTextColor="#aaa"
            />
            <Pressable
              style={[styles.customBtn, !customText.trim() && styles.customBtnDisabled]}
              onPress={() => customText.trim() && choose(customText.trim())}
              disabled={!customText.trim()}
            >
              <Text style={styles.customBtnText}>Add</Text>
            </Pressable>
          </View>
        )}

        <FlatList
          data={options}
          keyExtractor={o => o.value}
          renderItem={({ item }) => (
            <Pressable
              style={[styles.option, selected === item.value && styles.optionSelected]}
              onPress={() => choose(item.value)}
            >
              <Text style={[styles.optionText, selected === item.value && styles.optionTextSelected]}>
                {item.label}
              </Text>
              {selected === item.value && <Text style={styles.checkmark}>✓</Text>}
            </Pressable>
          )}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={
            <Text style={styles.empty}>
              {allowCustom ? 'No saved values yet — type above to add one.' : 'No options available.'}
            </Text>
          }
        />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// Trigger button that shows current selection
interface TriggerProps {
  label: string;
  value?: string;
  placeholder?: string;
  onPress: () => void;
}

export function SelectTrigger({ label, value, placeholder, onPress }: TriggerProps) {
  return (
    <View style={triggerStyles.field}>
      <Text style={triggerStyles.label}>{label}</Text>
      <Pressable style={triggerStyles.trigger} onPress={onPress}>
        <Text style={[triggerStyles.value, !value && triggerStyles.placeholder]}>
          {value || placeholder || 'Select…'}
        </Text>
        <Text style={triggerStyles.chevron}>›</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 40,
    maxHeight: '75%',
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: '#d1d5db',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 4,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111',
    textAlign: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  customRow: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  customInput: {
    flex: 1,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#111',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  customBtn: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  customBtnDisabled: { opacity: 0.3 },
  customBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
  },
  optionSelected: { backgroundColor: '#f0fdf4' },
  optionText: { flex: 1, fontSize: 15, color: '#111' },
  optionTextSelected: { fontWeight: '600', color: '#059669' },
  checkmark: { color: '#059669', fontSize: 16, fontWeight: '700' },
  separator: { height: 1, backgroundColor: '#f3f4f6', marginHorizontal: 16 },
  empty: { textAlign: 'center', color: '#9ca3af', padding: 24, fontSize: 14 },
});

const triggerStyles = StyleSheet.create({
  field: { gap: 6 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151' },
  trigger: {
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    flexDirection: 'row',
    alignItems: 'center',
  },
  value: { flex: 1, fontSize: 15, color: '#111' },
  placeholder: { color: '#aaa' },
  chevron: { fontSize: 20, color: '#9ca3af', lineHeight: 22 },
});
