type EmptyStateProps = {
  title?: string;
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
};

export function EmptyState({ title, message, action }: EmptyStateProps) {
  return (
    <div className="section text-center">
      {title && <h3 className="section-title mb-sm">{title}</h3>}
      <p className="section-subtitle mb-md">{message}</p>
      {action && (
        <button type="button" className="btn btn--primary" onClick={action.onClick}>
          {action.label}
        </button>
      )}
    </div>
  );
}
