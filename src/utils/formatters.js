/**
 * Shared date/list formatting helpers.
 *
 * Date-only values (date_of_birth, schedule_date, due_date...) are stored as
 * Postgres `date` columns and arrive as 'YYYY-MM-DD' strings. Parsing them
 * with `new Date('YYYY-MM-DD')` creates a UTC-midnight Date that renders the
 * previous day in negative-offset timezones, so they must be built as local
 * dates. Full ISO timestamps are parsed normally.
 */

const DATE_ONLY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

// Parses a value that may be a 'YYYY-MM-DD' string, ISO timestamp, Date, or
// Firestore-style Timestamp into a local Date (or null when invalid).
export const parseFlexibleDate = (value) => {
  if (!value) return null;
  if (typeof value?.toDate === 'function') return value.toDate();
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;

  const str = String(value).trim();
  const dateOnly = DATE_ONLY_RE.exec(str);
  if (dateOnly) {
    const d = new Date(+dateOnly[1], +dateOnly[2] - 1, +dateOnly[3]);
    return isNaN(d.getTime()) ? null : d;
  }

  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
};

// 'YYYY-MM-DD' or timestamp -> '1 Aug 1960'. Returns fallback when invalid.
export const formatDateOfBirth = (value, fallback = 'N/A') => {
  const d = parseFlexibleDate(value);
  if (!d) return fallback;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

// Full date -> '1 Aug 1960'
export const formatDate = (value, fallback = 'N/A') => {
  const d = parseFlexibleDate(value);
  if (!d) return fallback;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

// Timestamp -> '1 Aug 1960, 14:32'
export const formatDateTime = (value, fallback = 'N/A') => {
  const d = parseFlexibleDate(value);
  if (!d) return fallback;
  return d.toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });
};

// Whole years elapsed since a date-of-birth value. Null when invalid.
export const calculateAge = (dob) => {
  const d = parseFlexibleDate(dob);
  if (!d) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const hadBirthday =
    now.getMonth() > d.getMonth() ||
    (now.getMonth() === d.getMonth() && now.getDate() >= d.getDate());
  if (!hadBirthday) age -= 1;
  return age >= 0 ? age : null;
};

/**
 * Normalizes a list-ish field (array or free text) into clean display items.
 * Arrays keep each element whole (splitting only on newlines) so medication
 * instructions containing commas stay intact; plain strings additionally
 * split on ';' so 'Penicillin; Sulfa' becomes two items.
 */
export const splitList = (value) => {
  if (!value) return [];
  const items = Array.isArray(value) ? value : [value];
  return items
    .flatMap((item) => String(item).split(/\r?\n|;+/))
    .map((item) => item.trim())
    .filter(Boolean);
};
