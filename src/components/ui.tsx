'use client';
import { type ReactNode, type ButtonHTMLAttributes } from 'react';
import Link from 'next/link';
import { ArrowRight, Basket, Car, Package, HandHeart, HouseLine, FirstAid, MagnifyingGlass, MapPin, ArrowUpRight } from '@phosphor-icons/react';
import { motion, useReducedMotion } from 'framer-motion';
import type { Category } from '@/domain/model';
export const dateLabel = (iso: string) => new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'America/Chicago' }).format(new Date(iso));
export function CategoryIcon({ category, size = 22 }: { category: string; size?: number }) {
  const Icon = ({ Groceries: Basket, Transport: Car, Supplies: Package, Community: HandHeart, Shelter: HouseLine, Medical: FirstAid, 'Missing person': MagnifyingGlass } as Record<string, typeof Basket>)[category] ?? HandHeart;
  return <Icon size={size} weight="regular" aria-hidden="true" />;
}
export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'green' | 'warning' }) { return <span className={`badge badge-${tone}`}>{children}</span>; }
export function Button({ children, secondary, className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { secondary?: boolean }) { return <button className={`${secondary ? 'button-secondary' : 'button-primary'} ${className}`} {...props}>{children}</button>; }
export function PageHeading({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: ReactNode }) {
  return <div className="page-heading"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{description}</p></div>{action}</div>;
}
export function Empty({ title, children }: { title: string; children: ReactNode }) { return <div className="empty-state"><HandHeart size={32} /><h3>{title}</h3><p>{children}</p></div>; }
export function Skeleton() { return <div className="space-y-5 py-6" role="status" aria-label="Loading request"><div className="skeleton h-12 w-2/3" /><div className="skeleton h-32" /><div className="skeleton h-48" /><span className="sr-only">Loading request details</span></div>; }
export function Reveal({ children, index = 0 }: { children: ReactNode; index?: number }) {
  const reduced = useReducedMotion();
  return <motion.div layout initial={reduced ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 100, damping: 20, delay: reduced ? 0 : index * 0.035 }}>{children}</motion.div>;
}
export function RequestCard({ request, index = 0 }: { request: { id: string; title: string; summary: string; area: string; windowEnd: string; restricted: boolean; status: string; needs: { category: Category; status: string }[] }; index?: number }) {
  const first = request.needs[0];
  return <Reveal index={index}><Link href={`/requests/${request.id}`} className="request-card group"><div className="flex items-start justify-between gap-4"><div className="category-icon"><CategoryIcon category={first?.category ?? 'Community'} /></div><Badge tone={request.status === 'Resolved' ? 'green' : request.restricted ? 'warning' : 'neutral'}>{request.restricted ? 'Private review' : request.status}</Badge></div><h3>{request.title}</h3><p>{request.summary}</p><div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted"><span className="inline-flex items-center gap-1"><MapPin size={14} />{request.area}</span><span>By {dateLabel(request.windowEnd)}</span></div><div className="mt-5 flex items-center justify-between border-t border-line pt-4 text-sm font-medium"><span>{request.needs.length > 1 ? `${request.needs.filter(n => n.status === 'resolved').length}/${request.needs.length} needs confirmed` : 'View request'}</span><ArrowUpRight size={19} className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" /></div></Link></Reveal>;
}
export function ActionLink({ href, children }: { href: string; children: ReactNode }) { return <Link className="text-link" href={href}>{children}<ArrowRight size={16} /></Link>; }
