export function normalizeSchoolYearLabel(value: string) {
  const trimmed = value.trim();
  const shortMatch = trimmed.match(/^(\d{2})\s*\/\s*(\d{2})$/);
  if (shortMatch) {
    const start = Number(shortMatch[1]);
    const end = Number(shortMatch[2]);
    return start >= 25 && start <= 99 && end === (start + 1) % 100
      ? `${shortMatch[1]}/${shortMatch[2]}`
      : null;
  }

  const longMatch = trimmed.match(/^(\d{4})\s*[-/]\s*(\d{4})$/);
  if (longMatch) {
    const start = Number(longMatch[1]);
    const end = Number(longMatch[2]);
    return start >= 2025 && end === start + 1
      ? `${longMatch[1].slice(-2)}/${longMatch[2].slice(-2)}`
      : null;
  }

  return null;
}

export function currentSchoolYearLabel(date = new Date()) {
  const startYear = date.getMonth() >= 6 ? date.getFullYear() : date.getFullYear() - 1;
  return `${String(startYear).slice(-2)}/${String(startYear + 1).slice(-2)}`;
}
