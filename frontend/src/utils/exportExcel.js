import * as XLSX from 'xlsx';

/**
 * Export an array of flat row objects to an Excel (.xlsx) workbook and trigger
 * a browser download.
 *
 * @param {Object} options
 * @param {string} options.fileName   File name without extension (e.g. "bookings-report")
 * @param {string} [options.sheetName] Sheet tab name (default "Sheet1")
 * @param {Array<Object>} options.rows Array of plain objects — keys become column headers
 * @param {Array<{ header: string, key: string }>} [options.columns] Optional column order
 *   and header labels. When omitted, keys of the first row are used.
 * @param {Array<Object>} [options.meta] Optional extra sheets (each { name, rows }).
 */
export function exportToExcel({ fileName, sheetName = 'Sheet1', rows, columns, meta = [] }) {
  const data = Array.isArray(rows) ? rows : [];
  const first = data[0] || {};
  const cols = Array.isArray(columns) && columns.length
    ? columns
    : Object.keys(first).map((key) => ({ header: key, key }));

  const worksheetRows = data.map((row) => {
    const out = {};
    cols.forEach(({ header, key }) => { out[header] = row[key] ?? ''; });
    return out;
  });

  const ws = XLSX.utils.json_to_sheet(worksheetRows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  meta.forEach(({ name, rows: metaRows }) => {
    if (!Array.isArray(metaRows) || metaRows.length === 0) return;
    const ms = XLSX.utils.json_to_sheet(metaRows);
    XLSX.utils.book_append_sheet(wb, ms, String(name).slice(0, 31));
  });

  // Freeze the header row and give it a bold style so exports read well.
  ws['!autofilter'] = { ref: ws['!ref'] };

  XLSX.writeFile(wb, `${fileName || 'export'}.xlsx`);
}

/**
 * Fetch every page of a paginated backend list and export the full result to
 * Excel. `fetchPage(page, limit)` must resolve to `{ rows, total }`.
 *
 * @param {Object} options
 * @param {function(number, number): Promise<{ rows: Object[], total: number }>} options.fetchPage
 * @param {string} options.fileName
 * @param {string} [options.sheetName]
 * @param {Array<{ header: string, key: string }>} [options.columns]
 * @param {Array<Object>} [options.meta]
 */
export async function exportAllPages({ fetchPage, fileName, sheetName = 'Sheet1', columns, meta = [] }) {
  const all = [];
  let page = 1;
  const limit = 100;

  for (;;) {
    const { rows, total } = await fetchPage(page, limit);
    const batch = Array.isArray(rows) ? rows : [];
    all.push(...batch);
    if (!batch.length || all.length >= Number(total || 0)) break;
    page += 1;
  }

  exportToExcel({ fileName, sheetName, rows: all, columns, meta });
}
