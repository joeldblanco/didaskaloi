import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import BottomNavigation from "@/components/bottom-navigation";
import ProtectedLayout from "@/components/protected-layout";

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
    <html lang="es">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-50 max-w-md mx-auto`}
      >
        <ProtectedLayout>
          <main className="pb-16 h-full">{children}</main>
          <BottomNavigation />
        </ProtectedLayout>
      </body>
    </html>
  );
}
