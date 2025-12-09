type LoadingStateProps = {
  message?: string;
  fullPage?: boolean;
};

export function LoadingState({
  message = 'Loading…',
  fullPage = false,
}: LoadingStateProps) {
  return (
    <div className={fullPage ? 'section flex-center' : 'section'} style={fullPage ? { minHeight: '400px' } : undefined}>
      <div className="flex-column" style={{ alignItems: 'center', gap: '0.5rem' }}>
        <div className="loading-spinner" />
        <p className="section-subtitle">{message}</p>
      </div>
    </div>
  );
}
