import { IBM_Plex_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-display",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
});

export const metadata = {
  title: "AquaScope Intelligence",
  description:
    "Human-centered ML platform that transforms raw water samples into trusted safety intelligence.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="bg-white" data-theme="light">
      <body
        className={`${spaceGrotesk.variable} ${plexMono.variable} bg-white text-slate-900 antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
