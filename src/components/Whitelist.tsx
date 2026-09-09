import config from '../data/whitelist.json';
import { ArrowLeft, ArrowUpRight, Leaf } from 'lucide-react';
import { useEffect, useState } from 'react';
import './whitelist.css';

function httpsUrl(value: string) {
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password ? url.href : ''; } catch { return ''; }
}

export function Whitelist({ go }: { go: (path: string) => void }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(timer); }, []);
  const announcement = httpsUrl(config.announcementUrl);
  const application = httpsUrl(config.applicationUrl);
  const deadline = config.deadlineUtc ? Date.parse(config.deadlineUtc) : null;
  const validDeadline = deadline === null || Number.isFinite(deadline);
  const closed = config.status === 'closed' || (deadline !== null && validDeadline && now >= deadline);
  const open = !closed && config.status === 'open' && validDeadline && Boolean(announcement && application);
  const status = closed ? 'Applications closed' : open ? 'Applications open' : 'Coming soon';
  return <main className="wl-page">
    <header className="wl-nav"><button onClick={() => go('/')}><ArrowLeft size={16}/> Back to the farm</button><button onClick={() => go('/docs')}>Field Guide / Docs</button><span><Leaf size={18}/> CLOUD 9 FARM CLUB</span></header>
    <section className="wl-layout">
      <div className="wl-intro"><span className="wl-eyebrow">GENESIS ACCESS / FIRST ROOTS</span><h1>{config.title}</h1><p>{config.description}</p><div className="wl-seal"><Leaf size={48}/><span>GROW WITH US</span></div><p className="wl-note">{config.eligibility}</p><p className="wl-note">{config.selectionNotice}</p></div>
      <section className="wl-card" aria-label="Whitelist application steps">
        <div className="wl-card-head"><span>FARMER APPLICATION</span><strong className={open ? 'is-open' : ''}>{status}</strong></div>
        <dl className="wl-facts"><div><dt>Whitelist spots</dt><dd>{config.slots === null ? 'To be announced' : config.slots}</dd></div><div><dt>Application deadline</dt><dd>{deadline !== null && validDeadline ? new Date(deadline).toLocaleString(undefined, { timeZone: 'UTC', dateStyle: 'medium', timeStyle: 'short' }) + ' UTC' : 'To be announced'}</dd></div></dl>
        <ol className="wl-steps">
          <li><span>01</span><div><h2>Meet the first farmers</h2><p>Read the official announcement for campaign details and eligibility.</p>{announcement ? <a href={announcement} target="_blank" rel="noopener noreferrer">Open announcement <ArrowUpRight size={15}/></a> : <small>Announcement coming soon</small>}</div></li>
          <li><span>02</span><div><h2>Spread the word</h2><p>Like and repost the announcement. Keep your X handle and repost link ready for your application.</p><small>Social activity is subject to review.</small></div></li>
          <li><span>03</span><div><h2>Send your application</h2><p>When applications open, submit your X handle, repost link, and wallet address through the official application form.</p><small>No wallet connection or payment is required to apply.</small></div></li>
        </ol>
        {open ? <a className="wl-apply" href={application} target="_blank" rel="noopener noreferrer">Open application form <ArrowUpRight size={18}/></a> : <button className="wl-apply" disabled>{closed ? 'Applications closed' : 'Applications opening soon'}</button>}
        <p className="wl-footnote">{open ? 'The application form opens in a new tab. Complete it there to submit your application.' : closed ? 'The application window has ended. Watch our official channels for the next update.' : 'The deadline, available spots, and application form will be published here before launch.'}</p>
      </section>
    </section>
  </main>;
}
