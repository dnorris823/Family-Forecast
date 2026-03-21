import type { Metadata } from "next";
import { Inter, Roboto_Mono, Playfair_Display } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { cn } from "@/lib/utils";

const inter = Inter({ subsets: ["latin"] });
const robotoMono = Roboto_Mono({ subsets: ["latin"], variable: "--font-mono" });
const playfairDisplay = Playfair_Display({ subsets: ["latin"], style: ["italic"], variable: "--font-display" });

export const metadata: Metadata = {
  title: "Family Forecast",
  description: "AI-Powered Family Planner",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={cn(inter.className, robotoMono.variable, playfairDisplay.variable, "min-h-screen bg-background antialiased")}>
        <Providers>{children}</Providers>
        ,</body>
    </html>
  );
}
