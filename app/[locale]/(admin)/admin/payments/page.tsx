'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';

interface Payment {
  id: string;
  booking_id: string;
  customer_name: string;
  customer_email: string;
  service_title: string;
  provider: string;
  amount_tnd: string;
  status: string;
  initiated_at: string;
}

interface DashboardData {
  payments: Payment[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export default function AdminPaymentsPage() {
  const t = useTranslations('admin.payments');
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: searchParams.get('status') || '',
    provider: searchParams.get('provider') || '',
    dateFrom: searchParams.get('dateFrom') || '',
    dateTo: searchParams.get('dateTo') || '',
    search: searchParams.get('search') || '',
    page: parseInt(searchParams.get('page') || '1', 10),
  });

  const fetchPayments = async () => {
    setLoading(true);
    const qs = new URLSearchParams();
    if (filters.status) qs.set('status', filters.status);
    if (filters.provider) qs.set('provider', filters.provider);
    if (filters.dateFrom) qs.set('dateFrom', filters.dateFrom);
    if (filters.dateTo) qs.set('dateTo', filters.dateTo);
    if (filters.search) qs.set('search', filters.search);
    qs.set('page', filters.page.toString());
    qs.set('limit', '20');

    const res = await fetch(`/api/admin/payments?${qs}`);
    if (res.ok) {
      setData(await res.json());
    } else {
      setData({ payments: [], total: 0, page: filters.page, limit: 20, totalPages: 0 });
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPayments();
  }, [filters.page, filters.status, filters.provider, filters.dateFrom, filters.dateTo, filters.search]);

  const updateFilter = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value, page: 1 }));
    const qs = new URLSearchParams();
    const nextState = { ...filters, [key]: value, page: 1 };
    if (nextState.status) qs.set('status', nextState.status);
    if (nextState.provider) qs.set('provider', nextState.provider);
    if (nextState.dateFrom) qs.set('dateFrom', nextState.dateFrom);
    if (nextState.dateTo) qs.set('dateTo', nextState.dateTo);
    if (nextState.search) qs.set('search', nextState.search);
    qs.set('page', '1');
    router.push(`?${qs.toString()}`, { scroll: false });
  };

  const statusColors: Record<string, string> = {
    succeeded: 'bg-green-100 text-green-800 border-green-200',
    pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    failed: 'bg-red-100 text-red-800 border-red-200',
    refunded: 'bg-purple-100 text-purple-800 border-purple-200',
    expired: 'bg-gray-100 text-gray-800 border-gray-200',
  };

  if (loading && !data) return <div className="p-8 text-center text-[var(--muted)]">{t('loading') || 'Loading...'}</div>;

  const totalRevenue = data?.payments.reduce((sum, p) => sum + (p.status === 'succeeded' ? parseFloat(p.amount_tnd) : 0), 0) || 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 w-full md:w-auto">
          {[
            { key: 'total', val: data?.total || 0 },
            { key: 'succeeded', val: data?.payments.filter(p => p.status === 'succeeded').length },
            { key: 'pending', val: data?.payments.filter(p => p.status === 'pending').length },
            { key: 'revenue', val: `${totalRevenue.toFixed(2)} TND` },
          ].map(m => (
            <div key={m.key} className="bg-white p-3 rounded-lg border text-center">
              <p className="text-xs text-[var(--muted)] uppercase">{t(`metrics.${m.key}`)}</p>
              <p className="text-lg font-bold">{m.val}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl border grid grid-cols-1 md:grid-cols-5 gap-3">
        <div className="relative">
          <Search className="absolute top-2.5 start-3 text-[var(--muted)]" size={18} />
          <input
            type="text"
            placeholder={t('filters.search')}
            value={filters.search}
            onChange={e => updateFilter('search', e.target.value)}
            className="input ps-10 w-full"
          />
        </div>
        <select value={filters.status} onChange={e => updateFilter('status', e.target.value)} className="input">
          <option value="">{t('filters.status')}</option>
          {['pending', 'succeeded', 'failed', 'refunded', 'expired'].map(s => (
            <option key={s} value={s}>{t(`statuses.${s}`)}</option>
          ))}
        </select>
        <select value={filters.provider} onChange={e => updateFilter('provider', e.target.value)} className="input">
          <option value="">{t('filters.provider')}</option>
          {['flouci', 'd17', 'online_bank', 'cash'].map(p => (
            <option key={p} value={p}>{t(`providers.${p}`)}</option>
          ))}
        </select>
        <input type="date" value={filters.dateFrom} onChange={e => updateFilter('dateFrom', e.target.value)} className="input" />
        <input type="date" value={filters.dateTo} onChange={e => updateFilter('dateTo', e.target.value)} className="input" />
      </div>

      <div className="bg-white border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-start">
            <thead className="bg-[var(--bg-secondary)] border-b">
              <tr>
                {['id', 'customer', 'service', 'provider', 'amount', 'status', 'date'].map(col => (
                  <th key={col} className="px-4 py-3 font-medium text-[var(--muted)] whitespace-nowrap">{t(`table.${col}`)}</th>
                ))}
                <th className="px-4 py-3 font-medium text-[var(--muted)]">{t('table.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data?.payments.map(p => (
                <tr key={p.id} className="hover:bg-[var(--bg-secondary)]/50 transition">
                  <td className="px-4 py-3 font-mono text-xs text-[var(--muted)]">{p.id.slice(0, 8)}...</td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{p.customer_name}</div>
                    <div className="text-xs text-[var(--muted)]">{p.customer_email}</div>
                  </td>
                  <td className="px-4 py-3">{p.service_title}</td>
                  <td className="px-4 py-3 capitalize">{t(`providers.${p.provider}`)}</td>
                  <td className="px-4 py-3 font-semibold">{p.amount_tnd} TND</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full border ${statusColors[p.status]}`}>
                      {t(`statuses.${p.status}`)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[var(--muted)]">{new Date(p.initiated_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <button className="p-2 hover:bg-gray-100 rounded transition" title="View Details">
                      <ExternalLink size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!loading && data?.payments.length === 0 && (
          <div className="p-8 text-center text-[var(--muted)]">{t('noResults')}</div>
        )}

        {data && data.totalPages > 1 && (
          <div className="flex flex-col md:flex-row justify-between items-center px-4 py-3 border-t bg-[var(--bg-secondary)]/30 gap-3">
            <p className="text-sm text-[var(--muted)]">
              {t('pagination.showing', {
                from: (data.page - 1) * data.limit + 1,
                to: Math.min(data.page * data.limit, data.total),
                total: data.total,
              })}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setFilters(f => ({ ...f, page: f.page - 1 }))}
                disabled={data.page === 1}
                className="btn-primary px-3 py-1.5 text-sm disabled:opacity-50"
              >
                <ChevronLeft size={16} /> {t('pagination.prev')}
              </button>
              <button
                onClick={() => setFilters(f => ({ ...f, page: f.page + 1 }))}
                disabled={data.page === data.totalPages}
                className="btn-primary px-3 py-1.5 text-sm disabled:opacity-50"
              >
                {t('pagination.next')} <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
