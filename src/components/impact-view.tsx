'use client';
import Link from 'next/link';
import type { PublicImpact } from '@/domain/impact';
import { LanguageSwitcher, useLocale } from './locale-context';

export function ImpactView({ impact, demo }: { impact: PublicImpact; demo: boolean }) {
  const { t } = useLocale();
  return <div className="homepage"><div className="demo-bar">{t(demo ? 'Demonstration data: all people and activity are fictional.' : 'Community activity recorded in the network.')}</div><div className="wrap">
    <header className="home-header"><Link href="/" className="brand"><span><b>{t('Community Help Network')}</b><small>{t('Back to home')}</small></span></Link><Link className="button-primary" href="/dashboard">{t(demo ? 'Enter demo' : 'Enter community')}</Link></header>
    <LanguageSwitcher /><main><div className="page-heading"><div><div className="eyebrow">{t('Community impact')}</div><h1>{t('Small acts add up.')}</h1><p>{t('Every request is a chance for neighbors to connect. Here is a shared view of ordinary community help, without personal details.')}</p></div></div>
      <section className="metrics-strip" aria-label={t('Community impact counts')}><div><strong>{impact.submittedRequests}</strong><span>{t('Requests submitted')}</span></div><div><strong>{impact.openRequests}</strong><span>{t('Requests still open')}</span></div><div><strong>{impact.fullyResolvedRequests}</strong><span>{t('Requests fully resolved')}</span></div><div><strong>{impact.confirmedNeeds}</strong><span>{t('Needs confirmed received')}</span></div></section>
      <section className="home-community"><div><div className="eyebrow">{t('Ways neighbors ask for help')}</div><h2>{t('What the community is sharing')}</h2><p>{t('A request can include more than one kind of help, so category counts can overlap.')}</p><div className="example-grid">{impact.categories.map(item => <article className="surface" key={item.category}><h3>{t(item.category)}</h3><p>{item.requests} {t(item.requests === 1 ? 'request' : 'requests')}</p></article>)}{impact.categories.length === 0 && <p>{t('No ordinary requests have been recorded yet.')}</p>}</div></div>
      <aside className="rail-note"><h3>{t('Each number has a story.')}</h3><p>{t('Only ordinary, nonrestricted requests are included. Open requests include those still being coordinated. Administrative closures are included in submitted requests, but not as confirmed help.')}</p><p>{t(demo ? 'These counts describe a synthetic demonstration, not real-world activity.' : 'Confirmation is recorded by the person receiving help; these numbers are self-reported and independently unverified.')}</p><Link className="text-link" href="/dashboard">{t(demo ? 'Explore the demo →' : 'Explore the community →')}</Link></aside></section>
    </main><footer>{t('Community Help Network')} <span>{t('Neighbors helping neighbors')}</span></footer>
  </div></div>;
}
