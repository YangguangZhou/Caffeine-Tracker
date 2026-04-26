const ANALYTICS_FLAG_PREFIX = 'caffeineTracker.analytics.';

export const trackEvent = (eventName, eventData = {}) => {
  if (typeof window === 'undefined' || !eventName) {
    return false;
  }

  const send = () => {
    try {
      if (window.umami && typeof window.umami.track === 'function') {
        window.umami.track(eventName, eventData);
        return true;
      }
    } catch (error) {
      console.warn(`Umami event failed: ${eventName}`, error);
    }
    return false;
  };

  if (send()) {
    return true;
  }

  window.setTimeout(send, 1200);
  return false;
};

export const trackEventOnce = (eventName, onceKey, eventData = {}) => {
  if (typeof window === 'undefined' || !onceKey) {
    return false;
  }

  const flagKey = `${ANALYTICS_FLAG_PREFIX}${onceKey}`;
  try {
    if (window.localStorage.getItem(flagKey) === 'true') {
      return false;
    }
    window.localStorage.setItem(flagKey, 'true');
  } catch (error) {
    console.warn(`Failed to persist analytics flag: ${onceKey}`, error);
  }

  return trackEvent(eventName, eventData);
};
