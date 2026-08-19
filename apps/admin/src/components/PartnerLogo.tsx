/** Optional Kavach / Asian Paints partner mark for dashboards. */
export function PartnerLogo({
  src,
  className = 'h-10 w-auto object-contain',
  alt = 'Kavach',
}: {
  src?: string | null;
  className?: string;
  alt?: string;
}) {
  if (src) {
    return <img src={src} alt={alt} className={className} />;
  }

  // Built-in Kavach-style mark when no custom URL is configured
  return (
    <svg viewBox="0 0 160 48" className={className} role="img" aria-label={alt}>
      <rect width="160" height="48" rx="8" fill="#ED1C24" />
      <text
        x="80"
        y="30"
        textAnchor="middle"
        fill="#fff"
        fontFamily="system-ui, sans-serif"
        fontSize="18"
        fontWeight="700"
      >
        KAVACH
      </text>
    </svg>
  );
}
