export function normalizeSchoolYearLabel(value: string) {
  const trimmed = value.trim();
  const shortMatch = trimmed.match(/^(\d{2})\s*\/\s*(\d{2})$/);
  if (shortMatch) return `${shortMatch[1]}/${shortMatch[2]}`;

  const longMatch = trimmed.match(/^(\d{4})\s*[-/]\s*(\d{4})$/);
  if (longMatch) return `${longMatch[1].slice(-2)}/${longMatch[2].slice(-2)}`;

  return null;
}

export function currentSchoolYearLabel(date = new Date()) {
  const startYear = date.getMonth() >= 6 ? date.getFullYear() : date.getFullYear() - 1;
  return `${String(startYear).slice(-2)}/${String(startYear + 1).slice(-2)}`;
}
