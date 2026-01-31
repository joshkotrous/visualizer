import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AudioProvider } from "./contexts/AudioContext";
import BloomEffect from "./components/shaders/BloomEffect";
import ColoredNoiseOverlay from "./components/shaders/ColoredNoiseOverlay";
import TFTOverlay from "./components/shaders/TFTOverlay";
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Audio Visualizer",
  description: "Real-time audio visualization using shaders",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AudioProvider>{children}</AudioProvider>
      </body>
    </html>
  );
}
