/**
 * Shared formatting + lookup helpers for the admin Finance area.
 * Kept in one place so the Revenue, Transactions and Charges views render
 * money, dates and status colours identically.
 */

/** currencyId → ISO code. 1 = INR is the backend default (see design reference §7). */
const CURRENCY_BY_ID: Record<number, string> = { 1: 'INR', 2: 'USD', 3: 'EUR', 4: 'GBP' };

export function currencyCode(currencyId: number | null | undefined): string {
  return (currencyId != null && CURRENCY_BY_ID[currencyId]) || 'INR';
}

/** Whole-rupee formatting for headline figures (no decimals). */
export function formatMoney(value: number | null | undefined, currency = 'INR'): string {
  if (value == null) return '—';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

/** Two-decimal formatting for platform fees / precise amounts. */
export function formatMoneyPrecise(value: number | null | undefined, currency = 'INR'): string {
  if (value == null) return '—';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(iso));
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

/** PrimeNG <p-tag> severity for a payment statusId (1=Pending 2=Completed 3=Failed 4=Refunded). */
export function paymentStatusSeverity(
  statusId: number | null,
): 'success' | 'warn' | 'danger' | 'info' | 'secondary' {
  switch (statusId) {
    case 2:
      return 'success';
    case 1:
      return 'warn';
    case 3:
      return 'danger';
    case 4:
      return 'info';
    default:
      return 'secondary';
  }
}

/** PrimeNG <p-tag> severity for a charge statusId (1=Pending 2=Partial 3=Paid 4=Overdue 5=Cancelled). */
export function chargeStatusSeverity(
  statusId: number | null,
): 'success' | 'warn' | 'danger' | 'info' | 'secondary' {
  switch (statusId) {
    case 3:
      return 'success';
    case 2:
      return 'info';
    case 1:
      return 'warn';
    case 4:
      return 'danger';
    default:
      return 'secondary';
  }
}

/** Escapes a value for a CSV cell and wraps it in quotes. */
export function csvCell(value: unknown): string {
  const s = value == null ? '' : String(value);
  return `"${s.replace(/"/g, '""')}"`;
}

/** Triggers a browser download of `rows` as a CSV file named `filename`. */
export function downloadCsv(filename: string, header: string[], rows: string[][]): void {
  const lines = [header, ...rows].map((cols) => cols.map(csvCell).join(','));
  const blob = new Blob([lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
