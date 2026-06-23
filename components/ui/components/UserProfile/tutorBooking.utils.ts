export function getDateString(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function generateDateOptions(count: number): { date: Date; dateStr: string }[] {
  const dates: { date: Date; dateStr: string }[] = [];
  const now = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
    dates.push({ date: d, dateStr: getDateString(d) });
  }
  return dates;
}
