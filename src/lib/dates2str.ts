export const dates2str = (obj: Record<string, any>) => {
  for (const key in obj) {
    if (obj[key] instanceof Date) {
      const dateStr = obj[key].toISOString();
      obj[key] = dateStr.endsWith('T00:00:00.000Z') ? dateStr.slice(0, 10) : dateStr;
    } else if (typeof obj[key] === 'object') {
      dates2str(obj[key]);
    } else if (typeof obj[key] === 'string' && obj[key].endsWith('T00:00:00.000Z')) {
      // we assume that is date
      obj[key] = obj[key].slice(0, 10);
    }
  }
};
