// Social sign-in helpers: obtain an ID token from Google / Apple via the system browser.
// The backend (POST /api/auth/google, /api/auth/apple) verifies the token and issues the app session.
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import { API_ENDPOINTS } from '../../shared/config/api';

WebBrowser.maybeCompleteAuthSession();

const APPLE_CLIENT_ID = process.env.EXPO_PUBLIC_APPLE_CLIENT_ID;

const randomString = (len = 24) => {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let out = '';
  for (let i = 0; i < len; i += 1) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
};

const toBase64Url = (str) => {
  const b64 = typeof btoa === 'function' ? btoa(unescape(encodeURIComponent(str))) : Buffer.from(str, 'utf8').toString('base64');
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

const parseFragment = (url) => {
  const idx = url.indexOf('#');
  const raw = idx >= 0 ? url.slice(idx + 1) : url.split('?')[1] || '';
  return Object.fromEntries(new URLSearchParams(raw));
};

const getReturnUrl = () => (Platform.OS === 'web' && typeof window !== 'undefined' ? window.location.origin : Linking.createURL('auth'));

export class SocialAuthCancelled extends Error {}

async function runBrowserFlow(authUrl, returnUrl) {
  const result = await WebBrowser.openAuthSessionAsync(authUrl, returnUrl);
  if (result.type !== 'success' || !result.url) throw new SocialAuthCancelled('cancelled');
  return result.url;
}

// Google: the server runs the OAuth redirect (Google only allows https redirect URIs) and gives back a one-time ticket.
export async function getGoogleTicket(userType) {
  const returnUrl = getReturnUrl();
  const params = new URLSearchParams({ returnUrl });
  if (userType) params.set('userType', userType);
  const url = await runBrowserFlow(`${API_ENDPOINTS.AUTH_GOOGLE_START}?${params}`, returnUrl);
  const data = parseFragment(url);
  if (data.error) {
    if (data.error === 'cancelled') throw new SocialAuthCancelled('cancelled');
    throw new Error(data.error);
  }
  if (!data.ticket) throw new Error('Google sign-in failed. Please try again.');
  return data.ticket;
}

export async function getAppleIdToken() {
  if (!APPLE_CLIENT_ID) throw new Error('Apple sign-in is not configured yet. Set EXPO_PUBLIC_APPLE_CLIENT_ID (see SOCIAL_SIGNIN_SETUP.md).');
  const returnUrl = getReturnUrl();
  // state = base64url(returnUrl).random so the backend can bounce Apple's form_post back to the app.
  const state = `${toBase64Url(returnUrl)}.${randomString(16)}`;
  const params = new URLSearchParams({
    client_id: APPLE_CLIENT_ID,
    redirect_uri: API_ENDPOINTS.AUTH_APPLE_CALLBACK,
    response_type: 'code id_token',
    response_mode: 'form_post',
    scope: 'name email',
    state,
  });
  const url = await runBrowserFlow(`https://appleid.apple.com/auth/authorize?${params}`, returnUrl);
  const data = parseFragment(url);
  if (data.error) throw new Error(`Apple sign-in failed: ${data.error}`);
  if (data.state !== state || !data.id_token) throw new Error('Apple sign-in failed. Please try again.');
  return data.id_token;
}
