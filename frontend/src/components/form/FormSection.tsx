import type { ReactNode } from 'react';

interface FormSectionProps {
  title: string;
  description?: ReactNode;
  children: ReactNode;
}

/** Two-column form section: explanation on the left, fields in a panel on the right. */
export function FormSection({ title, description, children }: FormSectionProps) {
  return (
    <section className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-8">
      <div className="lg:pt-1">
        <h2 className="m-0 text-[15px] font-semibold text-slate-900">{title}</h2>
        {description ? (
          <p className="mt-1 mb-0 text-[13px] leading-relaxed text-slate-500">{description}</p>
        ) : null}
      </div>
      <div className="hf-surface p-5 pb-1 sm:p-6 sm:pb-2">{children}</div>
    </section>
  );
}

/** Sticky footer bar for form actions. */
export function FormActions({ children, hint }: { children: ReactNode; hint?: ReactNode }) {
  return (
    <div className="sticky bottom-0 z-10 -mx-4 mt-2 border-t border-border bg-white/90 px-4 py-3 backdrop-blur-md md:-mx-8 md:px-8">
      <div className="flex flex-wrap items-center justify-end gap-3">
        {hint ? <span className="mr-auto text-[13px] text-slate-500">{hint}</span> : null}
        {children}
      </div>
    </div>
  );
}
