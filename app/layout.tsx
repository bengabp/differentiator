import type { Metadata } from "next";
import { Montserrat, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SiteHeader } from "@/components/site-header";
import { SettingsDialog } from "@/components/settings-dialog";
import { SettingsDialogProvider } from "@/lib/settings-dialog";

const montserrat = Montserrat({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Differentiator",
  description:
    "Compare two PDFs or images and surface every visual and textual difference.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`dark ${montserrat.variable} ${jetbrainsMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full bg-background text-foreground flex flex-col font-sans">
        <TooltipProvider delay={150}>
          <SettingsDialogProvider>
            <SiteHeader />
            <main className="flex-1 flex flex-col">{children}</main>
            <SettingsDialog />
            <Toaster theme="dark" position="bottom-right" richColors />
          </SettingsDialogProvider>
        </TooltipProvider>
      </body>
    </html>
  );
}
