"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { AppSheet } from "@/components/app-sheet";

export function AppHeader() {
  const pathname = usePathname();
  const [sheetOpen, setSheetOpen] = useState(false);

  // Don't show on auth pages
  if (pathname.startsWith("/auth")) {
    return null;
  }

  return (
    <>
      <AppSheet open={sheetOpen} onOpenChange={setSheetOpen} />
      <button
        onClick={() => setSheetOpen(true)}
        className="fixed top-4 right-4 z-50 p-2 rounded-md bg-gray-900/80 dark:bg-gray-800/80 text-gray-200 hover:bg-gray-800 dark:hover:bg-gray-700 backdrop-blur-sm shadow-md transition-colors"
        aria-label="Abrir menú"
      >
        <Menu size={22} />
      </button>
    </>
  );
}
