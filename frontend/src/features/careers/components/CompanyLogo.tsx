interface CompanyLogoProps {
  name: string;
  logoUrl?: string | null;
  size?: 'md' | 'lg' | 'xl';
}

const SIZES = {
  md: 'h-12 w-12 text-lg rounded-lg',
  lg: 'h-16 w-16 text-2xl rounded-xl',
  xl: 'h-20 w-20 text-3xl rounded-xl',
};

/** Company logo, or the company's initial on a soft blue tile when no logo is uploaded. */
export function CompanyLogo({ name, logoUrl, size = 'md' }: CompanyLogoProps) {
  return logoUrl ? (
    <img
      src={logoUrl}
      alt={`${name} logo`}
      className={`shrink-0 bg-white object-cover ring-1 ring-border ${SIZES[size]}`}
    />
  ) : (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center bg-primary-soft font-bold text-primary ring-1 ring-indigo-100 ${SIZES[size]}`}
    >
      {name.charAt(0).toUpperCase()}
    </span>
  );
}
