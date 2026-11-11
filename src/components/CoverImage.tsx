import { useEffect, useState } from 'react';

interface CoverImageProps {
  src: string;
  fallbackSrc?: string;
  alt: string;
  className?: string;
  eager?: boolean;
}

export function CoverImage({ src, fallbackSrc, alt, className, eager = false }: CoverImageProps) {
  const [activeSrc, setActiveSrc] = useState(src);

  useEffect(() => {
    setActiveSrc(src);
  }, [src]);

  return (
    <img
      src={activeSrc}
      alt={alt}
      className={className}
      loading={eager ? 'eager' : 'lazy'}
      onError={() => {
        if (fallbackSrc && activeSrc !== fallbackSrc) {
          setActiveSrc(fallbackSrc);
        }
      }}
    />
  );
}
