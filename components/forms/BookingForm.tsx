import { FormEvent, useState } from 'react';

export function BookingForm() {
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setTimeout(() => setSubmitting(false), 500);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--bg-primary)] p-6 shadow-sm">
      <div>
        <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">Service</label>
        <input className="input" type="text" placeholder="Service name" />
      </div>
      <div>
        <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">Date</label>
        <input className="input" type="date" />
      </div>
      <button type="submit" className="btn-primary w-full" disabled={submitting}>
        {submitting ? 'Booking...' : 'Book Now'}
      </button>
    </form>
  );
}
