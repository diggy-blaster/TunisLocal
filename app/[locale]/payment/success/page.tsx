export default async function PaymentSuccess({ searchParams }: { searchParams: Promise<{ payment_id?: string }> }) {
  const { payment_id } = await searchParams;

  return (
    <div className="container mx-auto px-4 py-12 text-center">
      <div className="text-green-600 text-6xl mb-4">✅</div>
      <h1 className="text-2xl font-bold mb-2">Payment Successful</h1>
      <p className="text-[var(--muted)] mb-6">Your booking is confirmed. You'll receive a notification shortly.</p>
      {payment_id && <p className="text-sm text-[var(--muted)] mb-4">Payment ID: {payment_id}</p>}
      <a href="/bookings" className="btn-primary">View Bookings</a>
    </div>
  );
}
