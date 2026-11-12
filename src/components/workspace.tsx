'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { House, HandHeart, PlusCircle, HandsClapping, ListChecks, Buildings, ShieldCheck, GearSix, ArrowLeft, WarningCircle, Bell, ArrowUpRight, CaretDown, UsersThree, MapPin, Package, ChatCircleText } from '@phosphor-icons/react';
import { createContext, useContext, type ReactNode } from 'react';
import { useNetwork } from './network-context';
import { AccountControls } from './account-controls';
import { incidentAction } from '@/lib/incident-actions';
import { LanguageSwitcher, useLocale } from './locale-context';

const ProviderContext = createContext('Deterministic fallback');
export const useProviderName = () => useContext(ProviderContext);
const everydayLinks = [
  { href: '/dashboard', label: 'Community', Icon: House },
  { href: '/request', label: 'Ask for help', Icon: PlusCircle },
  { href: '/offer', label: 'Offer help', Icon: HandsClapping },
  { href: '/activity', label: 'My activity', Icon: ListChecks },
  { href: '/notifications', label: 'Notifications', Icon: Bell },
];
const networkLinks = [
  { href: '/gatherings', label: 'Group activities', Icon: UsersThree },
  { href: '/volunteers', label: 'Volunteer directory', Icon: HandHeart },
  { href: '/community-activity', label: 'Community activity', Icon: HandsClapping },
  { href: '/neighborhoods', label: 'Neighborhoods', Icon: MapPin },
  { href: '/organizations', label: 'Organizations', Icon: Buildings },
  { href: '/organization-approvals', label: 'Organization applications', Icon: ShieldCheck },
];
const toolLinks = [
  { href: '/intake', label: 'Intake studio', Icon: ChatCircleText },
  { href: '/intake-drafts', label: 'Private intake inbox', Icon: ListChecks },
  { href: '/settings', label: 'Settings', Icon: GearSix },
];
const disasterLinks = [
  { href: '/disaster', label: 'Disaster overview', Icon: ShieldCheck },
  { href: '/resources', label: 'Resources', Icon: Buildings },
  { href: '/donations', label: 'Supplies & donations', Icon: Package },
];
const coordinatorLinks = [
  { href: '/coordinator', label: 'Coordinator', Icon: ShieldCheck },
  { href: '/insights', label: 'Insights', Icon: ListChecks },
  { href: '/emergency', label: 'Incident dashboard', Icon: WarningCircle },
];

export function Workspace({ children, provider }: { children: ReactNode; provider: string }) {
  const { state, identityChanging, notice, clearNotice } = useNetwork();
  const pathname = usePathname();
  const { t } = useLocale();
  const demo = state.settings.clockMode === 'demo';
  const action = incidentAction(state.actor.role);
  const unread = state.notifications.filter(notification => !notification.readAt).length;
  const disasterArea = ['/disaster', '/emergency', '/resources', '/donations'].includes(pathname);
  const renderLinks = (links: typeof everydayLinks) => links.map(({ href, label, Icon }) => <Link key={href} className={pathname === href ? 'active' : ''} href={href} aria-current={pathname === href ? 'page' : undefined}><Icon size={19} weight={pathname === href ? 'duotone' : 'regular'} aria-hidden="true" /><span>{t(label)}</span>{href === '/notifications' && unread > 0 && <span className="nav-count">{unread}</span>}</Link>);
  const primary = disasterArea ? disasterLinks : everydayLinks;
  const navigation = <>
    <div className="nav-group-title">{t(disasterArea ? 'PREPARE & RESPOND' : 'YOUR EVERYDAY')}</div>
    {renderLinks(primary)}
    {disasterArea && <><div className="nav-group-title">{t("YOUR CONNECTIONS")}</div>{renderLinks(everydayLinks.slice(1, 4))}</>}
    <details className="nav-disclosure" open={networkLinks.some(link => link.href === pathname)}><summary>{t('Explore your network')} <CaretDown size={14} /></summary><div>{renderLinks(networkLinks)}</div></details>
    <details className="nav-disclosure" open={toolLinks.some(link => link.href === pathname)}><summary>{t('Tools & settings')} <CaretDown size={14} /></summary><div>{renderLinks(toolLinks)}</div></details>
    {state.actor.role === 'coordinator' && <><div className="nav-group-title">{t("COORDINATION")}</div>{renderLinks(coordinatorLinks)}</>}
  </>;
  const productTabs = <><Link href="/dashboard" className={!disasterArea ? 'active' : ''} aria-current={!disasterArea ? 'location' : undefined}><HandHeart size={18} />{t('Everyday help')}</Link><Link href="/disaster" className={disasterArea ? 'active disaster-tab' : 'disaster-tab'} aria-current={disasterArea ? 'location' : undefined}><ShieldCheck size={18} />{t('Disaster management')}{state.settings.emergency && <span className="incident-dot" aria-label={t("Simulation active")} />}</Link></>;
  return <ProviderContext.Provider value={provider}>
    <div className={disasterArea ? 'disaster-theme' : undefined}>
    <div className="demo-bar">{t(demo ? 'Synthetic local demo · People and resources are fictional' : 'Community workspace · Account identity does not establish professional qualification')}<span>{t("No live alerts or dispatch")}</span></div>
    <a className="skip-link" href="#workspace-content">{t("Skip to content")}</a>
    <aside className="sidebar">
      <Link href="/" className="brand"><span className="brand-mark"><HandHeart size={25} weight="duotone" /></span><span><b>{t('Community Help Network')}</b><small>{t("Riverton, together.")}</small></span></Link>
      <div className="sidebar-community"><span className="community-dot" /><span>{t("Riverton community")}</span></div>
      <nav aria-label={t("Main navigation")}>{navigation}</nav>
      <Link className="sidebar-ready" href={disasterArea ? '/dashboard' : '/disaster'}><ShieldCheck size={23} weight="duotone" /><strong>{t(disasterArea ? 'Stronger, every day.' : 'Ready, together.')}</strong><span>{t(disasterArea ? 'Back to everyday community help' : 'Explore disaster management')}</span><ArrowUpRight size={17} /></Link>
      <div className="sidebar-bottom"><Link href="/"><ArrowLeft size={14} /> {t("Back to homepage")}</Link></div>
    </aside>
    <div className="app-main">
      <header className="workspace-top"><div className="workspace-location"><span className="eyebrow">{t("Riverton community")}</span><strong>{t(disasterArea ? 'Readiness starts with connection.' : 'Good things happen close to home.')}</strong></div><div className="workspace-controls"><LanguageSwitcher /><AccountControls /></div></header>
      <nav className="product-tabs" aria-label={t("Product areas")}>{productTabs}</nav>
      <details className="mobile-menu"><summary>{t(disasterArea ? 'Browse disaster management' : 'Browse community')} <CaretDown size={16} /></summary><nav className="mobile-nav" aria-label={t("Workspace navigation")}>{navigation}</nav></details>
      {state.settings.emergency && <div className="emergency-banner"><WarningCircle size={21} weight="duotone" /><span><strong>{t('Simulated incident:')} {state.settings.emergency.name}.</strong> {t('No live alerts or dispatch. Offers and resources must reconfirm incident readiness.')} <Link href={action.href}>{t(action.label)} →</Link></span></div>}
      {notice && <div role={notice.error ? 'alert' : 'status'} className={notice.error ? 'inline-error' : 'notice-box'}>{t(notice.text)}<button aria-label={t("Dismiss notice")} onClick={clearNotice}>×</button></div>}
      <main id="workspace-content" key={state.actor.id}>{identityChanging ? <div className="page-heading" role="status">{t("Switching identity…")}</div> : children}</main>
      <footer>{t("Community Help Network")} <span>{t(demo ? 'Synthetic demonstration' : 'Community account')} · {t('Not emergency dispatch')}</span></footer>
    </div>
    </div>
  </ProviderContext.Provider>;
}
