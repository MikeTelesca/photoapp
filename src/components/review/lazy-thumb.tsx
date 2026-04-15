"use client";
import { useEffect, useRef, useState } from "react";

interface Props {
  src: string;
  alt: string;
  className?: string;
  imgClassName?: string;
  onClick?: () => void;
  rootMargin?: string;
}

export function LazyThumb({ src, alt, className, imgClassName = "w-full h-full object-cover", onClick, rootMargin = "200px" }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!ref.current || visible) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin }
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [visible, rootMargin]);

  return (
    <div ref={ref} onClick={onClick} className={className}>
      {visible ? (
        <img src={src} alt={alt} className={imgClassName} loading="lazy" />
      ) : (
        <div className="w-full h-full bg-graphite-100 dark:bg-graphite-800 animate-pulse" />
      )}
    </div>
  );
}
