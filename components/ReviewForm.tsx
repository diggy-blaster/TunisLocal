'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslations } from 'next-intl';
import { Star, Loader2, AlertCircle, CheckCircle } from 'lucide-react';

export default function ReviewForm({
  bookingId,
  onSuccess,
}: {
  bookingId: string;
  onSuccess?: () => void;
}) {
  const t = useTranslations('reviews');
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<'success' | 'error' | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const schema = z.object({
    rating: z.number().min(1).max(5),
    comment: z.string().min(10, { message: t('minCommentLength') || 'Comment too short' }).optional().or(z.literal('')),
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { rating: 0, comment: '' },
  });

  const rating = watch('rating');

  const onSubmit = async ( { rating: number; comment?: string }) => {
    setSubmitting(true);
    setStatus(null);
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ booking_id: bookingId, ...data }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || t('submitFailed'));
      
      setStatus('success');
      onSuccess?.();
    } catch (err: any) {
      setStatus('error');
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="bg-white p-6 rounded-xl border space-y-4 max-w-lg">
      <h2 className="text-xl font-bold">{t('writeReview')}</h2>

      {/* Star Rating */}
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => setValue('rating', star)}
            className={`text-3xl transition ${star <= rating ? 'text-yellow-400' : 'text-gray-300'}`}
            aria-label={`${star} stars`}
          >
            <Star fill={star <= rating ? 'currentColor' : 'none'} />
          </button>
        ))}
      </div>
      {errors.rating && <p className="text-red-500 text-sm">{errors.rating.message}</p>}

      {/* Comment */}
      <div>
        <label className="block text-sm font-medium mb-1">{t('comment')}</label>
        <textarea
          {...register('comment')}
          className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
          rows={4}
          placeholder={t('commentPlaceholder') || 'Share your experience...'}
        />
        {errors.comment && <p className="text-red-500 text-sm mt-1">{errors.comment.message}</p>}
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={submitting || rating === 0}
        className="w-full py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition flex items-center justify-center gap-2"
      >
        {submitting ? <Loader2 className="animate-spin" /> : t('submit')}
      </button>

      {/* Feedback */}
      {status === 'success' && (
        <div className="flex items-center gap-2 text-green-600 bg-green-50 p-3 rounded-lg">
          <CheckCircle size={18} /> <span>{t('success')}</span>
        </div>
      )}
      {status === 'error' && (
        <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg">
          <AlertCircle size={18} /> <span>{errorMsg}</span>
        </div>
      )}
    </form>
  );
}
