import { fieldLabels } from '../config/fieldLabels';

export function flattenObject(obj, prefix = '') {
  let result = {};
  for (const key in obj) {
    if (obj[key] && typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
      Object.assign(result, flattenObject(obj[key], `${prefix}${key}.`));
    } else {
      result[`${prefix}${key}`] = obj[key];
    }
  }
  return result;
}

function parseLocalDate(value) {
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function formatVal(value) {
  if (value === true) return '✅';
  if (value === false) return '❌';
  return value;
}

export function buildHistoryCsv({ history, exportStart, exportEnd, vehicleTypeFilter, exportLayout }) {
  const startDate = parseLocalDate(exportStart);
  startDate.setHours(0, 0, 0, 0);

  const endDate = parseLocalDate(exportEnd);
  endDate.setHours(23, 59, 59, 999);

  const startTs = startDate.getTime();
  const endTs = endDate.getTime();

  const filtered = history.filter((item) => {
    const inDateRange = item.createdAt >= startTs && item.createdAt <= endTs;
    const matchesType = vehicleTypeFilter === 'all' || item.vehicleType === vehicleTypeFilter;
    return inDateRange && matchesType;
  });

  if (filtered.length === 0) {
    return null;
  }

  const rows = filtered.map((record) => {
    const clone = { ...record };
    delete clone.assinatura;
    delete clone.id;
    return flattenObject(clone);
  });

  let headers = [...new Set(rows.flatMap((row) => Object.keys(row)))];
  headers = headers.filter((h) => h !== 'motorista' && h !== 'loggedInUser');
  headers.unshift('loggedInUser');
  headers.unshift('motorista');

  const humanHeaders = headers.map((h) => fieldLabels[h] || h);

  const csv = exportLayout === 'vertical'
    ? rows
        .map((row, index) => {
          const recordTitle = JSON.stringify(`Registro ${index + 1}`);
          const recordRows = headers.map((h) => {
            const label = JSON.stringify(fieldLabels[h] || h);
            const value = JSON.stringify(formatVal(row[h] ?? ''));
            return `${label},${value}`;
          });
          return [recordTitle, ...recordRows, ''].join('\n');
        })
        .join('\n')
    : [humanHeaders.join(',')]
        .concat(
          rows.map((row) => headers.map((h) => JSON.stringify(formatVal(row[h] ?? ''))).join(','))
        )
        .join('\n');

  return csv;
}
