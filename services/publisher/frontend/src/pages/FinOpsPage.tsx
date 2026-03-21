/**
 * FinOps Dashboard — LLM usage tracking, token estimates, and cost analysis.
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api';
import AppShell from '../components/AppShell';

type Currency = 'USD' | 'VND';
const VND_RATE = 25_800; // approximate USD → VND

export default function FinOpsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['finops'],
    queryFn: api.getFinOps,
    refetchInterval: 30_000,
  });

  const [currency, setCurrency] = useState<Currency>('USD');

  const header = (
    <>
      <div className="flex items-center gap-4">
        <h1 className="text-3xl font-extrabold tracking-tight font-headline text-primary">
          FinOps
        </h1>
        <div className="flex items-center gap-2 ml-4">
          <span className="text-sm text-on-surface-variant">LLM Cost Intelligence</span>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-xs text-outline">Auto-refreshes every 30s</span>
        {/* Currency toggle */}
        <div className="flex items-center bg-surface-container rounded-lg p-0.5 border border-outline-variant/15">
          <button
            onClick={() => setCurrency('USD')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
              currency === 'USD'
                ? 'bg-primary text-on-primary shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            $ USD
          </button>
          <button
            onClick={() => setCurrency('VND')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
              currency === 'VND'
                ? 'bg-primary text-on-primary shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            ₫ VND
          </button>
        </div>
      </div>
    </>
  );

  return (
    <AppShell header={header}>
      <div className="p-12 max-w-[1400px] mx-auto space-y-8 animate-fade-in-up">
        {isLoading ? <SkeletonDashboard /> : data ? <FinOpsDashboard data={data} currency={currency} /> : null}
      </div>
    </AppShell>
  );
}


/* ─── Skeleton ─── */
function SkeletonDashboard() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-28 rounded-2xl bg-surface-container-low animate-pulse" />
        ))}
      </div>
      <div className="h-64 rounded-2xl bg-surface-container-low animate-pulse" />
      <div className="h-80 rounded-2xl bg-surface-container-low animate-pulse" />
    </div>
  );
}


/* ─── Main Dashboard ─── */
function FinOpsDashboard({ data, currency }: { data: any; currency: Currency }) {
  const fmt = (usd: number) => formatCost(usd, currency);
  const {
    total_articles,
    total_estimated_tokens,
    total_estimated_cost_usd,
    models,
    providers,
    daily,
  } = data;

  // Aggregate daily data for the chart
  const dailyByDate = daily.reduce((acc: any, d: any) => {
    if (!acc[d.date]) acc[d.date] = { date: d.date, count: 0, tokens: 0, cost: 0, providers: {} };
    acc[d.date].count += d.count;
    acc[d.date].tokens += d.est_tokens;
    acc[d.date].cost += d.est_cost_usd;
    if (!acc[d.date].providers[d.provider]) acc[d.date].providers[d.provider] = 0;
    acc[d.date].providers[d.provider] += d.count;
    return acc;
  }, {});
  const dailyAgg = Object.values(dailyByDate) as any[];

  const maxTokens = Math.max(...dailyAgg.map((d: any) => d.tokens), 1);
  const maxCount = Math.max(...dailyAgg.map((d: any) => d.count), 1);

  return (
    <>
      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-4 gap-4">
        <KPICard
          icon="article"
          label="Total Rewrites"
          value={total_articles.toLocaleString()}
          sub="All-time articles"
          color="blue"
        />
        <KPICard
          icon="token"
          label="Est. Total Tokens"
          value={formatTokens(total_estimated_tokens)}
          sub="Input + Output"
          color="purple"
        />
        <KPICard
          icon="payments"
          label="Est. Total Cost"
          value={fmt(total_estimated_cost_usd)}
          sub={currency === 'VND' ? `≈ $${total_estimated_cost_usd.toFixed(4)} USD` : 'Based on API pricing'}
          color="emerald"
        />
        <KPICard
          icon="savings"
          label="Ollama Savings"
          value={fmt((providers?.ollama?.est_cost_usd === 0 && providers?.ollama?.count)
            ? estimateCloudCost(providers.ollama.est_tokens)
            : 0
          )}
          sub={`${providers?.ollama?.count || 0} articles on local LLM`}
          color="amber"
        />
      </div>

      {/* ── Provider Breakdown ── */}
      <div className="bg-surface-container-lowest border border-outline-variant/15 rounded-2xl p-6">
        <h2 className="text-sm font-semibold text-on-surface-variant uppercase tracking-wider flex items-center gap-2 mb-6">
          <span className="material-symbols-outlined text-[18px]">pie_chart</span>
          Provider Breakdown
        </h2>
        <div className="grid grid-cols-3 gap-4">
          {Object.entries(providers || {}).map(([prov, stats]: [string, any]) => (
            <ProviderCard
              key={prov}
              provider={prov}
              count={stats.count}
              tokens={stats.est_tokens}
              cost={stats.est_cost_usd}
              totalArticles={total_articles}
              currency={currency}
            />
          ))}
          {Object.keys(providers || {}).length === 0 && (
            <div className="col-span-3 text-center py-8 text-outline">No data yet</div>
          )}
        </div>
      </div>

      {/* ── Daily Usage Chart (bar chart using CSS) ── */}
      {dailyAgg.length > 0 && (
        <div className="bg-surface-container-lowest border border-outline-variant/15 rounded-2xl p-6">
          <h2 className="text-sm font-semibold text-on-surface-variant uppercase tracking-wider flex items-center gap-2 mb-6">
            <span className="material-symbols-outlined text-[18px]">show_chart</span>
            Daily Activity (Last 30 days)
          </h2>
          <div className="flex items-end gap-1 h-40">
            {dailyAgg.map((d: any, i: number) => {
              const h = Math.max((d.count / maxCount) * 100, 4);
              const hasOllama = d.providers?.ollama > 0;
              const hasCloud = d.providers?.gemini > 0 || d.providers?.anthropic > 0;
              return (
                <div
                  key={i}
                  className="flex-1 group relative"
                  title={`${d.date}\n${d.count} articles\n${formatTokens(d.tokens)} tokens\n${fmt(d.cost)} est. cost`}
                >
                  <div
                    className={`rounded-t-md w-full transition-all hover:opacity-80 ${
                      hasCloud && hasOllama
                        ? 'bg-gradient-to-t from-purple-400 to-blue-400'
                        : hasOllama
                        ? 'bg-purple-400'
                        : hasCloud
                        ? 'bg-blue-400'
                        : 'bg-slate-300'
                    }`}
                    style={{ height: `${h}%` }}
                  />
                  {/* Tooltip */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                    <div className="bg-surface-container-highest text-on-surface text-[10px] px-2.5 py-1.5 rounded-lg shadow-lg whitespace-nowrap border border-outline-variant/15">
                      <div className="font-semibold">{d.date}</div>
                      <div>{d.count} articles · {formatTokens(d.tokens)} tokens</div>
                      <div className="text-primary font-medium">{fmt(d.cost)}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex justify-between mt-2">
            <span className="text-[10px] text-outline">{dailyAgg[0]?.date}</span>
            <div className="flex gap-4">
              <span className="flex items-center gap-1.5 text-[10px] text-outline">
                <span className="w-2.5 h-2.5 rounded-sm bg-purple-400" /> Ollama (local)
              </span>
              <span className="flex items-center gap-1.5 text-[10px] text-outline">
                <span className="w-2.5 h-2.5 rounded-sm bg-blue-400" /> Cloud API
              </span>
            </div>
            <span className="text-[10px] text-outline">{dailyAgg[dailyAgg.length - 1]?.date}</span>
          </div>
        </div>
      )}

      {/* ── Per-Model Table ── */}
      <div className="bg-surface-container-lowest border border-outline-variant/15 rounded-2xl p-6">
        <h2 className="text-sm font-semibold text-on-surface-variant uppercase tracking-wider flex items-center gap-2 mb-6">
          <span className="material-symbols-outlined text-[18px]">table_chart</span>
          Per-Model Breakdown
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] text-outline uppercase tracking-wider border-b border-outline-variant/10">
                <th className="text-left py-3 pr-4">Model</th>
                <th className="text-left py-3 pr-4">Provider</th>
                <th className="text-right py-3 pr-4">Articles</th>
                <th className="text-right py-3 pr-4">Avg Chars</th>
                <th className="text-right py-3 pr-4">Est. Input Tokens</th>
                <th className="text-right py-3 pr-4">Est. Output Tokens</th>
                <th className="text-right py-3 pr-4">Est. Total Tokens</th>
                <th className="text-right py-3">Est. Cost</th>
              </tr>
            </thead>
            <tbody>
              {models.map((m: any, i: number) => (
                <tr
                  key={i}
                  className="border-b border-outline-variant/5 hover:bg-surface-container-low transition-colors"
                >
                  <td className="py-3 pr-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border ${getModelStyle(m.provider)}`}>
                      <span className="material-symbols-outlined text-[12px]">{getModelIcon(m.provider)}</span>
                      {m.model}
                    </span>
                  </td>
                  <td className="py-3 pr-4 capitalize text-on-surface-variant">{m.provider}</td>
                  <td className="py-3 pr-4 text-right font-semibold text-on-surface">{m.count}</td>
                  <td className="py-3 pr-4 text-right text-on-surface-variant">{m.avg_chars_per_article.toLocaleString()}</td>
                  <td className="py-3 pr-4 text-right text-on-surface-variant">{formatTokens(m.est_input_tokens)}</td>
                  <td className="py-3 pr-4 text-right text-on-surface-variant">{formatTokens(m.est_output_tokens)}</td>
                  <td className="py-3 pr-4 text-right font-semibold text-on-surface">{formatTokens(m.est_total_tokens)}</td>
                  <td className="py-3 text-right">
                    <span className={m.est_cost_usd === 0 ? 'text-emerald-600 font-semibold' : 'text-on-surface font-semibold'}>
                      {m.est_cost_usd === 0 ? 'FREE' : fmt(m.est_cost_usd)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Disclaimer ── */}
      <div className="bg-surface-container-lowest border border-amber-200 rounded-2xl p-4">
        <p className="text-xs text-amber-700 flex items-center gap-2">
          <span className="material-symbols-outlined text-[16px]">info</span>
          Token counts and costs are <b>estimates</b> based on article body length (~4 chars/token).
          Actual usage may differ. Ollama costs are $0 as it runs locally on your hardware.
        </p>
      </div>
    </>
  );
}


/* ─── Helper components ─── */

function KPICard({ icon, label, value, sub, color }: {
  icon: string; label: string; value: string; sub: string; color: string;
}) {
  const colorMap: Record<string, { bg: string; icon: string; text: string }> = {
    blue:    { bg: 'bg-blue-50', icon: 'text-blue-600', text: 'text-blue-700' },
    purple:  { bg: 'bg-purple-50', icon: 'text-purple-600', text: 'text-purple-700' },
    emerald: { bg: 'bg-emerald-50', icon: 'text-emerald-600', text: 'text-emerald-700' },
    amber:   { bg: 'bg-amber-50', icon: 'text-amber-600', text: 'text-amber-700' },
  };
  const c = colorMap[color] || colorMap.blue;

  return (
    <div className="bg-surface-container-lowest border border-outline-variant/15 rounded-2xl p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-10 h-10 rounded-xl ${c.bg} flex items-center justify-center`}>
          <span className={`material-symbols-outlined text-[20px] ${c.icon}`}>{icon}</span>
        </div>
        <span className="text-xs text-outline uppercase tracking-wider font-semibold">{label}</span>
      </div>
      <p className={`text-3xl font-extrabold tracking-tight ${c.text}`}>{value}</p>
      <p className="text-[10px] text-outline mt-1">{sub}</p>
    </div>
  );
}

function ProviderCard({ provider, count, tokens, cost, totalArticles, currency }: {
  provider: string; count: number; tokens: number; cost: number; totalArticles: number; currency: Currency;
}) {
  const pct = totalArticles > 0 ? Math.round((count / totalArticles) * 100) : 0;

  const config: Record<string, { bg: string; border: string; icon: string; label: string; iconName: string }> = {
    ollama:    { bg: 'bg-purple-50', border: 'border-purple-200', icon: 'text-purple-700', label: 'Ollama (Local)', iconName: 'smart_toy' },
    gemini:    { bg: 'bg-blue-50', border: 'border-blue-200', icon: 'text-blue-700', label: 'Google Gemini', iconName: 'auto_awesome' },
    anthropic: { bg: 'bg-orange-50', border: 'border-orange-200', icon: 'text-orange-700', label: 'Anthropic Claude', iconName: 'psychology' },
  };
  const c = config[provider] || { bg: 'bg-slate-50', border: 'border-slate-200', icon: 'text-slate-600', label: provider, iconName: 'smart_toy' };

  return (
    <div className={`${c.bg} border ${c.border} rounded-xl p-5`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className={`material-symbols-outlined text-[20px] ${c.icon}`}>{c.iconName}</span>
          <span className={`text-sm font-bold ${c.icon}`}>{c.label}</span>
        </div>
        <span className={`text-xs font-bold ${c.icon} px-2 py-0.5 rounded-full bg-white/60`}>{pct}%</span>
      </div>
      <div className="grid grid-cols-3 gap-3 mt-2">
        <div>
          <p className="text-[10px] text-on-surface-variant uppercase tracking-wider">Articles</p>
          <p className="text-lg font-bold text-on-surface">{count}</p>
        </div>
        <div>
          <p className="text-[10px] text-on-surface-variant uppercase tracking-wider">Tokens</p>
          <p className="text-lg font-bold text-on-surface">{formatTokens(tokens)}</p>
        </div>
        <div>
          <p className="text-[10px] text-on-surface-variant uppercase tracking-wider">Cost</p>
          <p className={`text-lg font-bold ${cost === 0 ? 'text-emerald-600' : 'text-on-surface'}`}>
            {cost === 0 ? 'FREE' : formatCost(cost, currency)}
          </p>
        </div>
      </div>
      {/* Progress bar */}
      <div className="mt-3 h-1.5 bg-white/50 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            provider === 'ollama' ? 'bg-purple-500' : provider === 'gemini' ? 'bg-blue-500' : 'bg-orange-500'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}


/* ─── Utilities ─── */

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function formatCost(usd: number, currency: Currency): string {
  if (currency === 'VND') {
    const vnd = usd * VND_RATE;
    if (vnd >= 1_000_000) return `${(vnd / 1_000_000).toFixed(2)}M ₫`;
    if (vnd >= 1_000) return `${Math.round(vnd).toLocaleString('vi-VN')} ₫`;
    return `${Math.round(vnd)} ₫`;
  }
  if (usd >= 1) return `$${usd.toFixed(2)}`;
  return `$${usd.toFixed(4)}`;
}

function estimateCloudCost(tokens: number): number {
  // If these tokens had been processed by Gemini Flash instead of Ollama
  const inputTokens = tokens * 0.6;
  const outputTokens = tokens * 0.4;
  return (inputTokens / 1_000_000) * 0.075 + (outputTokens / 1_000_000) * 0.30;
}

function getModelStyle(provider: string): string {
  if (provider === 'ollama') return 'bg-purple-50 text-purple-700 border-purple-200';
  if (provider === 'gemini') return 'bg-blue-50 text-blue-700 border-blue-200';
  if (provider === 'anthropic') return 'bg-orange-50 text-orange-700 border-orange-200';
  return 'bg-slate-50 text-slate-600 border-slate-200';
}

function getModelIcon(provider: string): string {
  if (provider === 'ollama') return 'smart_toy';
  if (provider === 'gemini') return 'auto_awesome';
  if (provider === 'anthropic') return 'psychology';
  return 'smart_toy';
}
