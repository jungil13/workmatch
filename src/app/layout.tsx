import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "WorkMatch — AI Skill & Location-Based Job Finder System",
  description: "Next-generation recruitment platform connecting talent and employers via transparent multi-factor AI match scoring, verified diploma extraction, and local proximity matching.",
  keywords: ["Job Finder", "AI Match", "Skill Verification", "Recruitment", "Philippines Jobs", "Next.js", "Supabase"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full bg-background antialiased">
      <body className="min-h-full flex flex-col selection:bg-mint-200 selection:text-dark font-sans">
        <div className="flex-1 flex flex-col">
          {children}
        </div>
      </body>
    </html>
  );
}
