// API Configuration
// In Expo development on a physical device, localhost points to the phone.
// When the API URL is left at localhost, use the Metro/Expo host IP instead.
import Constants from 'expo-constants';
import { Platform } from 'react-native';

const configuredBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:5000/api';

function getDevelopmentHost() {
  const hostUri = Constants.expoConfig?.hostUri || Constants.expoGoConfig?.debuggerHost || '';
  if (!hostUri) return '';
  const withoutScheme = hostUri.replace(/^[a-z]+:\/\//i, '');
  return withoutScheme.split('/')[0].split(':')[0];
}

function resolveApiBaseUrl() {
  if (Platform.OS === 'web') return configuredBaseUrl;

  const isLocalhost = /^(https?:\/\/)(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/i.test(configuredBaseUrl);
  if (!isLocalhost) return configuredBaseUrl;

  const host = getDevelopmentHost();
  if (!host) return configuredBaseUrl;

  return configuredBaseUrl.replace(/^(https?:\/\/)(localhost|127\.0\.0\.1)/i, '$1' + host);
}

export const API_BASE_URL = resolveApiBaseUrl();

export const API_ENDPOINTS = {
  HEALTH: `${API_BASE_URL}/health`,
  CONFIG_CHECK: `${API_BASE_URL}/config-check`,
  SCHOOLS: `${API_BASE_URL}/schools`,
  SCHOOL_DETAIL: (id) => `${API_BASE_URL}/schools/${id}`,
  SCHOOL_SEARCH: `${API_BASE_URL}/schools/search`,
  SCHOOLS_NEARBY: `${API_BASE_URL}/schools/nearby`,
  SCHOOL_REVIEWS: (id) => `${API_BASE_URL}/schools/${id}/reviews`,
  USERS: `${API_BASE_URL}/users`,
  USER_PROFILE: (id) => `${API_BASE_URL}/users/${id}`,
  MY_PROFILE: `${API_BASE_URL}/profile/me`,
  SUBSCRIPTION_PLANS: `${API_BASE_URL}/subscriptions/plans`,
  MY_SUBSCRIPTIONS: `${API_BASE_URL}/subscriptions/me`,
  SUBSCRIPTION_CHECKOUT: `${API_BASE_URL}/subscriptions/checkout`,
  SUBSCRIPTION_VERIFY: (id) => `${API_BASE_URL}/subscriptions/verify/${encodeURIComponent(id)}`, 
  ADMIN_USER_STATUS: (id) => `${API_BASE_URL}/admin/users/${id}/status`,
  USER_LOGIN: `${API_BASE_URL}/auth/login`,
  USER_SIGNUP: `${API_BASE_URL}/auth/signup`,
  AUTH_GOOGLE_START: `${API_BASE_URL}/auth/google/start`,
  AUTH_SOCIAL_EXCHANGE: `${API_BASE_URL}/auth/social/exchange`,
  AUTH_GOOGLE: `${API_BASE_URL}/auth/google`,
  AUTH_APPLE: `${API_BASE_URL}/auth/apple`,
  AUTH_APPLE_CALLBACK: `${API_BASE_URL}/auth/apple/callback`,
  USER_LOGOUT: `${API_BASE_URL}/auth/logout`,
  PASSWORD_FORGOT: `${API_BASE_URL}/auth/forgot-password`,
  PASSWORD_RESET: `${API_BASE_URL}/auth/reset-password`,
  ADMIN_SCHOOLS: `${API_BASE_URL}/admin/schools`,
  ADMIN_VERIFY_SCHOOL: (id) => `${API_BASE_URL}/admin/schools/${id}/verify`,
  ADMIN_REJECT_SCHOOL: (id) => `${API_BASE_URL}/admin/schools/${id}/reject`,
  ADMIN_USERS: `${API_BASE_URL}/admin/users`,
  ADMIN_ANALYTICS: `${API_BASE_URL}/admin/analytics`,
  ADMIN_PAYMENTS: `${API_BASE_URL}/admin/payments`,
  GRADUATES: `${API_BASE_URL}/graduates`,
  GRADUATE_PROFILE: (id) => `${API_BASE_URL}/graduates/${id}`,
  JOB_LISTINGS: `${API_BASE_URL}/jobs`,
  MESSAGES: `${API_BASE_URL}/messages`,
  CONVERSATIONS: `${API_BASE_URL}/conversations`,
  PAYMENTS: `${API_BASE_URL}/payments`,
  PAYMENT_STATUS: (id) => `${API_BASE_URL}/payments/${id}/status`,
  PAYMENT_RECEIPT: (id) => `${API_BASE_URL}/payments/${id}/receipt`,
  PAYMENT_RECEIPT_INFO: (id) => `${API_BASE_URL}/payments/${id}/receipt-info`,
  FAVORITES: `${API_BASE_URL}/favorites`,
  FAVORITE: (id) => `${API_BASE_URL}/favorites/${id}`,
  JOBS: `${API_BASE_URL}/jobs`,
  EMPLOYER_JOBS: `${API_BASE_URL}/employer/jobs`,
  EMPLOYER_JOB_APPLICATIONS: (id) => `${API_BASE_URL}/employer/jobs/${id}/applications`,
  JOB_UPDATE: (id) => `${API_BASE_URL}/jobs/${id}`,
  JOB_CREATE: `${API_BASE_URL}/jobs`,
  JOB_APPLY: (id) => `${API_BASE_URL}/jobs/${id}/apply`,
  GRADUATE_APPLICATIONS: (id) => `${API_BASE_URL}/graduates/${id}/applications`,
  APPLICATION_STATUS: (id) => `${API_BASE_URL}/applications/${id}/status`,
  NOTIFICATIONS: `${API_BASE_URL}/notifications`,
  NOTIFICATION_READ: (id) => `${API_BASE_URL}/notifications/${id}/read`,
  GRADUATE_PROFILE_ME: `${API_BASE_URL}/graduate/profile`,
  CONNECT_USERS: `${API_BASE_URL}/connect/users`,
  CONNECT_REQUESTS: `${API_BASE_URL}/connect/requests`,
  CONNECT_REQUEST: (id) => `${API_BASE_URL}/connect/requests/${id}`,
  CONNECT_REPORT: `${API_BASE_URL}/connect/report`,
  CONNECT_BLOCK: (userId) => `${API_BASE_URL}/connect/block/${userId}`,
  CONNECT_SUGGESTIONS: `${API_BASE_URL}/connect/suggestions`,
  CONNECT_CONNECTIONS: `${API_BASE_URL}/connect/connections`,
  USER_ENDORSE: (id) => `${API_BASE_URL}/users/${id}/endorse`,
  USER_UNENDORSE: (id, skill) => `${API_BASE_URL}/users/${id}/endorse/${encodeURIComponent(skill)}`,
  USER_RECOMMEND: (id) => `${API_BASE_URL}/users/${id}/recommendations`,
  POSTS: `${API_BASE_URL}/posts`,
  FEED: `${API_BASE_URL}/feed`,
  SCHOOL_GROUPS: (schoolId) => `${API_BASE_URL}/schools/${schoolId}/groups`,
  GROUP_JOIN: (id) => `${API_BASE_URL}/groups/${id}/join`,
  GROUP_LEAVE: (id) => `${API_BASE_URL}/groups/${id}/leave`,
  GROUP: (id) => `${API_BASE_URL}/groups/${id}`,
  GROUP_POSTS: (id) => `${API_BASE_URL}/groups/${id}/posts`,
  ADMIN_SET_ROLE: (id) => `${API_BASE_URL}/admin/users/${id}/role`,
  ADMIN_REPORTS: `${API_BASE_URL}/admin/reports`,
  ADMIN_REPORT_STATUS: (id) => `${API_BASE_URL}/admin/reports/${id}/status`,
  UPLOAD: `${API_BASE_URL}/upload`,
  PUSH_TOKEN: `${API_BASE_URL}/notifications/push-token`,
  CAREER_DOCUMENTS: `${API_BASE_URL}/career/documents`,
  CAREER_DOCUMENT: (id) => `${API_BASE_URL}/career/documents/${id}`,
  USER_CAREER_DOCUMENTS: (id) => `${API_BASE_URL}/users/${id}/career-documents`,
  INTERVIEWS: `${API_BASE_URL}/interviews`,
  EMPLOYER_INTERVIEWS: `${API_BASE_URL}/employer/interviews`,
  INTERVIEW: (id) => `${API_BASE_URL}/interviews/${id}`,
  POST_LIKE: (id) => `${API_BASE_URL}/posts/${id}/like`,
  POST_COMMENTS: (id) => `${API_BASE_URL}/posts/${id}/comments`,
  PAYMENT_CHECKOUT: (id) => `${API_BASE_URL}/payments/${id}/checkout`,
  PAYMENT_VERIFY: (id) => `${API_BASE_URL}/payments/verify/${id}`,
};

export const REQUEST_TIMEOUT = 30000;
