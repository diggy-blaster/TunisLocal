export function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center p-4">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-[var(--accent)] border-t-transparent" />
    </div>
  );
}
