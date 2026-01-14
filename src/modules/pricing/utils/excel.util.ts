// src/modules/pricing/utils/excel.util.ts
import * as ExcelJS from 'exceljs';
import { Buffer } from 'buffer';

type AnyObject = Record<string, any>;

export function bufferFromBase64(b64: string): Buffer {
  const cleaned = b64.includes('base64,') ? b64.split('base64,')[1] : b64;
  return Buffer.from(cleaned, 'base64');
}

/**
 * Node typings may expose Uint8Array.buffer as ArrayBuffer | SharedArrayBuffer.
 * ExcelJS typings are happiest with a real ArrayBuffer.
 * So we copy into a fresh Uint8Array which guarantees ArrayBuffer.
 */
function toRealArrayBuffer(u8: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(u8.byteLength);
  copy.set(u8);
  return copy.buffer;
}

export async function loadWorkbookFromBase64(file_base64: string): Promise<ExcelJS.Workbook> {
  const wb = new ExcelJS.Workbook();

  const buf = bufferFromBase64(file_base64); // Node Buffer
  const ab = toRealArrayBuffer(buf); // real ArrayBuffer (never SharedArrayBuffer)

  await wb.xlsx.load(ab);
  return wb;
}

/**
 * Convert common excel cell value to string (trimmed) or null
 */
export function cellStr(v: unknown): string | null {
  if (v === null || v === undefined) return null;

  if (typeof v === 'string') return v.trim() || null;
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : null;
  if (typeof v === 'boolean') return v ? 'true' : 'false';

  if (v instanceof Date) return v.toISOString().slice(0, 10);

  if (typeof v === 'object') {
    const obj: any = v;

    // Hyperlink / text cell: { text, hyperlink }
    if (obj?.text !== undefined) return String(obj.text).trim() || null;

    // RichText: { richText: [{ text: '...' }] }
    if (Array.isArray(obj?.richText)) {
      const t = obj.richText.map((x: any) => x?.text ?? '').join('');
      return String(t).trim() || null;
    }

    // Formula: { formula, result }
    if (obj?.result !== undefined) return cellStr(obj.result);
  }

  return String(v).trim() || null;
}

/**
 * Returns numeric value as string (because your DB fields look like numeric/decimal strings),
 * or null if not parseable.
 */
export function cellNum(v: unknown): string | null {
  const s = cellStr(v);
  if (!s) return null;

  // Allow commas e.g. "1,234.56"
  const normalized = s.replace(/,/g, '');
  const n = Number(normalized);
  if (!Number.isFinite(n)) return null;

  return String(n);
}

/**
 * ExcelJS may provide Date already if the cell is date-formatted.
 * Otherwise handle "YYYY-MM-DD" or "DD/MM/YYYY" minimally.
 */
export function cellDateISO(v: unknown): string | null {
  if (v === null || v === undefined || v === '') return null;

  if (v instanceof Date) return v.toISOString().slice(0, 10);

  const s = cellStr(v);
  if (!s) return null;

  // ISO
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  // dd/mm/yyyy
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) {
    const dd = m[1].padStart(2, '0');
    const mm = m[2].padStart(2, '0');
    return `${m[3]}-${mm}-${dd}`;
  }

  return null;
}

/**
 * Reads a sheet into array of objects using header row.
 * - Header row is row 1
 * - Keys are lowercased header strings
 * - Keeps original ExcelJS cell values in obj (so you can use cellStr/cellNum/cellDateISO later)
 */
export function sheetToObjects(ws: ExcelJS.Worksheet): AnyObject[] {
  const headerRow = ws.getRow(1);
  const headers: string[] = [];

  headerRow.eachCell((cell, col) => {
    headers[col - 1] = (cellStr(cell.value) ?? '').toLowerCase();
  });

  const rows: AnyObject[] = [];

  ws.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;

    const obj: AnyObject = {};
    let empty = true;

    headers.forEach((h, i) => {
      if (!h) return;
      const val = row.getCell(i + 1).value;
      if (cellStr(val) !== null) empty = false;
      obj[h] = val;
    });

    if (!empty) rows.push(obj);
  });

  return rows;
}
