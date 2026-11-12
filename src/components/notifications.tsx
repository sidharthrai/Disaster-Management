'use client';
import { useLocale } from './locale-context';
import Link from 'next/link';
import { useNetwork } from './network-context';
import { Badge, Button, Empty, PageHeading, dateLabel } from './ui';
export function Notifications() {
  const { t, locale } = useLocale();
  const { state, command, busy } = useNetwork();
  return <div className="notifications-inbox"><PageHeading eyebrow={t("YOUR NETWORK")} title={t("Notifications")} description={t("Updates available in this app. No email, text message, or other external delivery is implied.")}/>{state.notifications.length === 0 ? <Empty title={t("No notifications yet")}>{t("Updates about requests you can access will appear here.")}</Empty> : <div className="list">{state.notifications.map(n => <article className="list-row" key={n.id}><div><h3>{t(n.text)} {!n.readAt && <Badge tone="green">{t("Unread")}</Badge>}</h3><p>{dateLabel(n.createdAt, locale)}{n.readAt && ` · ${t('Read')} ${dateLabel(n.readAt, locale)}`}</p><Link className="text-link" href={`/requests/${n.requestId}`}>{t("View request →")}</Link></div>{!n.readAt && <Button secondary disabled={busy} onClick={() => { void command({ type: 'markNotificationRead', id: n.id }, t('Notification marked read.')).catch(() => {}); }}>{t("Mark read")}</Button>}</article>)}</div>}</div>;
}
