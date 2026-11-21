import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, FlatList, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SUPPORTED_LANGUAGES, changeLanguage } from '../i18n';

// A simple "Language" row that opens a picker modal. Drop this anywhere (Settings, onboarding...).
// New languages show up here automatically once added to src/shared/i18n/index.js - nothing here
// needs to change.
// variant="row" (default): a full-width "Language: English" row, for Settings-style lists.
// variant="compact": a small pill ("🌐 EN"), for placing in a header/top bar (e.g. Login, Signup).
export const LanguagePicker = ({ variant = 'row' }) => {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const current = SUPPORTED_LANGUAGES.find((l) => l.code === i18n.language) || SUPPORTED_LANGUAGES[0];

  const select = async (code) => {
    setOpen(false);
    if (code === i18n.language) return;
    const needsRestart = await changeLanguage(code);
    if (needsRestart) {
      Alert.alert(t('common.appName'), t('settings.restartNotice'));
    }
  };

  const trigger =
    variant === 'compact' ? (
      <TouchableOpacity style={styles.pill} onPress={() => setOpen(true)} accessibilityLabel={t('settings.language')}>
        <Text style={styles.pillText}>🌐 {current.code.toUpperCase()}</Text>
      </TouchableOpacity>
    ) : (
      <TouchableOpacity style={styles.row} onPress={() => setOpen(true)}>
        <Text style={styles.label}>{t('settings.language')}</Text>
        <Text style={styles.value}>{current.label}</Text>
      </TouchableOpacity>
    );

  return (
    <>
      {trigger}

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => setOpen(false)}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>{t('settings.language')}</Text>
            <FlatList
              data={SUPPORTED_LANGUAGES}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.option} onPress={() => select(item.code)}>
                  <Text style={styles.optionText}>{item.label}</Text>
                  {item.code === i18n.language ? <Text style={styles.check}>✓</Text> : null}
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#DCE7F5',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  label: { fontSize: 15, color: '#102A56', fontWeight: '600' },
  value: { fontSize: 15, color: '#64748B' },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  pillIcon: { fontSize: 14 },
  pillText: { fontSize: 13, color: '#fff', fontWeight: '600' },
  pill: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  pillText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: '60%', paddingBottom: 24 },
  sheetTitle: { fontSize: 17, fontWeight: '700', color: '#102A56', padding: 16 },
  option: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#EFEFEF',
  },
  optionText: { fontSize: 16, color: '#102A56' },
  check: { fontSize: 16, color: '#14B8A6', fontWeight: '700' },
});
