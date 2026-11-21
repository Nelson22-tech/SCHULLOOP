import { trackError } from '../services/trackingService';

const isDevelopment = process.env.NODE_ENV !== 'production';

export const logError = (message, error) => {
  if (isDevelopment) {
    console.error(message, error);
  }
  trackError(error, { message });
};

export const logInfo = (message, data) => {
  if (isDevelopment) {
    console.log(message, data);
  }
};
