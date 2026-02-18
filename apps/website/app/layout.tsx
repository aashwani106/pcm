import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PCM Classroom",
  description: "Courses and live coaching classes"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
