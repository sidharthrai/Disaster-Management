import Link from 'next/link';
export default function NotFound() { return <div className="wrap page-heading"><h1>Page not found.</h1><p>Let’s get you back to the neighborhood.</p><Link className="button-primary" href="/dashboard">Go to community</Link></div>; }
