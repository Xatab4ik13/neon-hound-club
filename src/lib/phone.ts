// Форматирование российского номера: +7 (XXX) XXX-XX-XX
// Принимает любой ввод, возвращает отформатированную строку.

export function formatRuPhone(input: string): string {
  if (!input) return "";
  let digits = input.replace(/\D/g, "");
  // нормализуем ведущую 8 / отсутствие 7
  if (digits.startsWith("8")) digits = "7" + digits.slice(1);
  if (!digits.startsWith("7")) digits = "7" + digits;
  digits = digits.slice(0, 11); // +7 и 10 цифр

  const rest = digits.slice(1); // 10 цифр после 7
  const p1 = rest.slice(0, 3);
  const p2 = rest.slice(3, 6);
  const p3 = rest.slice(6, 8);
  const p4 = rest.slice(8, 10);

  let out = "+7";
  if (p1) out += ` (${p1}`;
  if (p1.length === 3) out += ")";
  if (p2) out += ` ${p2}`;
  if (p3) out += `-${p3}`;
  if (p4) out += `-${p4}`;
  return out;
}

export function isValidRuPhone(input: string): boolean {
  const digits = input.replace(/\D/g, "");
  return digits.length === 11 && (digits.startsWith("7") || digits.startsWith("8"));
}

// Любой номер (СНГ и другие страны): российские/казахстанские (+7, 8) — с маской,
// остальные — просто +<цифры>.
export function formatPhone(input: string): string {
  const plus = input.trim().startsWith("+");
  let digits = input.replace(/\D/g, "");
  if (!plus) {
    if (digits.startsWith("8")) digits = "7" + digits.slice(1);
    if (!digits.startsWith("7") && digits.length === 10) digits = "7" + digits;
  }
  if (digits.startsWith("7")) {
    digits = digits.slice(0, 11);
    const rest = digits.slice(1);
    const p1 = rest.slice(0, 3);
    const p2 = rest.slice(3, 6);
    const p3 = rest.slice(6, 8);
    const p4 = rest.slice(8, 10);
    let out = "+7";
    if (p1) out += ` (${p1}`;
    if (p1.length === 3) out += ")";
    if (p2) out += ` ${p2}`;
    if (p3) out += `-${p3}`;
    if (p4) out += `-${p4}`;
    return out;
  }
  digits = digits.slice(0, 15);
  return digits ? "+" + digits : "";
}

export function isValidPhone(input: string): boolean {
  const digits = input.replace(/\D/g, "");
  return digits.length >= 8 && digits.length <= 15;
}
