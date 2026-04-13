export default function Footer() {
  return (
    <footer className="border-t border-[var(--border)] py-8 mt-auto">
      <div className="container mx-auto px-4 text-center text-sm text-[var(--muted)]">
        <p>© {new Date().getFullYear()} TunisLocal. All rights reserved.</p>
        <div className="flex justify-center gap-4 mt-2">
          <a href="#" className="hover:text-[var(--accent)]">Privacy</a>
          <a href="#" className="hover:text-[var(--accent)]">Terms</a>
          <a href="#" className="hover:text-[var(--accent)]">Contact</a>
        </div>
      </div>
    </footer>
  );
}
