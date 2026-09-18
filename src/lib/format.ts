export function formatNaira(amount: number): string {
  return '\u20A6' + amount.toLocaleString('en-NG');
}
