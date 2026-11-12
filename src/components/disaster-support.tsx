'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Buildings, MapPin } from '@phosphor-icons/react';
import { areas, type Resource } from '@/domain/model';
import { disasterSupportListings } from '@/lib/disaster-support';
import { useLocale } from './locale-context';
import { useNetwork } from './network-context';
import { dateLabel } from './ui';
import styles from './disaster-support.module.css';

export function DisasterSupport() {
  const { state } = useNetwork();
  const { t, locale } = useLocale();
  const [category, setCategory] = useState('All');
  const [area, setArea] = useState('All');
  const listings = disasterSupportListings({ resources: state.resources, users: state.users, actor: state.actor, settings: state.settings });
  const filtered = listings.filter(({ resource }) => (category === 'All' || resource.category === category) && (area === 'All' || resource.area === area));

  return <section id="support" className={styles.section} aria-labelledby="support-heading">
    <div className={styles.heading}>
      <div><span className={styles.eyebrow}>{t('Find support')}</span><h2 id="support-heading">{t('Shelter & transport')}</h2><p>{t('Browse partner listings and start a request for the help you need.')}</p></div>
      <Link className={styles.catalog} href="/resources">{t('All resources')} <ArrowRight size={16} /></Link>
    </div>
    <div className={styles.panel}>
      <div className={styles.filters}>
        <div><label htmlFor="support-category">{t('Service')}</label><select id="support-category" value={category} onChange={event => setCategory(event.target.value)}><option value="All">{t('All services')}</option><option value="Shelter">{t('Shelter')}</option><option value="Transport">{t('Transport')}</option></select></div>
        <div><label htmlFor="support-area">{t('Neighborhood')}</label><select id="support-area" value={area} onChange={event => setArea(event.target.value)}><option value="All">{t('All neighborhoods')}</option>{areas.map(item => <option key={item} value={item}>{t(item)}</option>)}</select></div>
      </div>
      <p className={styles.explainer}>{t('Generally available listings have recent capacity and an eligible partner. A request is not a booking; the partner must confirm suitability and availability. Resource units are not counts of people, beds, or seats.')}</p>
      {filtered.length === 0 ? <div className={styles.empty}><Buildings size={24} /><div><strong>{t('No listings match these filters')}</strong><p>{listings.length ? t('Try another service or neighborhood, or start a request below.') : t('When partners add shelter or transport resources, they will appear here.')}</p><Link href="/request">{t('Request help')} <ArrowRight size={15} /></Link></div></div> : <div className={styles.list}>
        {filtered.map(({ resource, owner, availableUnits, reasons, generallyAvailable }) => <article key={resource.id} className={styles.row}>
          <div className={styles.details}>
            <div className={styles.rowTop}><span className={styles.category}>{t(resource.category)}</span><span className={generallyAvailable ? styles.available : styles.unavailable}>{t(generallyAvailable ? 'Generally available' : 'Unavailable')}</span></div>
            <h3>{resource.name}</h3>
            {resource.description && <p>{resource.description}</p>}
            <p className={styles.meta}><MapPin size={15} /> {t(resource.area)}{owner && <> · {owner.name}</>}</p>
            <p className={styles.meta}>{availableUnits} {t('resource units remaining')} · {t('Availability updated')} {safeDate(resource, locale)}</p>
            {reasons.length > 0 && <p className={styles.reason}>{reasons.map(t).join(' · ')}</p>}
          </div>
          <div className={styles.rowAction}>{resource.ownerId === state.actor.id ? <Link href="/resources">{t('Manage listing')} <ArrowRight size={15} /></Link> : generallyAvailable ? <Link href={`/request?${new URLSearchParams({ category: resource.category, area: resource.area })}`}>{t('Request help')} <ArrowRight size={15} /></Link> : null}</div>
        </article>)}
      </div>}
      <div className={styles.footer}><span>{t('Need another kind of help?')}</span><Link href="/request">{t('Start a request')} <ArrowRight size={15} /></Link>{state.actor.role === 'organization' && <Link href="/resources">{t('Manage resources')} <ArrowRight size={15} /></Link>}</div>
    </div>
  </section>;
}

function safeDate(resource: Resource, locale: 'en' | 'es') {
  return Number.isFinite(Date.parse(resource.verifiedAt)) ? dateLabel(resource.verifiedAt, locale) : 'unavailable';
}
