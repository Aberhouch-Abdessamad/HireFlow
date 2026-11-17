interface BrandProps {
  collapsed?: boolean;
  inverted?: boolean;
}

/** HireFlow logo: an indigo mark with two flowing strokes, plus the wordmark. */
export function Brand({ collapsed = false, inverted = false }: BrandProps) {
  return (
    <div className="flex items-center gap-2.5">
      <span
        aria-hidden="true"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary"
      >
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
          <path
            d="M5 7.5h8.5a3.5 3.5 0 0 1 0 7H10"
            stroke="white"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
          <path
            d="M19 16.5h-8.5a3.5 3.5 0 0 1 0-7H14"
            stroke="white"
            strokeOpacity=".55"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
        </svg>
      </span>
      {collapsed ? null : (
        <span
          className={`text-[19px] font-extrabold tracking-tight ${inverted ? 'text-white' : 'text-primary'}`}
        >
          HireFlow
        </span>
      )}
    </div>
  );
}
