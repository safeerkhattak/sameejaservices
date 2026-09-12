export function PageHeading({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description?: string; actions?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && <p className="text-sm font-semibold text-[#2b7a78]">{eyebrow}</p>}
        <h1 className="mt-1 text-[clamp(1.75rem,3vw,2.45rem)] font-bold tracking-[-0.045em] text-[#102a43]">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-[15px] text-slate-500">{description}</p>}
      </div>
      {actions && <div className="flex gap-3">{actions}</div>}
    </div>
  );
}
