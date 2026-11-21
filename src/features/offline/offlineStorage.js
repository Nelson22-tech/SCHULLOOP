import AsyncStorage from '@react-native-async-storage/async-storage';

export const OFFLINE_KEYS = {
  schools: 'offline.schools',
  favorites: 'offline.favorites',
  queue: 'offlineMutationQueue',
};

export async function saveOffline(key, value) {
  await AsyncStorage.setItem(key, JSON.stringify({ savedAt: Date.now(), value }));
}

export async function readOffline(key, maxAgeMs = 7 * 24 * 60 * 60 * 1000) {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return null;
  const parsed = JSON.parse(raw);
  if (Date.now() - parsed.savedAt > maxAgeMs) return null;
  return parsed.value;
}
