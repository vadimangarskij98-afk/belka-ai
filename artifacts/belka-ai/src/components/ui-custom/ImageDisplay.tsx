import { useState } from "react";

interface ImageDisplayProps {
  src: string;
  alt?: string;
  className?: string;
}

export function ImageDisplay({ src, alt = "image", className = "" }: ImageDisplayProps) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  if (error) return null;

  return (
    <div className={`rounded-xl overflow-hidden border border-border my-2 ${className}`}>
      {!loaded && (
        <div className="w-full h-48 bg-muted/30 animate-pulse flex items-center justify-center">
          <span className="text-xs text-muted-foreground">Loading...</span>
        </div>
      )}
      <img
        src={src}
        alt={alt}
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
        className={`max-w-full h-auto ${loaded ? "block" : "hidden"}`}
      />
    </div>
  );
}
