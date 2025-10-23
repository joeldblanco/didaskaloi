import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import BottomNavigation from "@/components/bottom-navigation";
import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "sonner";
import { OfflineIndicator } from "@/components/offline-indicator";
import { OfflineSyncProvider } from "@/components/offline-sync-provider";
import { ProjectProvider } from "@/contexts/project-context";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Didaskaloi | Sistema de Gestión de Asistencia",
  description:
    "Aplicación móvil para gestión de clases, estudiantes y registro de asistencias con reportes estadísticos detallados. Optimizada para uso educativo.",
  keywords: [
    "educación",
    "asistencia",
    "gestión escolar",
    "reportes educativos",
    "nextjs",
    "aplicación móvil",
  ],
  authors: [
    {
      name: "Joel Blanco",
      url: "https://github.com/joeldblanco",
    },
  ],
  creator: "Joel Blanco",
  publisher: "Joel Blanco",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#3b82f6" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-50 dark:bg-gray-900 max-w-md mx-auto`}
      >
        <SessionProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <ProjectProvider>
              <OfflineSyncProvider>
                <OfflineIndicator />
                <main className="pb-16 h-full">{children}</main>
                <BottomNavigation />
                <Toaster position="top-center" richColors />
              </OfflineSyncProvider>
            </ProjectProvider>
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
