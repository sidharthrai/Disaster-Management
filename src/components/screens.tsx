'use client';
import { localizedRequestTitle, localizedRequestSummary } from '@/lib/request-presentation';
import Link from 'next/link';
import { useNetwork } from './network-context';
import { Empty, PageHeading, RequestCard } from './ui';
import { OfferList } from './offers';
import { useLocale } from './locale-context';

export { Offer } from './offers';
export { Coordinator } from './coordinator';
export { Resources } from './resources';
export { Settings } from './settings';

export function Activity() {
  const { state } = useNetwork();
  const { t, locale } = useLocale();
  const own = state.requests.filter(request => request.requesterId === state.actor.id);
  const related = state.commitments.filter(connection => connection.helperId === state.actor.id);
  return <>
    <PageHeading eyebrow={t('YOUR NETWORK')} title={t('Your activity')} description={t('Requests, invitations, and connections in one place.')} />
    <section className="block-section">
      <h2>{t('Your requests')}</h2>
      <div className="request-grid">{own.map((request, index) => <RequestCard key={request.id} request={{ ...request, title: localizedRequestTitle(request, t), summary: localizedRequestSummary(request, t) }} index={index} />)}</div>
      {!own.length && <Empty title={t('You haven’t requested help yet')}>{t('When you do, your requests will appear here.')}</Empty>}
    </section>
    <section className="block-section">
      <h2>{t('Your invitations and connections')}</h2>
      {!related.length ? <Empty title={t('No connections yet')}>{t('Explore community requests to find a way to help.')}</Empty> : <div className="list">{related.map(connection => {
        const request = state.requests.find(item => item.id === connection.requestId);
        return <article className="list-row" key={connection.id}>
          <div><h3>{request ? localizedRequestTitle(request, t) : t('Request')}</h3><p>{t(request?.needs.find(need => need.id === connection.needId)?.category ?? '')} · {locale === 'en' ? connection.status.replaceAll('_', ' ') : t(connection.status)}</p></div>
          <Link className="text-link" href={`/requests/${connection.requestId}`}>{t('View connection →')}</Link>
        </article>;
      })}</div>}
    </section>
    <OfferList />
  </>;
}
