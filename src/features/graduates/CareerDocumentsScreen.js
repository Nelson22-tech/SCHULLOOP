import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { BlueHeader, Btn, C, Card, IconTile } from '../../shared/ui/kit';
import apiService from '../../shared/services/apiService';

export const CareerDocumentsScreen = ({ navigation }) => {
  const [docs, setDocs] = useState([]);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try { setDocs((await apiService.getCareerDocuments()).documents || []); }
    catch (e) { Alert.alert('Documents', e.message); }
  };
  useEffect(() => { load(); }, []);

  const add = async () => {
    try {
      const r = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/*'], copyToCacheDirectory: true });
      if (r.canceled) return;
      const f = r.assets[0];
      setBusy(true);
      const uploaded = await apiService.uploadFile(f.uri, f.name, f.mimeType || 'application/octet-stream');
      await apiService.createCareerDocument({ title: f.name, category: 'certificate', url: uploaded.url, mimeType: f.mimeType, sizeBytes: f.size || 0, visibility: 'employers' });
      await load();
    } catch (e) { Alert.alert('Upload failed', e.message); }
    finally { setBusy(false); }
  };

  const remove = async id => { await apiService.deleteCareerDocument(id); load(); };

  return (
    <View style={s.container}>
      <BlueHeader title="Career Documents" subtitle="Certificates, CVs and transcripts" onBack={navigation?.canGoBack?.() ? () => navigation.goBack() : undefined} />
      <ScrollView contentContainerStyle={s.content}>
        <Btn title={busy ? 'Uploading...' : 'Add document'} icon="cloud-upload-outline" onPress={add} disabled={busy} style={s.add} />
        {docs.map(item => (
          <Card key={String(item._id)}>
            <View style={s.row}>
              <IconTile name="document-text-outline" />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={s.title} numberOfLines={2}>{item.title}</Text>
                <Text style={s.meta}>{item.category} • {item.visibility}</Text>
              </View>
            </View>
            <Btn title="Delete" variant="outline" icon="trash-outline" style={s.del} onPress={() => remove(item._id)} />
          </Card>
        ))}
        {!docs.length ? (
          <View style={s.empty}>
            <Ionicons name="folder-open-outline" size={40} color={C.blueLine} />
            <Text style={s.emptyText}>No career documents yet.</Text>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  content: { paddingTop: 16, paddingBottom: 40 },
  add: { marginHorizontal: 16, marginBottom: 14 },
  row: { flexDirection: 'row', alignItems: 'center' },
  title: { fontWeight: '800', fontSize: 15, color: C.text },
  meta: { color: C.muted, fontSize: 12, marginTop: 3 },
  del: { marginTop: 12, paddingVertical: 9 },
  empty: { alignItems: 'center', marginTop: 40 },
  emptyText: { color: C.muted, marginTop: 8 },
});
