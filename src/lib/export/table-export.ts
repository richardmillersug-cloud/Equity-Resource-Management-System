/**
 * Shared table export helpers — PDF (html2pdf) and Excel-compatible .xls (SpreadsheetML).
 */

export type ExportCell = string | number | boolean | null | undefined;

export type ExportColumn<T> = {
  key: string;
  header: string;
  value: (row: T) => ExportCell;
};

export type ExportOptions = {
  filename: string;
  title?: string;
  subtitle?: string;
};

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function cellToString(value: ExportCell): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return String(value);
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function stampFilename(base: string, ext: string): string {
  const clean = base.replace(/\.(pdf|xls|xlsx|csv)$/i, '');
  const stamp = new Date().toISOString().slice(0, 10);
  return `${clean}-${stamp}.${ext}`;
}

export function rowsFromColumns<T>(rows: T[], columns: ExportColumn<T>[]): Record<string, string>[] {
  return rows.map((row) => {
    const out: Record<string, string> = {};
    columns.forEach((col) => {
      out[col.header] = cellToString(col.value(row));
    });
    return out;
  });
}

/** Excel-compatible SpreadsheetML (.xls) — opens in Excel / LibreOffice without extra deps. */
export function exportToXls(
  data: Record<string, ExportCell>[],
  options: ExportOptions
): void {
  if (!data.length) {
    throw new Error('No data to export');
  }

  const headers = Object.keys(data[0]);
  const title = options.title || options.filename;

  const rowsXml = data
    .map((row) => {
      const cells = headers
        .map((header) => {
          const raw = cellToString(row[header]);
          const isNum = raw !== '' && !Number.isNaN(Number(raw.replace(/,/g, ''))) && /^-?[\d,.]+$/.test(raw);
          if (isNum) {
            return `<Cell><Data ss:Type="Number">${raw.replace(/,/g, '')}</Data></Cell>`;
          }
          return `<Cell><Data ss:Type="String">${escapeXml(raw)}</Data></Cell>`;
        })
        .join('');
      return `<Row>${cells}</Row>`;
    })
    .join('');

  const headerCells = headers
    .map((h) => `<Cell ss:StyleID="header"><Data ss:Type="String">${escapeXml(h)}</Data></Cell>`)
    .join('');

  const xml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <Styles>
  <Style ss:ID="header">
   <Font ss:Bold="1"/>
   <Interior ss:Color="#E8E8E8" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="title">
   <Font ss:Bold="1" ss:Size="14"/>
  </Style>
 </Styles>
 <Worksheet ss:Name="Export">
  <Table>
   <Row><Cell ss:StyleID="title"><Data ss:Type="String">${escapeXml(title)}</Data></Cell></Row>
   ${options.subtitle ? `<Row><Cell><Data ss:Type="String">${escapeXml(options.subtitle)}</Data></Cell></Row>` : ''}
   <Row><Cell><Data ss:Type="String">Generated: ${escapeXml(new Date().toLocaleString())}</Data></Cell></Row>
   <Row></Row>
   <Row>${headerCells}</Row>
   ${rowsXml}
  </Table>
 </Worksheet>
</Workbook>`;

  const blob = new Blob([xml], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  triggerDownload(blob, stampFilename(options.filename, 'xls'));
}

/** PDF table export via html2pdf.js */
export async function exportToPdf(
  data: Record<string, ExportCell>[],
  options: ExportOptions
): Promise<void> {
  if (!data.length) {
    throw new Error('No data to export');
  }

  const headers = Object.keys(data[0]);
  const title = options.title || options.filename;

  const thead = headers.map((h) => `<th>${escapeHtml(h)}</th>`).join('');
  const tbody = data
    .map((row) => {
      const cells = headers
        .map((h) => `<td>${escapeHtml(cellToString(row[h]))}</td>`)
        .join('');
      return `<tr>${cells}</tr>`;
    })
    .join('');

  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-10000px';
  container.style.top = '0';
  container.style.width = '1100px';
  container.style.padding = '24px';
  container.style.background = '#ffffff';
  container.style.color = '#111827';
  container.style.fontFamily = 'Arial, Helvetica, sans-serif';
  container.innerHTML = `
    <div style="margin-bottom: 16px;">
      <h1 style="margin: 0 0 4px; font-size: 20px;">${escapeHtml(title)}</h1>
      ${options.subtitle ? `<p style="margin: 0 0 4px; color: #4b5563; font-size: 12px;">${escapeHtml(options.subtitle)}</p>` : ''}
      <p style="margin: 0; color: #6b7280; font-size: 11px;">Generated ${escapeHtml(new Date().toLocaleString())} · ${data.length} row(s)</p>
    </div>
    <table style="width: 100%; border-collapse: collapse; font-size: 10px;">
      <thead>
        <tr style="background: #f3f4f6;">${thead}</tr>
      </thead>
      <tbody>${tbody}</tbody>
    </table>
    <style>
      th, td { border: 1px solid #d1d5db; padding: 6px 8px; text-align: left; vertical-align: top; }
      th { font-weight: 700; }
      tr:nth-child(even) td { background: #fafafa; }
    </style>
  `;

  document.body.appendChild(container);

  try {
    const html2pdf = (await import('html2pdf.js')).default;
    await html2pdf()
      .set({
        margin: [10, 8, 10, 8],
        filename: stampFilename(options.filename, 'pdf'),
        image: { type: 'jpeg', quality: 0.96 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: headers.length > 6 ? 'landscape' : 'portrait' },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
      })
      .from(container)
      .save();
  } finally {
    document.body.removeChild(container);
  }
}

export async function exportTable<T>(
  rows: T[],
  columns: ExportColumn<T>[],
  format: 'pdf' | 'xls',
  options: ExportOptions
): Promise<void> {
  const data = rowsFromColumns(rows, columns);
  if (format === 'xls') {
    exportToXls(data, options);
    return;
  }
  await exportToPdf(data, options);
}
