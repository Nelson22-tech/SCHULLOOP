// Shared constants and helpers for the Local Services screens.
import { Alert, Platform } from 'react-native';

export const SERVICE_CATEGORIES = ['Plumbing', 'Electrical', 'Cleaning', 'Car Repair', 'Beauty & Salon', 'Handyman', 'Photography', 'Other'];
export const CATEGORY_ICONS = {
  Plumbing: 'water', Electrical: 'flash', Cleaning: 'sparkles', 'Car Repair': 'car-sport',
  'Beauty & Salon': 'cut', Handyman: 'hammer', Photography: 'camera', Other: 'ellipsis-horizontal',
};
export const CONTACT_METHODS = ['In-app message', 'Phone request'];

// SAMPLE data: shown only when the API returns nothing or fails. Never submitted anywhere.
export const SAMPLE_SERVICES = [
  { _id: 'sample-1', sample: true, providerName: 'BrightFix Plumbing', title: 'Plumber', category: 'Plumbing', description: 'Leak repairs, pipe fitting and bathroom installations.', area: 'Downtown', city: 'Accra', pricing: 'Free quotation after inspection', availability: 'Mon-Sat, 8am-6pm', contactMethod: 'In-app message', status: 'active' },
  { _id: 'sample-2', sample: true, providerName: 'AutoCare Garage', title: 'Car Repair', category: 'Car Repair', description: 'Servicing, diagnostics and brake repairs.', area: 'Industrial Area', city: 'Kumasi', pricing: 'Quotation per job', availability: 'Weekdays', contactMethod: 'Phone request', status: 'active' },
  { _id: 'sample-3', sample: true, providerName: 'Sparkle Cleaners', title: 'Home Cleaning', category: 'Cleaning', description: 'Deep cleaning for homes and hostels.', area: 'East Legon', city: 'Accra', pricing: 'Per room, quotation on request', availability: 'Weekends', contactMethod: 'In-app message', status: 'active' },
];

export const REQUEST_LABELS = {
  requested: 'Requested', quotation_sent: 'Quotation sent', accepted: 'Accepted',
  in_progress: 'In progress', completed: 'Completed', cancelled: 'Cancelled', reported: 'Reported',
};
export const requestLabel = status => REQUEST_LABELS[status] || String(status || '');
export const requestTone = status => ({
  requested: 'blue', quotation_sent: 'purple', accepted: 'green', in_progress: 'amber',
  completed: 'green', cancelled: 'gray', reported: 'red',
}[status] || 'blue');

export const quoteText = quote => (quote && (quote.amount || quote.amount === 0)
  ? `Quote: ${quote.amount}${quote.note ? ` - ${quote.note}` : ''}` : '');

// Cross-platform confirm (Alert buttons do not work on web).
export const confirmAction = (title, message, onConfirm, confirmText = 'Yes') => {
  if (Platform.OS === 'web') {
    // eslint-disable-next-line no-undef
    if (typeof window !== 'undefined' && window.confirm(`${title}\n${message}`)) onConfirm();
    return;
  }
  Alert.alert(title, message, [{ text: 'No', style: 'cancel' }, { text: confirmText, style: 'destructive', onPress: onConfirm }]);
};
export const notify = (title, message) => {
  if (Platform.OS === 'web' && typeof window !== 'undefined') window.alert(`${title}\n${message}`);
  else Alert.alert(title, message);
};
