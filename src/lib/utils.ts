import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency: string = "PHP"): string {
  if (currency === "PHP") {
    return `₱${amount.toLocaleString("en-PH")}`;
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatSalaryRange(min: number, max: number, currency: string = "PHP"): string {
  if (!min && !max) return "Competitive";
  if (!max || min === max) return `${formatCurrency(min, currency)} / mo`;
  return `${formatCurrency(min, currency)} - ${formatCurrency(max, currency)} / mo`;
}

export function formatDistance(distanceKm?: number): string {
  if (distanceKm === undefined || distanceKm === null) return "Location Remote / Nationwide";
  if (distanceKm < 1) return "< 1 km away";
  return `${distanceKm.toFixed(1)} km away`;
}

export function formatDate(dateString?: string): string {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return "Just now";
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 604800)}w ago`;
  return formatDate(dateString);
}

export function getInitials(name: string): string {
  if (!name) return "WM";
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function calculateProfileCompleteness(profile: any, skills: any[], educations: any[], experiences: any[], documents: any[]): number {
  let score = 20; // Base signup score
  if (profile?.professional_title) score += 10;
  if (profile?.bio) score += 10;
  if (skills && skills.length >= 3) score += 15;
  if (educations && educations.length > 0) score += 15;
  if (experiences && experiences.length > 0) score += 15;
  if (profile?.preferred_salary_min || profile?.preferred_job_type) score += 5;
  if (documents && documents.some((d) => d.document_type === "resume")) score += 5;
  if (documents && documents.some((d) => d.document_type === "diploma")) score += 5;
  return Math.min(100, score);
}
