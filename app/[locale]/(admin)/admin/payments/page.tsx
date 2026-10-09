'use client';

import { useState, useEffect, Suspense } from 'react';
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

    try {
      const res = await fetch(`/api/admin/payments?${qs}`);
      if (res.ok) {
        setData(await res.json());
      } else {
        setData({ payments: [], total: 0, page: filters.page, limit: 20, totalPages: 0 });
      }
    } catch (error) {
      console.error('Failed to fetch payments:', error);
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

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="text-gray-500">Loading payments data...</p>
      </div>
    );
  }

  const totalRevenue = data?.payments.reduce((sum, p) => sum + (p.status === 'succeeded' ? parseFloat(p.amount_tnd) : 0), 0) || 0;

  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="text-gray-500">Loading payments dashboard...</p>
      </div>
    }>
      <div className="space-y-6 p-4 md:p-8">
        {/* Header & Metrics */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <h1 className="text-2xl font-bold text-gray-900">{t('title') || 'Payment Dashboard'}</h1>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 w-full md:w-auto">
            {[
              { key: 'total', val: data?.total || 0 },
              { key: 'succeeded', val: data?.payments.filter(p => p.status === 'succeeded').length },
              { key: 'pending', val: data?.payments.filter(p => p.status === 'pending').length },
              { key: 'revenue', val: `${totalRevenue.toFixed(2)} TND` },
            ].map(m => (
              <div key={m.key} className="bg-white p-3 rounded-lg border border-gray-200 text-center shadow-sm">
                <p className="text-xs text-gray-500 uppercase font-medium">{t(`metrics.${m.key}`) || m.key}</p>
                <p className="text-lg font-bold text-gray-900">{m.val}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 grid grid-cols-1 md:grid-cols-5 gap-3 shadow-sm">
          <div className="relative">
            <Search className="absolute top-2.5 left-3 text-gray-400" size={18} />
            <input
              type="text"
              placeholder={t('filters.search') || 'Search...'}
              value={filters.search}
              onChange={e => updateFilter('search', e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
          <select value={filters.status} onChange={e => updateFilter('status', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
            <option value="">{t('filters.status') || 'All Statuses'}</option>
            {['pending', 'succeeded', 'failed', 'refunded', 'expired'].map(s => (
              <option key={s} value={s}>{t(`statuses.${s}`) || s}</option>
            ))}
          </select>
          <select value={filters.provider} onChange={e => updateFilter('provider', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
            <option value="">{t('filters.provider') || 'All Providers'}</option>
            {['flouci', 'd17', 'online_bank', 'cash'].map(p => (
              <option key={p} value={p}>{t(`providers.${p}`) || p}</option>
            ))}
          </select>
          <input type="date" value={filters.dateFrom} onChange={e => updateFilter('dateFrom', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
          <input type="date" value={filters.dateTo} onChange={e => updateFilter('dateTo', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
        </div>

        {/* Table */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['id', 'customer', 'service', 'provider', 'amount', 'status', 'date'].map(col => (
                    <th key={col} className="px-4 py-3 font-medium text-gray-500 whitespace-nowrap">{t(`table.${col}`) || col}</th>
                  ))}
                  <th className="px-4 py-3 font-medium text-gray-500">{t('table.actions') || 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data?.payments.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{p.id.slice(0, 8)}...</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{p.customer_name}</div>
                      <div className="text-xs text-gray-500">{p.customer_email}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{p.service_title}</td>
                    <td className="px-4 py-3 capitalize text-gray-700">{t(`providers.${p.provider}`) || p.provider}</td>
                    <td className="px-4 py-3 font-semibold text-gray-900">{p.amount_tnd} TND</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full border ${statusColors[p.status] || 'bg-gray-100 text-gray-800'}`}>
                        {t(`statuses.${p.status}`) || p.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{new Date(p.initiated_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <button className="p-2 hover:bg-gray-100 rounded transition text-gray-500 hover:text-blue-600" title="View Details">
                        <ExternalLink size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!loading && data?.payments.length === 0 && (
            <div className="p-8 text-center text-gray-500">{t('noResults') || 'No payments match your filters.'}</div>
          )}

          {data && data.totalPages > 1 && (
            <div className="flex flex-col md:flex-row justify-between items-center px-4 py-3 border-t border-gray-200 bg-gray-50 gap-3">
              <p className="text-sm text-gray-500">
                {t('pagination.showing', {
                  from: (data.page - 1) * data.limit + 1,
                  to: Math.min(data.page * data.limit, data.total),
                  total: data.total,
                }) || `Showing ${(data.page - 1) * data.limit + 1}-${Math.min(data.page * data.limit, data.total)} of ${data.total}`}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setFilters(f => ({ ...f, page: f.page - 1 }))}
                  disabled={data.page === 1}
                  className="px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                >
                  <ChevronLeft size={16} /> {t('pagination.prev') || 'Prev'}
                </button>
                <button
                  onClick={() => setFilters(f => ({ ...f, page: f.page + 1 }))}
                  disabled={data.page === data.totalPages}
                  className="px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                >
                  {t('pagination.next') || 'Next'} <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Suspense>
  );
}