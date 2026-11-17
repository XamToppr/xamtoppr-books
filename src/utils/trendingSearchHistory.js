const STORAGE_KEY = 'xamtoppr-trending-search-history';
const MAX_HISTORY_TERMS = 100;

export const DEFAULT_TRENDING_TAGS = [
  'Biology Notes',
  'SSC CGL',
  'General Studies',
  'Maths Formula Sheet',
  'Handwritten History'
];

const normalizeTerm = (value) => (
  typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : ''
);

export const readTrendingSearchHistory = () => {
  try {
    const storedHistory = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    if (!Array.isArray(storedHistory)) {
      console.error('Stored trending search history has an invalid format.');
      return [];
    }

    return storedHistory.filter((entry) => (
      entry
      && typeof entry.key === 'string'
      && typeof entry.label === 'string'
      && Number.isFinite(entry.count)
      && entry.count > 0
      && Number.isFinite(entry.lastUsedAt)
    ));
  } catch (error) {
    console.error('Unable to load trending search history.', error);
    return [];
  }
};

export const recordTrendingSearchTerms = (terms) => {
  const historyByKey = new Map(
    readTrendingSearchHistory().map((entry) => [entry.key, entry])
  );
  const recordedKeys = new Set();
  const lastUsedAt = Date.now();

  terms.forEach((value) => {
    const label = normalizeTerm(value);
    const key = label.toLocaleLowerCase();
    if (!key || recordedKeys.has(key)) return;
    recordedKeys.add(key);

    const existingEntry = historyByKey.get(key);
    historyByKey.set(key, {
      key,
      label,
      count: (existingEntry?.count || 0) + 1,
      lastUsedAt
    });
  });

  const updatedHistory = [...historyByKey.values()]
    .sort((a, b) => b.count - a.count || b.lastUsedAt - a.lastUsedAt)
    .slice(0, MAX_HISTORY_TERMS);

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedHistory));
  } catch (error) {
    console.error('Unable to save trending search history.', error);
  }

  return updatedHistory;
};

export const getTopTrendingTags = (history) => (
  history.length
    ? [...history]
      .sort((a, b) => b.count - a.count || b.lastUsedAt - a.lastUsedAt)
      .slice(0, 5)
      .map((entry) => entry.label)
    : DEFAULT_TRENDING_TAGS
);

const getTextValues = (value) => {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(getTextValues);
  if (value && typeof value === 'object' && typeof value.name === 'string') {
    return [value.name];
  }
  return [];
};

export const getBookTrendingTerms = (book) => (
  [
    book?.title,
    book?.subject,
    book?.exam,
    book?.examCategory,
    book?.topic,
    book?.module,
    book?.masterSubject
  ].flatMap(getTextValues)
);
