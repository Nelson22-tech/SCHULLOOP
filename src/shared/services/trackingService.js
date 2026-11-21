const isTrackingEnabled = Boolean(
  process.env.EXPO_PUBLIC_TRACKING_ENABLED === 'true' ||
  process.env.EXPO_PUBLIC_SENTRY_DSN
);
let initialized = false;

export const initTracking = async () => {
  if (initialized) return;
  initialized = true;

  if (!isTrackingEnabled) {
    return;
  }

  // Initialize your analytics or error tracking provider here.
  // For example, Sentry, Firebase Crashlytics, or another service.
  if (process.env.NODE_ENV !== 'production') {
    console.log('[Tracking] initialized');
  }
};

export const trackEvent = (eventName, properties = {}) => {
  if (!initialized || !isTrackingEnabled) return;

  if (process.env.NODE_ENV !== 'production') {
    console.log('[Tracking] Event:', eventName, properties);
  }

  // Add provider-specific event tracking here.
};

export const trackError = (error, context = {}) => {
  if (!initialized || !isTrackingEnabled) return;

  if (process.env.NODE_ENV !== 'production') {
    console.log('[Tracking] Error:', context, error);
  }

  // Add provider-specific error reporting here.
};
