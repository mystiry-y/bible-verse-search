import React from "react";

export function AutoSizedVerse({ text, fontSize, color }: { text: string; fontSize: number; color: string }) {
  return (
    <span
      style={{
        fontSize: fontSize + "px",
        color: color || '#000',
        fontWeight: 900, // Black typeface (heaviest)
        display: "inline-block",
        width: "100%",
        textAlign: "center",
        wordBreak: "break-word",
        whiteSpace: "pre-line",
        lineHeight: 1.15,
      }}
    >
      {text}
    </span>
  );
}
