"use client";

import { Toaster } from "sonner";
import { useTheme } from "@/context/theme/ThemeContext";

export function ThemedToaster() {
  const { isDarkMode } = useTheme();
  return <Toaster richColors position="bottom-right" theme={isDarkMode ? "dark" : "light"} />;
}
