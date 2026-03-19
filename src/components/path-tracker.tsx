"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

export function PathTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (
      pathname &&
      pathname !== "/_offline" &&
      !pathname.startsWith("/auth")
    ) {
      localStorage.setItem("didaskaloi-last-path", pathname);
    }
  }, [pathname]);

  return null;
}
