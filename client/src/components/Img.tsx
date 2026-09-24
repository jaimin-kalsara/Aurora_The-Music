import { useEffect, useRef, useState, type ImgHTMLAttributes } from 'react';

const FALLBACK =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="#141415"/><path fill="#3a3a3c" d="M42 26v37.5A11 11 0 1 0 48 74V38h18V26H42z"/></svg>',
  );

/** 16:9 HD frames don't exist for every video; fall back to the standard thumbnail first. */
const retryUrl = (url: string) => (url.includes('/hq720.jpg') ? url.replace('/hq720.jpg', '/hqdefault.jpg') : null);

/** Image that fades in once loaded and degrades gracefully when the source fails. */
export function Img({ src, alt = '', className = '', ...rest }: ImgHTMLAttributes<HTMLImageElement>) {
  const ref = useRef<HTMLImageElement>(null);
  const [current, setCurrent] = useState(src);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setCurrent(src);
    setLoaded(false);
    setFailed(false);
  }, [src]);

  useEffect(() => {
    // Cached images can finish before the load listener is attached; reconcile with the element state.
    const el = ref.current;
    if (el && el.complete && el.naturalWidth > 0) setLoaded(true);
  }, [current]);

  return (
    <img
      {...rest}
      ref={ref}
      src={failed || !current ? FALLBACK : current}
      alt={alt}
      loading={rest.loading ?? 'lazy'}
      decoding="async"
      className={`${className} ${loaded || failed ? 'loaded' : ''}`}
      onLoad={() => setLoaded(true)}
      onError={() => {
        const next = current ? retryUrl(current) : null;
        if (next) setCurrent(next);
        else setFailed(true);
      }}
    />
  );
}
