
"use client";
import React, { useEffect, useState } from "react";

const themes = [
  {
    name: "Classic Light",
    className: "theme-light",
    colors: {
      "--background": "#ffffff",
      "--foreground": "#2d3748",
      "--surface": "#f7fafc",
      "--surface-hover": "#edf2f7",
      "--border": "#e2e8f0",
      "--primary": "#3182ce",
      "--primary-hover": "#2c5aa0",
      "--secondary": "#718096",
      "--accent": "#38b2ac",
      "--success": "#38a169",
      "--warning": "#d69e2e",
      "--error": "#e53e3e",
      "--shadow": "rgba(0, 0, 0, 0.1)",
    },
  },
  {
    name: "Modern Dark",
    className: "theme-dark",
    colors: {
      "--background": "#1a202c",
      "--foreground": "#f7fafc",
      "--surface": "#2d3748",
      "--surface-hover": "#4a5568",
      "--border": "#4a5568",
      "--primary": "#63b3ed",
      "--primary-hover": "#90cdf4",
      "--secondary": "#a0aec0",
      "--accent": "#4fd1c7",
      "--success": "#68d391",
      "--warning": "#f6e05e",
      "--error": "#fc8181",
      "--shadow": "rgba(0, 0, 0, 0.3)",
    },
  },
  {
    name: "Ocean Light",
    className: "theme-ocean-light",
    colors: {
      "--background": "#f0f9ff",
      "--foreground": "#0c4a6e",
      "--surface": "#e0f2fe",
      "--surface-hover": "#bae6fd",
      "--border": "#7dd3fc",
      "--primary": "#0284c7",
      "--primary-hover": "#0369a1",
      "--secondary": "#64748b",
      "--accent": "#06b6d4",
      "--success": "#059669",
      "--warning": "#d97706",
      "--error": "#dc2626",
      "--shadow": "rgba(2, 132, 199, 0.1)",
    },
  },
  {
    name: "Midnight",
    className: "theme-midnight",
    colors: {
      "--background": "#0f172a",
      "--foreground": "#f1f5f9",
      "--surface": "#1e293b",
      "--surface-hover": "#334155",
      "--border": "#475569",
      "--primary": "#60a5fa",
      "--primary-hover": "#93c5fd",
      "--secondary": "#94a3b8",
      "--accent": "#34d399",
      "--success": "#10b981",
      "--warning": "#fbbf24",
      "--error": "#f87171",
      "--shadow": "rgba(0, 0, 0, 0.5)",
    },
  },
  {
    name: "Warm Light",
    className: "theme-warm-light",
    colors: {
      "--background": "#fffbeb",
      "--foreground": "#92400e",
      "--surface": "#fef3c7",
      "--surface-hover": "#fde68a",
      "--border": "#f59e0b",
      "--primary": "#d97706",
      "--primary-hover": "#b45309",
      "--secondary": "#78716c",
      "--accent": "#dc2626",
      "--success": "#16a34a",
      "--warning": "#ea580c",
      "--error": "#dc2626",
      "--shadow": "rgba(217, 119, 6, 0.1)",
    },
  },
  {
    name: "Purple Dark",
    className: "theme-purple-dark",
    colors: {
      "--background": "#1e1b4b",
      "--foreground": "#e0e7ff",
      "--surface": "#312e81",
      "--surface-hover": "#3730a3",
      "--border": "#6366f1",
      "--primary": "#818cf8",
      "--primary-hover": "#a5b4fc",
      "--secondary": "#94a3b8",
      "--accent": "#f472b6",
      "--success": "#34d399",
      "--warning": "#fbbf24",
      "--error": "#fb7185",
      "--shadow": "rgba(99, 102, 241, 0.2)",
    },
  },
];

export default function ThemeSwitcher() {
  const [theme, setTheme] = useState<string>("");
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    // Load theme from localStorage only on client
    const savedTheme = localStorage.getItem("theme") || themes[0].className;
    setTheme(savedTheme);
  }, []);

  useEffect(() => {
    if (!isClient || !theme) return;
    
    const selected = themes.find((t) => t.className === theme) || themes[0];
    Object.entries(selected.colors).forEach(([key, value]) => {
      document.documentElement.style.setProperty(key, value);
    });
    document.documentElement.className = selected.className;
    localStorage.setItem("theme", selected.className);
  }, [theme, isClient]);

  // Prevent hydration mismatch by not rendering until client-side
  if (!isClient || !theme) {
    return (
      <div style={{ 
        display: "flex", 
        gap: 8, 
        alignItems: "center",
        fontSize: "0.875rem",
        fontWeight: "500"
      }}>
        <span style={{ color: "var(--secondary)", whiteSpace: "nowrap" }}>Theme:</span>
        <div style={{ 
          padding: "4px 8px",
          borderRadius: "6px",
          border: "1px solid var(--border)",
          background: "var(--background)",
          minWidth: "140px",
          height: "28px"
        }} />
      </div>
    );
  }

  return (
    <div style={{ 
      display: "flex", 
      gap: 8, 
      alignItems: "center",
      fontSize: "0.875rem",
      fontWeight: "500"
    }}>
      <span style={{ color: "var(--secondary)", whiteSpace: "nowrap" }}>Theme:</span>
      <select
        value={theme}
        onChange={(e) => setTheme(e.target.value)}
        style={{ 
          padding: "4px 8px",
          borderRadius: "6px",
          border: "1px solid var(--border)",
          background: "var(--background)",
          color: "var(--foreground)",
          fontSize: "0.875rem",
          fontWeight: "500",
          cursor: "pointer",
          outline: "none",
          transition: "all 0.2s ease",
          minWidth: "140px"
        }}
        onMouseOver={(e) => {
          (e.target as HTMLSelectElement).style.borderColor = "var(--primary)";
        }}
        onMouseOut={(e) => {
          (e.target as HTMLSelectElement).style.borderColor = "var(--border)";
        }}
      >
        {themes.map((t) => (
          <option key={t.className} value={t.className}>
            {t.name}
          </option>
        ))}
      </select>
    </div>
  );
}
