// Статический справочник мото-марок и моделей. Без внешних API.
// Если марки/модели нет — юзер вводит вручную через ComboboxWithCustom.
// Сигнатуры async — чтобы не менять BikeFormModal.
import { MOTO_BRANDS, getModelsForBrand } from "@/data/moto-catalog";

/** Список всех мото-марок (мгновенно, без сети). */
export async function getMotorcycleMakes(): Promise<string[]> {
  return MOTO_BRANDS;
}

/** Модели марки. Год игнорируется (нет данных по годам в локальном справочнике). */
export async function getModelsForMakeYear(
  make: string,
  _year: number,
): Promise<string[]> {
  return getModelsForBrand(make);
}

/** Список годов от следующего до 1970. */
export function getYears(): number[] {
  const now = new Date().getFullYear();
  const years: number[] = [];
  for (let y = now + 1; y >= 1970; y--) years.push(y);
  return years;
}
