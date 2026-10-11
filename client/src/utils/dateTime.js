function parseDateValue(value) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function formatDateTime(value, locale = 'en-IN', options = {}) {
  const parsed = parseDateValue(value);
  if (!parsed) {
    return 'Time unavailable';
  }

  return parsed.toLocaleString(locale, options);
}

export function formatTime(value, locale = 'en-US', options = {}) {
  const parsed = parseDateValue(value);
  if (!parsed) {
    return 'Time unavailable';
  }

  return parsed.toLocaleTimeString(locale, options);
}

export function formatDuration(durationMinutes) {
  if (durationMinutes == null || Number.isNaN(Number(durationMinutes))) {
    return 'N/A';
  }

  const minutes = Math.round(Number(durationMinutes));
  if (minutes <= 0) {
    return 'N/A';
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours === 0) {
    return `${remainingMinutes}m`;
  }

  if (remainingMinutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${remainingMinutes}m`;
}

export function formatDate(value, locale = 'en-IN', options = {}) {
  const parsed = parseDateValue(value);
  if (!parsed) {
    return 'Date unavailable';
  }

  return parsed.toLocaleDateString(locale, options);
}
