/** Original brand mark: a small heraldic shield with a crossed sword and lance. */
export function Crest({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      width={size}
      height={size}
      aria-hidden="true"
      className={className}
    >
      <path
        d="M20 2 35 7v13c0 9-6.5 15.5-15 19C11.5 35.5 5 29 5 20V7z"
        fill="oklch(var(--card))"
        stroke="oklch(var(--primary))"
        strokeWidth="2.2"
      />
      <path
        d="M12 28 28 12M28 28 12 12"
        fill="none"
        stroke="oklch(var(--primary))"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      <circle cx="20" cy="20" r="2.4" fill="oklch(var(--primary))" />
    </svg>
  );
}
