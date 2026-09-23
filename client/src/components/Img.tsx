import { useEffect, useRef, useState, type ImgHTMLAttributes } from 'react';

const FALLBACK =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="#1c1c1f"/><path fill="#3a3a3f" d="M42 26v37.5A11 11 0 1 0 48 74V38h18V26H42z"/></svg>',
  );

/** Image that fades in once loaded and degrades to a neutral placeholder on error. */
export function Img({ src, alt = '', className = '', ...rest }: ImgHTMLAttributes<HTMLImageElement>) {
  const ref = useRef<HTMLImageElement>(null);
  const prevSrc = useRef(src);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (prevSrc.current !== src) {
      prevSrc.current = src;
      setLoaded(false);
      setFailed(false);
    }
    // Cached images can finish before the load listener is attached; reconcile with the element state.
    const el = ref.current;
    if (el && el.complete && el.naturalWidth > 0) setLoaded(true);
  }, [src]);

  return (
    <img
      {...rest}
      ref={ref}
      src={failed || !src ? FALLBACK : src}
      alt={alt}
      loading={rest.loading ?? 'lazy'}
      decoding="async"
      className={`${className} ${loaded || failed ? 'loaded' : ''}`}
      onLoad={() => setLoaded(true)}
      onError={() => setFailed(true)}
    />
  );
}
