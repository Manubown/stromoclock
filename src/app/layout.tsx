import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "StromOclock",
  description: "Run your dishwasher at the cheapest hour — daily price notifications for EU dynamic tariffs.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
