import type { Metadata, Viewport } from "next";
import { Inter, IBM_Plex_Sans_Thai_Looped } from "next/font/google";
import "leaflet/dist/leaflet.css";
import "./globals.css";

const latin = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-latin",
});

const thai = IBM_Plex_Sans_Thai_Looped({
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-thai",
});

export const metadata: Metadata = {
  title: "KKU Maps — แผนที่ ม.ขอนแก่น",
  description: "แผนที่มหาวิทยาลัยขอนแก่นสำหรับน้องใหม่",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#fdfbfb",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="th"
      className={`${latin.variable} ${thai.variable} h-full antialiased`}
    >
      <body className="h-full overflow-hidden">{children}</body>
    </html>
  );
}
