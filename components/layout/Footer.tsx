export function Footer() {
  return (
    <footer className="rounded-2xl border border-[var(--border)] bg-[var(--bg-primary)] p-5 text-center text-sm text-[var(--text-secondary)] shadow-sm">
      <p>© {new Date().getFullYear()} TunisLocal. All rights reserved.</p>
    </footer>
  );
}
