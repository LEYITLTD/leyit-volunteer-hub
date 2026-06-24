import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getInitials(firstName: string, lastName: string) {
  return `${firstName[0]}${lastName[0]}`.toUpperCase();
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function getRewardTier(points: number): {
  tier: string;
  emoji: string;
  color: string;
} {
  if (points >= 1500) return { tier: "Platinum", emoji: "💎", color: "#0E7490" };
  if (points >= 800)  return { tier: "Gold", emoji: "🥇", color: "#8A6D2F" };
  if (points >= 300)  return { tier: "Silver", emoji: "🥈", color: "#6B7280" };
  return { tier: "Bronze", emoji: "🥉", color: "#B45309" };
}
