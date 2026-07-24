import type { Metadata } from "next";
import { AppProviders } from "@/shared/providers/app-providers";
import { ManropeFont } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "Clean7 Panel",
  description: "Director and branch operations panel for Clean7",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className={`${ManropeFont.variable} ${ManropeFont.className} min-h-full font-sans`}>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
