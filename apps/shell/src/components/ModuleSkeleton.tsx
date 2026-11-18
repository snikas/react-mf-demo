export function ModuleSkeleton({ title }: { title: string }) {
  return (
    <div className="shell-skeleton" role="status" aria-live="polite">
      <span className="shell-visually-hidden">Loading {title}…</span>
      <div className="shell-skeleton__bar" style={{ width: '40%' }} />
      <div className="shell-skeleton__bar" />
      <div className="shell-skeleton__bar" style={{ width: '85%' }} />
      <div className="shell-skeleton__bar" style={{ width: '70%' }} />
    </div>
  );
}
