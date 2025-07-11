import React, { useRef, useLayoutEffect, useState } from "react";

export function AutoSizedVerse({ text, fontSize, color, fontFamily }: { text: string; fontSize: number; color: string; fontFamily?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const spanRef = useRef<HTMLSpanElement>(null);
  const [fitFontSize, setFitFontSize] = useState(fontSize);

  useLayoutEffect(() => {
    if (!containerRef.current || !spanRef.current) return;
    let currentFontSize = fontSize;
    const container = containerRef.current;
    const span = spanRef.current;

    // Reset font size to requested
    span.style.fontSize = currentFontSize + "px";

    // Determine minimum font size based on container width (proxy for mobile/desktop)
    const minFontSize = container.clientWidth < 768 ? 16 : 8;
    
    // Shrink font size until it fits or hits minimum
    while (
      (span.scrollWidth > container.clientWidth || span.scrollHeight > container.clientHeight) &&
      currentFontSize > minFontSize
    ) {
      currentFontSize -= 2;
      span.style.fontSize = currentFontSize + "px";
    }
    setFitFontSize(currentFontSize);
  }, [text, fontSize]);

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      <span
        ref={spanRef}
        style={{
          fontSize: fitFontSize + "px",
          color: color || "#000",
          fontWeight: 900,
          fontFamily: fontFamily || "Arial, Helvetica, sans-serif",
          display: "block",
          textAlign: "center",
          wordBreak: "break-word",
          overflowWrap: "break-word",
          whiteSpace: "pre-line",
          lineHeight: 1.15,
          width: "100%",
        }}
      >
        {text}
      </span>
    </div>
  );
}
