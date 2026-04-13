import { notFound } from 'next/navigation';
import { pool } from '@/lib/db';
import BookingWizard from '@/components/BookingWizard';

export default async function BookPage({ params }: { params: { id: string } }) {
  const { rows } = await pool.query(
    `SELECT s.id, s.title, s.price, s.provider_id FROM services s WHERE s.id = $1`,
    [params.id]
  );

  if (rows.length === 0) notFound();
  const service = rows[0];

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <h1 className="text-2xl font-bold mb-2">{service.title}</h1>
      <p className="text-[var(--muted)] mb-6">Complete your booking details below.</p>
      <BookingWizard
        serviceId={service.id}
        providerId={service.provider_id}
        serviceTitle={service.title}
        price={parseFloat(service.price)}
      />
    </div>
  );
}
