export function isStandardReportingDay(date: Date) {
  const day = date.getDay();
  return day >= 1 && day <= 5;
}

export function standardReportingDayIndexes(values: unknown) {
  if (!Array.isArray(values)) return [0, 1, 2, 3, 4];
  return values
    .map(Number)
    .filter((dayIndex) => Number.isInteger(dayIndex) && dayIndex >= 0 && dayIndex <= 4);
}
