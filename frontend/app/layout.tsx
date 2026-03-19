import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BharatGreen AI — Workload Carbon Analyzer",
  description:
    "BharatGreen AI — Intelligent agent that analyzes AI workloads to track and reduce carbon and water footprints across Indian and global cloud environments. Powered by NVIDIA Nemotron.",
  icons: { icon: "/favicon.ico" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased" suppressHydrationWarning>{children}</body>
    </html>
  );
}
