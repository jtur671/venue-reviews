const LEADING_ARTICLES = ['the '];

function normalize(text?: string) {
  if (!text) return '';
  let normalized = text.trim().toLowerCase();
  LEADING_ARTICLES.forEach((article) => {
    if (normalized.startsWith(article)) {
      normalized = normalized.slice(article.length);
    }
  });
  normalized = normalized.replace(/[^a-z0-9]+/g, ' ').trim();
  return normalized;
}

export function makeVenueKey(name?: string, city?: string) {
  const normName = normalize(name);
  const normCity = normalize(city);
  return `${normName}|${normCity}`;
}

export function makeNameOnlyKey(name?: string) {
  return makeVenueKey(name, '');
}

export function makeNameWithoutCityKey(name?: string, city?: string) {
  const normName = normalize(name);
  const normCity = normalize(city);

  if (!normCity) {
    return makeNameOnlyKey(name);
  }

  if (!normName) return makeVenueKey('', '');

  let stripped = normName;

  if (stripped.endsWith(` ${normCity}`)) {
    stripped = stripped.slice(0, -normCity.length - 1).trim();
  } else if (stripped === normCity) {
    stripped = '';
  } else {
    stripped = stripped.replace(normCity, '').replace(/\s+/g, ' ').trim();
  }

  return makeVenueKey(stripped, '');
}
