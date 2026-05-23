import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatKm(meters: number): string {
  const km = Math.floor(meters / 1000);
  const m = Math.round(meters % 1000);
  return `${km}+${m.toString().padStart(3, "0")}`;
}
