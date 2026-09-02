import type { Metadata } from "next";
import { Poppins } from 'next/font/google';
import "./globals.css";

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800', '900'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: "WorkMatch — AI Skill & Location-Based Job Finder System",
  description: "Next-generation recruitment platform connecting talent and employers via transparent multi-factor AI match scoring, verified diploma extraction, and local proximity matching.",
  keywords: ["Job Finder", "AI Match", "Skill Verification", "Recruitment", "Philippines Jobs", "Next.js", "Supabase"],
  icons: {
    icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="20" fill="%2310B981"/><path d="M25,40 L25,70 M45,30 L45,70 M65,50 L65,70 M85,40 L85,70" stroke="white" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/><path d="M25,40 L45,30 L65,50 L85,40" stroke="white" stroke-width="12" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full bg-background antialiased">
      <body className={`min-h-full flex flex-col selection:bg-mint-200 selection:text-dark ${poppins.className}`}>
        <div className="flex-1 flex flex-col">
          {children}
        </div>
      </body>
    </html>
  );
}
