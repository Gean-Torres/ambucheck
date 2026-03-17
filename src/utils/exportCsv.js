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

function recordToRow(record) {
  const clone = { ...record };
  delete clone.assinatura;
  delete clone.id;
  delete clone.driverName; // evitar duplicidade: campo normalizado 'motorista' já contém o valor
  return flattenObject(clone);
}

function deriveHeaders(rows) {
  const all = [...new Set(rows.flatMap((row) => Object.keys(row)))];
  const ordered = all
    .filter((h) => h !== 'motorista' && h !== 'loggedInUser')
    .sort();
  return ['motorista', 'loggedInUser', ...ordered];
}

function buildCsvFromRows(rows, layout, headers) {
  const humanHeaders = headers.map((h) => fieldLabels[h] || h);
  if (layout === 'vertical') {
    return rows
      .map((row, index) => {
        const recordTitle = JSON.stringify(`Registro ${index + 1}`);
        const recordRows = headers.map((h) => {
          const label = JSON.stringify(fieldLabels[h] || h);
          const value = JSON.stringify(formatVal(row[h] ?? ''));
          return `${label},${value}`;
        });
        return [recordTitle, ...recordRows, ''].join('\n');
      })
      .join('\n');
  }

  const quotedHeaders = humanHeaders.map((h) => JSON.stringify(h));

  return [quotedHeaders.join(',')]
    .concat(rows.map((row) => headers.map((h) => JSON.stringify(formatVal(row[h] ?? ''))).join(',')))
    .join('\n');
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

  const rows = filtered.map(recordToRow);
  const headers = deriveHeaders(rows);
  return buildCsvFromRows(rows, exportLayout, headers);
}

export function buildRecordCsv(record, layout = 'horizontal') {
  const rows = [recordToRow(record)];
  const headers = deriveHeaders(rows);
  return buildCsvFromRows(rows, layout, headers);
}
