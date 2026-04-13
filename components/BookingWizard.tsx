'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslations } from 'next-intl';
import { Calendar, Clock, CreditCard, Wallet, Banknote, Globe, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

type BookingFormValues = {
  scheduled_date: string;
  scheduled_time: string;
  notes?: string;
  payment_provider: 'flouci' | 'd17' | 'cash' | 'online_bank';
};

const PROVIDERS = ['flouci', 'd17', 'cash', 'online_bank'] as const;

export default function BookingWizard({
  serviceId,
  providerId,
  serviceTitle,
  price,
}: {
  serviceId: string;
  providerId: string;
  serviceTitle: string;
  price: number;
}) {
  const t = useTranslations('booking');
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  // ✅ Fixed Zod schema: removed invalid `required_error`, used `.refine()` for custom message
  const schema = z.object({
    scheduled_date: z.string().min(1, t('validation.dateRequired')),
    scheduled_time: z.string().min(1, t('validation.timeRequired')),
    notes: z.string().optional(),
    payment_provider: z.enum(PROVIDERS),
  }).refine((data) => data.payment_provider, {
    message: t('validation.providerRequired'),
    path: ['payment_provider'],
  });

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<BookingFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      scheduled_date: '',
      scheduled_time: '',
      notes: '',
      payment_provider: undefined as any,
    },
  });

  const selectedProvider = watch('payment_provider');
  const watchedDate = watch('scheduled_date');
  const watchedTime = watch('scheduled_time');

  const onSubmit = async (data: BookingFormValues) => {
    setLoading(true);
    setStatus('idle');
    setErrorMsg('');
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_id: serviceId,
          provider_id: providerId,
          scheduled_at: `${data.scheduled_date}T${data.scheduled_time}`,
          notes: data.notes,
          payment_provider: data.payment_provider,
        }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || t('error'));

      setStatus('success');
      // Redirect to payment gateway (skip for cash)
      if (result.payment?.gateway_link && data.payment_provider !== 'cash') {
        window.location.href = result.payment.gateway_link;
      }
    } catch (err: any) {
      setStatus('error');
      setErrorMsg(err.message || t('error'));
    } finally {
      setLoading(false);
    }
  };

  const canProceedStep1 = watchedDate && watchedTime && !errors.scheduled_date && !errors.scheduled_time;
  const canProceedStep2 = selectedProvider && !errors.payment_provider;

  if (status === 'success') {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center space-y-3">
        <CheckCircle className="mx-auto text-green-600" size={48} />
        <h3 className="text-xl font-bold text-green-800">{t('success')}</h3>
        <p className="text-green-700">Booking ID will be updated once payment completes.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="bg-white border border-[var(--border)] rounded-xl p-6 space-y-6 max-w-2xl">
      {/* Progress Indicator */}
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xl font-bold">{t('title')}</h2>
        <div className="flex gap-2 text-sm font-medium text-[var(--muted)]">
          {[1, 2, 3].map((s) => (
            <div key={s} className={`w-8 h-8 rounded-full flex items-center justify-center transition ${step === s ? 'bg-[var(--accent)] text-white' : step > s ? 'bg-green-100 text-green-700' : 'bg-gray-100'}`}>
              {step > s ? <CheckCircle size={16} /> : s}
            </div>
          ))}
        </div>
      </div>

      {/* Step 1: Schedule */}
      {step === 1 && (
        <div className="space-y-4">
          <h3 className="font-semibold text-lg">{t('step1.title')}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">{t('step1.date')}</label>
              <div className="relative">
                <Calendar className="absolute top-3 start-3 text-[var(--muted)]" size={18} />
                <input type="date" {...register('scheduled_date')} min={new Date().toISOString().split('T')[0]} className="input ps-10" />
              </div>
              {errors.scheduled_date && <p className="text-red-500 text-xs mt-1">{errors.scheduled_date.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{t('step1.time')}</label>
              <div className="relative">
                <Clock className="absolute top-3 start-3 text-[var(--muted)]" size={18} />
                <input type="time" {...register('scheduled_time')} className="input ps-10" />
              </div>
              {errors.scheduled_time && <p className="text-red-500 text-xs mt-1">{errors.scheduled_time.message}</p>}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{t('step1.notes')}</label>
            <textarea {...register('notes')} className="input" rows={3} placeholder={t('step1.notes') || 'Additional notes...'} />
          </div>
          <button type="button" onClick={() => canProceedStep1 && setStep(2)} disabled={!canProceedStep1} className="btn-primary w-full">
            {t('step1.next')}
          </button>
        </div>
      )}

      {/* Step 2: Payment Method */}
      {step === 2 && (
        <div className="space-y-4">
          <h3 className="font-semibold text-lg">{t('step2.title')}</h3>
          <p className="text-sm text-[var(--muted)]">{t('step2.select')}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {PROVIDERS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setValue('payment_provider', p, { shouldValidate: true })}
                className={`p-4 border rounded-lg text-start flex items-center gap-3 transition ${selectedProvider === p ? 'border-[var(--accent)] bg-[var(--accent)]/5 ring-1 ring-[var(--accent)]' : 'hover:border-[var(--accent)]'}`}
              >
                {p === 'flouci' && <Wallet size={20} />}
                {p === 'd17' && <CreditCard size={20} />}
                {p === 'cash' && <Banknote size={20} />}
                {p === 'online_bank' && <Globe size={20} />}
                <span className="font-medium">{t(`providers.${p}`)}</span>
              </button>
            ))}
          </div>
          {errors.payment_provider && <p className="text-red-500 text-sm">{errors.payment_provider.message}</p>}
          <div className="flex gap-3">
            <button type="button" onClick={() => setStep(1)} className="flex-1 py-2 border rounded-lg hover:bg-[var(--bg-secondary)] transition">
              {t('step3.back')}
            </button>
            <button type="button" onClick={() => canProceedStep2 && setStep(3)} disabled={!canProceedStep2} className="btn-primary flex-1">
              {t('step2.next')}
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Summary & Confirm */}
      {step === 3 && (
        <div className="space-y-4">
          <h3 className="font-semibold text-lg">{t('step3.title')}</h3>
          <div className="bg-[var(--bg-secondary)] rounded-lg p-4 space-y-2 text-sm">
            <div className="flex justify-between"><span>{t('step1.date')}</span><span className="font-medium">{watchedDate}</span></div>
            <div className="flex justify-between"><span>{t('step1.time')}</span><span className="font-medium">{watchedTime}</span></div>
            <div className="flex justify-between"><span>{t('step2.title')}</span><span className="font-medium">{t(`providers.${selectedProvider}`)}</span></div>
            {watch('notes') && (
              <div className="border-t border-[var(--border)] pt-2 mt-2">
                <span className="text-[var(--muted)]">{t('step1.notes')}</span>
                <p className="mt-1">{watch('notes')}</p>
              </div>
            )}
            <div className="border-t border-[var(--border)] pt-2 mt-2 flex justify-between text-base font-bold">
              <span>{t('step3.total')}</span>
              <span className="text-[var(--accent)]">{price.toFixed(2)} TND</span>
            </div>
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={() => setStep(2)} className="flex-1 py-2 border rounded-lg hover:bg-[var(--bg-secondary)] transition">
              {t('step3.back')}
            </button>
            <button type="submit" disabled={loading} className="btn-primary flex-1 flex items-center justify-center gap-2">
              {loading ? <Loader2 className="animate-spin" /> : <><CheckCircle size={16} /> {t('step3.confirm')}</>}
            </button>
          </div>
        </div>
      )}

      {status === 'error' && (
        <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg text-sm">
          <AlertCircle size={16} /> {errorMsg}
        </div>
      )}
    </form>
  );
}