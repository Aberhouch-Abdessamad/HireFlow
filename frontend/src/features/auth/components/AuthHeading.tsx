import type { ReactNode } from 'react';

export function AuthHeading({ title, subtitle }: { title: string; subtitle?: ReactNode }) {
  return (
    <div className="mb-8">
      <h1 className="m-0 text-[28px] leading-tight font-semibold tracking-tight text-slate-900">
        {title}
      </h1>
      {subtitle ? <p className="mt-2 mb-0 text-[15px] text-slate-500">{subtitle}</p> : null}
    </div>
  );
}
