// CSV minimal tanpa dep: split baris + parse quote sederhana.
// Kolom import pelanggan: nama,hp,alamat,email,tipe,ip_address
// Contoh:
// nama,hp,alamat,email,tipe,ip_address
// Budi,081234567890,Jl. Mawar 1,,rumahan,103.147.9.45

export type CsvRow = Record<string, string>;

export function parseCsv(text: string): { headers: string[]; rows: CsvRow[] } {
  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((l) => l.trimEnd())
    .filter((l) => l.trim() !== "");
  if (lines.length === 0) return { headers: [], rows: [] };

  const headers = splitLine(lines[0]!).map((h) => h.trim().toLowerCase());
  const rows: CsvRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = splitLine(lines[i]!);
    const row: CsvRow = {};
    headers.forEach((h, idx) => {
      row[h] = (cells[idx] ?? "").trim();
    });
    // skip baris kosong total
    if (Object.values(row).every((v) => v === "")) continue;
    rows.push(row);
  }
  return { headers, rows };
}

function splitLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i]!;
    if (c === '"') {
      if (inQuote && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuote = !inQuote;
      }
    } else if (c === "," && !inQuote) {
      out.push(cur.trim());
      cur = "";
    } else {
      cur += c;
    }
  }
  out.push(cur.trim());
  return out.map((v) => v.replace(/^"|"$/g, ""));
}

export function toCsv(headers: string[], rows: string[][]): string {
  const esc = (v: string | number | null | undefined) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers.map(esc).join(","), ...rows.map((r) => r.map(esc).join(","))].join("\n");
}

export const PELANGGAN_CSV_TEMPLATE =
  "nama,hp,alamat,email,tipe,ip_address\nBudi Santoso,081234567890,Jl. Mawar 1,,rumahan,103.147.9.45\n";
