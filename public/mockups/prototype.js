/* Static HTML prototype controller and views. All data stays in this browser tab. */
(() => {
  const icons = {
    arrow:'<path d="M5 12h14m-5-5 5 5-5 5"/>', up:'<path d="M6 18 18 6M6 6h12v12"/>',
    people:'<circle cx="9" cy="7" r="4"/><path d="M2 21v-3a7 7 0 0 1 14 0v3m0-18a4 4 0 0 1 0 8m3 3a7 7 0 0 1 3 7"/>',
    bag:'<path d="M5 7h14l1 14H4L5 7Z"/><path d="M8 8V6a4 4 0 0 1 8 0v2"/>',
    heart:'<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>',
    car:'<path d="m4 10 2-6h12l2 6M3 10h18v8H3zM5 18v3m14-3v3M6 14h1m10 0h1"/>',
    box:'<path d="m3 7 9-5 9 5v11l-9 5-9-5V7Zm0 0 9 5 9-5M12 12v11M7 4l10 5"/>',
    pin:'<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
    clock:'<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>',
    shield:'<path d="m12 2 9 4v6c0 6-9 10-9 10S3 18 3 12V6l9-4Z"/><path d="m8 12 3 3 5-6"/>',
    plus:'<path d="M12 4v16M4 12h16"/>', search:'<circle cx="10" cy="10" r="7"/><path d="m15 15 6 6"/>',
    grid:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
    check:'<path d="m5 12 4 4L19 6"/>', chevron:'<path d="m9 5 7 7-7 7"/>', leaf:'<path d="M20 3C8 1 2 7 5 15c5 9 17 3 15-12ZM5 21l11-13"/>',
    lock:'<rect x="5" y="10" width="14" height="12" rx="2"/><path d="M8 10V6a4 4 0 0 1 8 0v4"/>',
    close:'<path d="m6 6 12 12M18 6 6 18"/>', spark:'<path d="m12 2 2.6 7.4L22 12l-7.4 2.6L12 22l-2.6-7.4L2 12l7.4-2.6L12 2Z"/>',
    home:'<path d="m2 11 10-9 10 9M5 9v13h14V9M9 22v-8h6v8"/>', chat:'<path d="M21 11a9 9 0 0 1-9 9 9 9 0 0 1-4-1l-6 2 2-6a9 9 0 1 1 17-4Z"/>'
  };
  const icon = name => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] || icons.heart}</svg>`;
  const escape = value => String(value ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
  const brand = `<span class="brand-symbol">${icon('people')}</span><span>Community<br><b>Help Network</b></span>`;
  const profiles = { mira: { name:'Mira Patel', first:'Mira', initials:'MP', role:'Requester preview' }, eli: { name:'Eli Navarro', first:'Eli', initials:'EN', role:'Helper preview' } };
  const stages = { open:'Open', invited:'Awaiting agreement', connected:'Connected', in_progress:'In progress', awaiting_confirmation:'Awaiting confirmation', resolved:'Resolved', follow_up:'Needs follow-up' };
  const sampleText = 'I could use a hand picking up groceries near Central Park this afternoon. A few pantry essentials would make the week easier.';
  const samples = [
    { category:'Groceries', icon:'bag', title:'A hand with the grocery run', summary:'A neighbor could use help picking up groceries this afternoon.', area:'Central Park', time:'Today, before 5 PM', initials:'MP', owner:'Mira P.' },
    { category:'Transport', icon:'car', title:'A ride to the community center', summary:'A short neighborhood ride would make a big difference.', area:'Maple Grove', time:'Tomorrow morning', initials:'IR', owner:'Imani R.' },
    { category:'Supplies', icon:'box', title:'A few school supplies to share', summary:'Notebooks and pencils could help a local family get ready.', area:'Riverside', time:'Flexible this week', initials:'LM', owner:'Luca M.' },
    { category:'Community', icon:'heart', title:'Help bring the garden back to life', summary:'Join a neighbor for a little planting and good company.', area:'Oakridge', time:'Saturday, 10 AM', initials:'ZK', owner:'Zuri K.' }
  ];
  const avatar = (person, small = false) => `<span class="avatar${small ? ' small' : ''}">${person.initials}</span>`;
  const stack = '<div class="avatar-stack"><span class="avatar">MP</span><span class="avatar">EN</span><span class="avatar">AK</span><span class="avatar">+8</span></div>';
  const safeSummary = 'A neighbor is looking for help picking up a few grocery essentials. Connect to coordinate the details privately.';
  const badge = text => `<span class="tag">${escape(text)}</span>`;
  const metadata = (area, time) => `<div class="metadata"><span>${icon('pin')}${escape(area)}</span><span>${icon('clock')}${escape(time)}</span></div>`;

  class PrototypeApp {
    constructor() {
      this.journey = new PrototypeJourney();
      this.root = document.querySelector('#app'); this.dialog = document.querySelector('#prototype-dialog');
      this.draft = { raw:'', area:'', timing:'Today, 1–5 PM' }; this.formError = ''; this.filter = 'All requests'; this.query = ''; this.loading = false;
      document.addEventListener('click', event => this.onClick(event));
      document.addEventListener('submit', event => this.onSubmit(event));
      document.addEventListener('input', event => this.onInput(event));
      window.addEventListener('hashchange', () => this.render(true));
      document.querySelector('.skip-link').addEventListener('click', event => { event.preventDefault(); const main = document.querySelector('#main-content'); if (main) { main.setAttribute('tabindex', '-1'); main.focus(); } });
      this.dialog.addEventListener('click', event => { if (event.target === this.dialog) this.dialog.close(); });
      this.render();
    }
    get route() { const route = location.hash.slice(1) || 'home'; return ['home','dashboard','activity','resources','new','review','case'].includes(route) ? route : 'home'; }
    get person() { return profiles[this.journey.persona] || profiles.mira; }
    go(route) { if (location.hash === `#${route}`) this.render(true); else location.hash = route; }
    toast(message) {
      const node = document.querySelector('.toast'); node.textContent = message; node.classList.add('visible');
      clearTimeout(this.toastTimer); this.toastTimer = setTimeout(() => node.classList.remove('visible'), 4500);
    }
    modal(title, body, label = 'Prototype preview') {
      this.dialog.innerHTML = `<div class="modal-head">${badge(label)}<button class="close" aria-label="Close dialog" data-action="close">${icon('close')}</button></div><h2 id="modal-title">${title}</h2>${body}`;
      this.dialog.showModal();
    }
    signIn(target = 'dashboard', preferred = 'mira') {
      this.loginTarget = target;
      this.modal('Step into the neighborhood.', `<p>Try the journey as a fictional neighbor. This is a demo entry screen, with no real account or password.</p><div class="persona-options"><button class="persona-option" data-action="login" data-persona="${preferred}">${avatar(profiles[preferred])}<span><strong>Continue as ${profiles[preferred].first}</strong><small>${profiles[preferred].role} · Fictional demo account</small></span>${icon('arrow')}</button></div><div class="auth-next">Start as Mira to ask for help. Later, switch to Eli’s view to experience the helper’s side of the same connection.</div><p class="modal-foot">Only use fictional information. Progress is kept in this browser tab, not on a server.</p>`, 'Demo sign-in');
    }
    switchPersona(target) {
      if (target) { this.journey.signIn(target); this.render(); this.toast(`Now viewing as ${this.person.first}. This is simulated identity switching.`); return; }
      this.modal('See the other side.', `<p>Walk through the same grocery request from each neighbor’s perspective.</p><div class="persona-options">${Object.entries(profiles).map(([id, person]) => `<button class="persona-option" data-action="switch-to" data-persona="${id}">${avatar(person)}<span><strong>${person.name}</strong><small>${person.role}${this.journey.persona === id ? ' · Currently viewing' : ''}</small></span>${icon('arrow')}</button>`).join('')}</div><p class="modal-foot">These preview controls are not authentication or access security.</p>`, 'Change demo perspective');
    }
    nav() {
      const current = this.route;
      const items = [['dashboard','grid','Community desk'],['activity','heart','My activity'],['resources','box','Resources']];
      return `<aside class="app-sidebar"><a href="#home" class="brand">${brand}</a><nav class="sidebar-nav" aria-label="Dashboard navigation">${items.map(([route, sym, label]) => `<a href="#${route}" class="${current === route ? 'active' : ''}">${icon(sym)}${label}</a>`).join('')}<span class="sidebar-caption">Lend a hand</span><button data-action="helper-info">${icon('people')}My availability</button><a href="#home">${icon('home')}Public homepage</a></nav><div class="sidebar-bottom"><div class="sidebar-note">A little help today builds the network we can count on tomorrow.</div><button class="identity-button" data-action="switch">${avatar(this.person)}<span><strong>${this.person.name}</strong><small>${this.person.role}</small></span>${icon('chevron')}</button><button class="signout-link" data-action="signout">Leave demo account</button></div></aside>`;
    }
    shell(content) {
      const labels = { dashboard:'Community desk', activity:'My activity', resources:'Community resources', new:'Ask for help', review:'Review request', case:'Your grocery request' };
      return `${this.nav()}<div class="app-main"><header class="desk-topbar"><div class="breadcrumbs"><a href="#dashboard">Riverton</a>${icon('chevron')}<strong>${labels[this.route] || 'Community desk'}</strong></div><a href="#home" class="brand mobile-brand">${brand}</a><button class="preview-identity" data-action="switch"><span class="text">Viewing as ${this.person.first} · </span>${avatar(this.person)}${icon('chevron')}</button></header><nav class="mobile-nav" aria-label="Mobile dashboard navigation"><a href="#dashboard" class="${this.route === 'dashboard' ? 'active' : ''}">Community desk</a><a href="#activity" class="${this.route === 'activity' ? 'active' : ''}">My activity</a><a href="#resources" class="${this.route === 'resources' ? 'active' : ''}">Resources</a><a href="#home">Homepage</a></nav><main id="main-content">${content}</main><div class="app-footer"><span>Riverton · Fictional demo community</span><span>HTML prototype · No backend, real notifications, or real accounts</span></div></div>`;
    }
    heading(eyebrow, title, description, actions = '') {
      return `<section class="workspace-heading"><div><div class="eyebrow">${eyebrow}</div><h1 tabindex="-1">${title}</h1><p>${description}</p></div>${actions ? `<div class="heading-actions">${actions}</div>` : ''}</section>`;
    }
    render(scroll = false) {
      const previousScroll = window.scrollY;
      if (this.route !== 'home' && !this.journey.persona) {
        this.root.innerHTML = this.home(); this.signIn(this.route); return;
      }
      const views = { home:() => this.home(), dashboard:() => this.dashboard(), activity:() => this.activity(), resources:() => this.resources(), new:() => this.requestForm(), review:() => this.review(), case:() => this.caseDetail() };
      const content = views[this.route]();
      this.root.innerHTML = this.route === 'home' ? content : this.shell(content);
      document.title = `${this.route === 'home' ? 'Welcome' : this.route === 'case' ? 'Grocery help journey' : 'Your community'} · Community Help Network prototype`;
      if (scroll) { window.scrollTo({ top:0, behavior:'instant' }); this.root.querySelector('h1')?.focus({ preventScroll:true }); }
      else window.scrollTo({ top:previousScroll, behavior:'instant' });
    }
    sampleCard(sample, homepage = false) {
      const action = `<button class="text-link" data-action="sample" data-category="${sample.category}">${homepage ? 'Explore request' : 'View example'} ${icon('up')}</button>`;
      if (homepage) return `<article class="request reveal"><div class="request-top"><span class="category">${icon(sample.icon)}</span>${badge(sample.category)}</div><h3>${sample.title}</h3><p>${sample.summary}</p>${metadata(sample.area,sample.time)}<div class="request-footer"><span class="member">${avatar({initials:sample.initials},true)}${sample.owner}</span>${action}</div></article>`;
      return `<article class="help-item reveal" data-filter-category="${sample.category}"><span class="category">${icon(sample.icon)}</span><div><h3>${sample.title}</h3><p>${sample.summary}</p>${metadata(sample.area,sample.time)}</div><div class="help-item-right">${action}<span class="help-member">${avatar({initials:sample.initials},true)}${sample.owner}</span></div></article>`;
    }
    home() {
      const signed = Boolean(this.journey.persona);
      return `<div class="homepage wrap"><header class="topbar"><a href="#home" class="brand">${brand}</a><nav class="nav" aria-label="Homepage navigation"><a href="#home" class="inline-label">Our neighborhood</a><button data-action="how">How it works</button><button data-action="resources-entry">Resources</button></nav><div class="actions">${signed ? `<a href="#dashboard" class="btn small">Your community ${icon('arrow')}</a>` : '<button class="btn small outline" data-action="signin">Demo sign in</button>'}</div></header><main id="main-content"><section class="hero"><div class="reveal"><div class="eyebrow">Everyday help. Lasting connections.</div><h1 tabindex="-1">Good neighbors.<br>Stronger together.</h1><p>Ask for what you need. Share what you can. A little help today builds a community we can count on tomorrow.</p><div class="hero-buttons"><button class="btn" data-action="need">${icon('plus')}I need help</button><button class="btn outline" data-action="can-help">I can help ${icon('up')}</button></div><div class="hero-people">${stack}<span>A neighborhood built by the people in it.</span></div></div><div class="neighborhood reveal"><img src="assets/neighborhood.svg" width="500" height="345" alt="Two connected homes in a welcoming green neighborhood"><span class="pulse-point"></span><div class="art-note"><div><strong>Help is closer than you think.</strong><span class="subtle">Riverton · Fictional demo community</span></div>${icon('heart')}</div></div></section><section class="connection-strip" aria-label="Illustrative community numbers"><div><strong>31</strong><p>fictional neighbors</p></div><div><strong>17</strong><p>illustrative offers of help</p></div><div><strong>8</strong><p>example connections</p></div><div class="end">${icon('shield')}<p>Safe summaries. Private details. Mutual agreement.</p></div></section><div class="prototype-intro">${icon('spark')}A clickable design study: follow one grocery request from asking to confirmed help.</div><div class="main-grid"><section><div class="section-head"><div><h2>Around the neighborhood</h2><p>Small things we can do for each other.</p></div><button class="text-link" data-action="explore">Explore the community ${icon('arrow')}</button></div><div class="requests">${samples.slice(0,2).map(s=>this.sampleCard(s,true)).join('')}</div></section><aside class="right-rail"><div class="preparedness">${icon('leaf')}<h3>A network before<br>it’s needed.</h3><p>The people who help on ordinary days are the foundation for a community that can coordinate when conditions change.</p><button class="text-link" data-action="vision">The bigger picture ${icon('arrow')}</button></div></aside></div><section class="home-how" id="how-it-works"><div><span class="eyebrow">Good intentions. Clear next steps.</span><h2 style="margin-top:12px">Help that gets followed through.</h2><p>Finding a match is the beginning. Both neighbors agree, coordinate privately, and confirm that help was received.</p></div><ol><li><span class="number-circle">01</span>Ask in your own words.</li><li><span class="number-circle">02</span>Choose a connection together.</li><li><span class="number-circle">03</span>Coordinate, help, and confirm.</li></ol></section></main><footer><span>Community Help Network · For the people, by the people.</span><span>Connected A-to-B prototype · Synthetic activity only</span></footer></div>`;
    }
    nextStep() {
      const r = this.journey.request; if (!r) return '';
      const copy = {
        open:['Your request is ready to connect.', 'Review Eli’s suggested match and decide whether to invite him.'],
        invited:['A connection takes two yeses.', this.journey.persona === 'eli' ? 'Mira invited you to help. Review the request and choose whether to accept.' : 'You have agreed. Eli still needs to review and accept your invitation.'],
        connected:['You’re connected. Make a plan together.', 'Private coordination is open. Share instructions, then Eli can start the grocery pickup.'],
        in_progress:['A helping hand is on the way.', 'Eli is picking up the groceries. Delivery still needs to be reported and confirmed.'],
        awaiting_confirmation:['Delivery reported. Receipt still matters.', this.journey.persona === 'mira' ? 'Confirm that you received the groceries, or flag that you still need help.' : 'Mira needs to confirm receiving the groceries before the request is resolved.'],
        resolved:['A little help made it all the way.', 'Mira confirmed receiving the groceries. Explore the timeline and the updated activity view.'],
        follow_up:['Help is still needed.', 'The request stays visible for follow-up. It is not counted as confirmed assistance.']
      }[r.stage];
      return `<section class="journey-next"><div><span class="eyebrow">Your grocery journey · CHN-1048</span><h3>${copy[0]}</h3><p>${copy[1]}</p></div><a href="#case" class="btn small">${r.stage === 'resolved' ? 'See outcome' : 'Continue journey'}${icon('arrow')}</a></section>`;
    }
    dashboard() {
      const r = this.journey.request; const isHelper = this.journey.persona === 'eli';
      const visible = samples.filter(s => (this.filter === 'All requests' || s.category === this.filter) && `${s.title} ${s.area}`.toLowerCase().includes(this.query.toLowerCase()));
      return `${this.heading('Your neighborhood, in motion.',`Good afternoon, ${this.person.first}.<br>Where can we help today?`,'Every connection starts with someone showing up.',`<button class="btn" data-action="need">${icon('plus')}Ask for help</button><button class="btn outline" data-action="can-help">Offer a hand${icon('up')}</button>`)}${this.nextStep()}<div class="dashboard-grid"><div><section class="summary" aria-label="Demo activity counts"><div><strong>${r && !['resolved'].includes(r.stage) ? 1 : 0}</strong><p>${isHelper ? 'Request in this journey' : 'Your open requests'}</p><small>Always tracked to an outcome</small></div><div><strong>${samples.length}</strong><p>Community examples</p><small>Fictional neighborhood activity</small></div><div><strong>${r?.stage === 'resolved' ? 1 : 0}</strong><p>Confirmed help received</p><small>Confirmation, not assignment</small></div></section><section><div class="desk-section-head"><div><h2>A place to lend a hand</h2><p>Everyday needs, close to home.</p></div>${badge('Synthetic requests')}</div><label class="search section-search">${icon('search')}<span class="screen-reader">Search community examples</span><input id="community-search" placeholder="Find a request or neighborhood…" value="${escape(this.query)}"></label><div class="filters" aria-label="Request categories">${['All requests','Groceries','Transport','Supplies','Community'].map(c=>`<button class="filter ${this.filter===c?'active':''}" data-action="filter" data-category="${c}" aria-pressed="${this.filter===c}">${c}</button>`).join('')}</div><div id="sample-results">${visible.map(s=>this.sampleCard(s)).join('') || '<p class="no-results-prototype">No examples match. Try another category or neighborhood.</p>'}</div></section></div><aside class="desk-rail"><div class="network-note"><span class="eyebrow">People are the infrastructure.</span><h3>Familiar faces.<br>A stronger network.</h3><p>The same neighbors and organizations, building trust one ordinary day at a time.</p>${stack}<div class="rule"></div><p style="font-size:10px">This is a visual prototype. The numbers and people are fictional.</p></div><div class="rail-section"><h3>Your community partners</h3>${this.partners()}<a href="#resources" class="text-link">Explore resources${icon('arrow')}</a></div><div class="rail-section" style="border-top:1px solid var(--line)"><h3>You choose the connection.</h3><p style="margin-top:12px">Both neighbors agree before private coordination opens. Reported delivery stays unconfirmed until the requester says it arrived.</p></div></aside></div>`;
    }
    partners() { return `<div class="organization"><span class="category">${icon('bag')}</span><div><strong>Harbor Community Center</strong><p>Food and essentials · Demo partner</p></div></div><div class="organization"><span class="category">${icon('home')}</span><div><strong>Riverton Shelter Collective</strong><p>Accommodation referrals · Demo partner</p></div></div>`; }
    activity() {
      const r = this.journey.request;
      return `${this.heading('Your part in the neighborhood.','My activity','Requests, commitments, and the help that makes it all the way.')} ${r ? `${this.nextStep()}<section class="form-panel"><div class="desk-section-head"><h2>Grocery assistance</h2>${badge(stages[r.stage])}</div><p>${safeSummary}</p>${metadata(r.area,r.timing)}<div class="form-actions" style="margin-top:24px"><a class="btn" href="#case">Open request ${icon('arrow')}</a><span class="subtle">${r.stage==='resolved'?'1 need confirmed · 0 outstanding needs':'1 need tracked · Not yet confirmed'}</span></div></section>` : `<div class="empty-pane">${icon('heart')}<h3>A little help starts here.</h3><p>You haven’t started the demo journey yet. Ask for groceries to explore the complete connection and confirmation flow.</p><button class="btn" data-action="need">Ask for help ${icon('arrow')}</button></div>`}`;
    }
    resources() { return `${this.heading('Part of the same community.','A network of useful resources','Illustrative organizations show how everyday participation forms a foundation for emergency coordination.')}<div class="notice-box">${icon('shield')}<span>These organizations and capacities are fictional. Resource reservations and emergency workflows are outside this grocery-journey prototype.</span></div><section class="resource-list" style="margin-top:25px">${[['bag','Harbor Community Center','Food pantry and essential-supply support','Central Park'],['home','Riverton Shelter Collective','Accommodation referrals and community preparedness','Riverside'],['car','Maple Mobility Partners','Everyday community transportation','Maple Grove']].map(([sym,name,description,area])=>`<article class="resource-item"><span class="category">${icon(sym)}</span><div><h3>${name}</h3><p>${description}</p>${metadata(area,'Illustrative listing')}</div>${badge('Fictional partner')}</article>`).join('')}</section>`; }
    formSteps(review = false) { return `<div class="form-steps" aria-label="Request steps"><span class="${review?'':'active'}"><b>${review?icon('check'):'1'}</b>Describe the need</span><span class="${review?'active':''}"><b>2</b>Review details</span><span><b>3</b>Track your request</span></div>`; }
    formAside() { return `<aside class="form-help">${icon('shield')}<h3>A helping hand, on your terms.</h3><p>Your words help organize the request. A safe summary goes to the community; original details stay separate.</p><ol><li><span class="number-circle">01</span><div><h4>You review the details.</h4><p>Correct the neighborhood and timeframe before posting.</p></div></li><li><span class="number-circle">02</span><div><h4>Both neighbors agree.</h4><p>A suggestion never becomes an automatic assignment.</p></div></li><li><span class="number-circle">03</span><div><h4>Follow-through matters.</h4><p>Help is resolved only after the requester confirms receipt.</p></div></li></ol>${badge('Grocery journey · Design preview')}</aside>`; }
    requestForm() {
      if (this.journey.persona !== 'mira') return `${this.heading('Experience the requester’s perspective.','Try asking as Mira.','Mira is the requester in this fictional journey. Eli’s preview is for reviewing invitations and providing help.')}<button class="btn" data-action="requester-view">Switch to Mira’s preview ${icon('arrow')}</button>`;
      return `${this.heading('Your neighbors are a good place to start.','What could you use a hand with?','Tell us in your own words. This prototype follows one everyday grocery request.')} ${this.formSteps()}<div class="form-layout"><form class="form-panel ${this.loading?'is-loading':''}" id="request-form">${this.formError?`<div class="inline-error" role="alert">${escape(this.formError)}</div>`:''}<div class="field"><label for="request-text">Describe the help you need</label><textarea id="request-text" name="raw" required minlength="12" maxlength="1200" rows="5" placeholder="I could use help picking up groceries near Central Park this afternoon…" aria-describedby="request-hint">${escape(this.draft.raw)}</textarea><small id="request-hint">Only use fictional information. Keep exact addresses, phone numbers, and sensitive details out of this demo.</small></div><div class="field"><label for="request-category">Type of help</label><select id="request-category" aria-describedby="category-hint"><option>Groceries &amp; essentials</option></select><small id="category-hint">This design prototype focuses on one complete grocery-help journey.</small></div><div class="form-actions"><button class="btn" type="submit" data-analyze ${this.loading?'disabled':''}>${icon('spark')}${this.loading?'Organizing preview…':'Organize my request'}${icon('arrow')}</button><button class="text-link" type="button" data-action="example">Use the grocery example</button></div>${this.loading?'<div class="processing" role="status"><div class="skeleton"></div><div class="skeleton"></div><div class="skeleton"></div><span class="screen-reader">Simulating request organization</span></div>':''}<div class="notice-box" style="margin-top:23px">${icon('spark')}<span>Simulated assistance only. No AI model is called; the next screen previews how extracted details can be reviewed.</span></div></form>${this.formAside()}</div>`;
    }
    review() {
      if (!this.draft.raw) return this.requestForm();
      return `${this.heading('Your words. Your choice.','Does this look right?','Check the details before sharing a safe summary with your community.')} ${this.formSteps(true)}<div class="form-layout"><form class="form-panel" id="review-form">${this.formError?`<div class="inline-error" role="alert">${escape(this.formError)}</div>`:''}<div class="notice-box">${icon('spark')}<span><strong>Simulated extraction.</strong> This is a design preview of the review step. No model was used, and you can correct the suggested details.</span></div><div class="review-summary">${badge('What neighbors would see')}<h3>A hand with the grocery run</h3><p>${safeSummary}</p></div><div class="input-row"><div class="field"><label for="review-area">General neighborhood</label><select id="review-area" name="area" required><option value="">Choose a neighborhood</option>${['Central Park','Riverside','Maple Grove','Oakridge'].map(a=>`<option ${this.draft.area===a?'selected':''}>${a}</option>`).join('')}</select><small>${this.draft.area?'Suggested from your fictional message.':'Not found in the message. Please choose it yourself.'}</small></div><div class="field"><label for="review-timing">When would help be useful?</label><select id="review-timing" name="timing"><option ${this.draft.timing==='Today, 1–5 PM'?'selected':''}>Today, 1–5 PM</option><option ${this.draft.timing==='Tomorrow, 9 AM–noon'?'selected':''}>Tomorrow, 9 AM–noon</option></select><small>A preferred window, not a promised response time.</small></div></div><details class="raw-content" style="margin:0 0 24px"><summary>Your original message · requester view</summary><p>${escape(this.draft.raw)}</p><small>This text will not appear in the public summary.</small></details><div class="form-actions"><button type="submit" class="btn">Post my request ${icon('arrow')}</button><a href="#new" class="text-link">Edit my message</a></div></form>${this.formAside()}</div>`;
    }
    caseDetail() {
      const r = this.journey.request;
      if (!r) return `${this.heading('Every request starts somewhere.','No request yet.','Start with a fictional grocery request to explore the full journey.')}<button class="btn" data-action="need">Ask for help ${icon('arrow')}</button>`;
      const index = {open:0,invited:0,connected:1,in_progress:2,awaiting_confirmation:3,resolved:4,follow_up:3}[r.stage];
      return `${this.heading(`CHN-1048 · ${this.journey.persona==='mira'?'Your request':'Mira’s request'}`,'A hand with the grocery run',safeSummary, badge(stages[r.stage]))}<section class="case-overview"><div><span>General neighborhood</span><strong>${icon('pin')}${escape(r.area)}</strong></div><div><span>Requested window</span><strong>${icon('clock')}${escape(r.timing)}</strong></div><div><span>Requested by</span><strong>Mira Patel · Demo neighbor</strong></div><div><span>Help needed</span><strong>1 grocery pickup</strong></div></section><div class="case-layout"><div><div class="journey-progress" aria-label="Request progress">${['Request posted','Both agreed','In progress','Confirm receipt','Resolved'].map((label,i)=>`<div class="progress-step ${i<index?'done':i===index?'current':''}" ${i===index?'aria-current="step"':''}>${label}</div>`).join('')}</div>${this.caseAction()}${this.coordination()}${this.journey.persona==='mira'?`<details class="raw-content"><summary>Your original message · only in requester preview</summary><p>${escape(r.raw)}</p><small>This is never included in the neighbor-facing summary or Eli’s view.</small></details>`:''}</div><aside class="case-rail"><h3>The story so far</h3><ol class="timeline">${r.events.map(event=>`<li><p>${escape(event.title)}</p><small>${escape(event.actor)} · ${escape(event.time)}</small></li>`).join('')}</ol><div class="rail-note">${icon('shield')}<h3 style="margin-top:12px">A match is the beginning.</h3><p>Someone agreeing to help is different from help being delivered. The requester confirms the outcome.</p></div><div style="margin-top:24px"><a href="#activity" class="text-link">Your activity ${icon('arrow')}</a></div></aside></div>`;
    }
    caseAction() {
      const r=this.journey.request, helper=this.journey.persona==='eli';
      if (r.stage==='resolved') return `<section class="success-panel"><span class="success-icon">${icon('check')}</span><span class="eyebrow">A little help. All the way through.</span><h2>Groceries received.<br>Connection made.</h2><p>Mira confirmed the groceries arrived. This request is resolved because the outcome was confirmed, not simply because a helper was assigned.</p><div class="outcome">${icon('check')}1 need confirmed · 0 outstanding needs</div><div class="form-actions"><a href="#dashboard" class="btn">Back to the community ${icon('arrow')}</a><button class="text-link" data-action="reset">Try the journey again</button></div></section>`;
      if (r.stage==='open') {
        if (!this.journey.hasMatch) return `<div class="status-panel"><h3>No suitable helper in this preview.</h3><p>Eli offers groceries in Central Park and Riverside today, 1–5 PM. Your chosen area or time doesn’t fit. We won’t suggest an incompatible match.</p><button class="btn outline" data-action="edit-details">Review the request details ${icon('arrow')}</button></div>`;
        return `<section class="case-section" style="margin-top:0"><div class="desk-section-head"><h2>A neighbor who could help</h2>${badge('Suggested · not assigned')}</div><p>A fictional suggestion based on the capability, neighborhood, and time you chose.</p><div class="match-card"><div class="person-row">${avatar(profiles.eli)}<div><h3>Eli Navarro</h3><p>Community neighbor · Demo profile</p></div>${badge('Groceries')}</div><ul class="match-reasons"><li>${icon('check')}Offers grocery pickup and delivery.</li><li>${icon('check')}Serves ${escape(r.area)}.</li><li>${icon('check')}Available today, 1–5 PM.</li></ul><div class="form-actions">${helper?'<button class="btn" data-action="switch-to" data-persona="mira">View as Mira to invite Eli</button>':`<button class="btn" data-action="invite">Invite Eli to help ${icon('arrow')}</button>`}<small>Your invitation records your agreement. Eli still needs to accept.</small></div></div></section>`;
      }
      const person = helper ? profiles.mira : profiles.eli;
      const consent = `<div class="consent-list"><div>${icon('check')}Mira agreed to the connection</div><div class="${r.stage==='invited'?'pending':''}">${icon(r.stage==='invited'?'clock':'check')}${r.stage==='invited'?'Waiting for Eli to agree':'Eli agreed to the connection'}</div></div>`;
      const stagesContent = {
        invited: helper ? `<h3>Mira invited you to lend a hand.</h3><p>Review the grocery need and requested window. Accept only if you’re willing and available. Private coordination opens after you agree.</p>${consent}<div class="form-actions"><button class="btn" data-action="accept">Accept invitation ${icon('check')}</button><button class="text-link" data-action="decline">Decline invitation</button></div>` : `<h3>You’ve invited Eli. Now it’s his choice.</h3><p>The request remains unassigned until Eli agrees. No private instructions have been shared.</p>${consent}<button class="btn outline" data-action="switch-to" data-persona="eli">Preview Eli’s response ${icon('arrow')}</button>`,
        connected: `<h3>You’re connected. Make a plan together.</h3><p>Both neighbors agreed. Share pickup instructions in the private section below before assistance begins.</p>${consent}${helper?`<button class="btn" data-action="start">Start grocery pickup ${icon('arrow')}</button>`:`<button class="btn outline" data-action="switch-to" data-persona="eli">Preview Eli starting help ${icon('arrow')}</button>`}`,
        in_progress: `<h3>Eli is helping with the grocery run.</h3><p>Assistance is in progress. The request stays open until delivery is reported and Mira confirms receipt.</p>${helper?`<button class="btn" data-action="deliver">Report groceries delivered ${icon('check')}</button>`:`<button class="btn outline" data-action="switch-to" data-persona="eli">Preview Eli’s delivery update ${icon('arrow')}</button>`}`,
        awaiting_confirmation: helper ? `<h3>Delivery reported. Mira confirms receipt.</h3><p>You’ve reported the groceries delivered. The request is awaiting confirmation; it is not resolved yet.</p><button class="btn outline" data-action="switch-to" data-persona="mira">Preview Mira’s confirmation ${icon('arrow')}</button>` : `<h3>Did you receive the groceries?</h3><p>Eli reported delivery. Confirm only if you received the help. If something is missing, keep the request visible for follow-up.</p><div class="form-actions"><button class="btn" data-action="confirm">Yes, I received the groceries ${icon('check')}</button><button class="text-link" data-action="follow-up">I still need help</button></div>`,
        follow_up:`<h3>Help is still needed.</h3><p>Mira hasn’t confirmed a successful outcome. The grocery need remains visible for coordinator follow-up in the eventual application.</p><div class="notice-box">${icon('clock')}<span>Not counted as confirmed assistance. Coordinator follow-up screens will be designed in a later pass.</span></div>`
      };
      return `<section class="status-panel">${badge(stages[r.stage])}<div class="person-row" style="margin-top:20px">${avatar(person)}<div><h3 style="font-size:15px;margin:0 0 5px">${person.name}</h3><p style="font-size:11px;margin:0">${helper?'Requester':'Suggested helper'} · Fictional demo neighbor</p></div></div>${stagesContent[r.stage]}</section>${['invited','connected','in_progress'].includes(r.stage)?'<div class="support-links"><button data-action="cancel-dialog">Cancel this connection</button></div>':''}`;
    }
    coordination() {
      const r=this.journey.request;
      if (!this.journey.privateOpen) return `<section class="private-section"><h2>${icon('lock')}Private coordination</h2><p>Exact instructions belong here, after both people agree.</p><div class="private-locked">${icon('lock')}<strong>Two yeses open the conversation.</strong><p>Once Mira and Eli agree, they can share details privately. No address or contact information appears in the public summary.</p></div></section>`;
      return `<section class="private-section"><h2>${icon('lock')}Private coordination</h2><p>Preview conversation between Mira and Eli · Stored only in this browser tab</p>${r.messages.length?`<div class="message-thread" aria-label="Private demo messages">${r.messages.map(message=>`<div class="message-row ${message.actor===this.journey.persona?'own':''}">${avatar(profiles[message.actor])}<div class="message-bubble"><small>${profiles[message.actor].name} · Demo</small><p>${escape(message.text)}</p></div></div>`).join('')}</div>`:'<div class="notice-box" style="margin-bottom:20px">'+icon('chat')+'<span>Your connection is agreed. Start with pickup instructions and a time that works for both of you.</span></div>'}<form class="message-form" id="message-form"><label for="private-message">Message ${this.journey.persona==='mira'?'Eli':'Mira'}</label><button type="button" class="quick-message" data-action="message-example">Use a fictional coordination message</button><div class="message-controls"><textarea id="private-message" name="message" class="message-input" rows="2" required maxlength="500" placeholder="Write a fictional pickup detail…"></textarea><button class="btn" type="submit">Add message ${icon('arrow')}</button></div><small>Prototype only. No message is transmitted. Do not enter real private information.</small></form></section>`;
    }
    onInput(event) {
      if (event.target.id==='request-text') this.draft.raw=event.target.value;
      if (event.target.id==='community-search') {
        this.query=event.target.value;
        const visible=samples.filter(s=>(this.filter==='All requests'||s.category===this.filter)&&`${s.title} ${s.area}`.toLowerCase().includes(this.query.toLowerCase()));
        document.querySelector('#sample-results').innerHTML=visible.map(s=>this.sampleCard(s)).join('')||'<p class="no-results-prototype">No examples match. Try another category or neighborhood.</p>';
      }
    }
    async onSubmit(event) {
      const form=event.target;
      if (!['request-form','review-form','message-form'].includes(form.id)) return;
      event.preventDefault(); this.formError='';
      try {
        const fields=new FormData(form);
        if (form.id==='request-form') {
          this.draft.raw=String(fields.get('raw')||'').trim();
          if (/medic|missing|trapped|flood|rescue|exact address|prescription|bleeding|suicid|abuse/i.test(this.draft.raw)) throw new Error('This looks potentially sensitive or urgent. This everyday grocery prototype will not post it. Please use the fictional grocery example; private review workflows will be designed separately.');
          if (this.draft.raw.length<12) throw new Error('Add a little more detail, or use the fictional example.');
          this.draft.area=['Central Park','Riverside','Maple Grove','Oakridge'].find(a=>this.draft.raw.toLowerCase().includes(a.toLowerCase()))||'';
          this.loading=true; this.render();
          await new Promise(resolve=>setTimeout(resolve,500));
          this.loading=false; this.go('review'); return;
        }
        if (form.id==='review-form') {
          this.draft.area=String(fields.get('area')||''); this.draft.timing=String(fields.get('timing')||'');
          this.journey.create(this.draft); this.go('case'); this.toast('Request posted in this tab. Only the safe summary is shown to neighbors.'); return;
        }
        this.journey.message(String(fields.get('message')||'')); this.render(); this.toast('Demo message added locally. Nothing was sent.');
      } catch(error) {
        this.loading=false; this.formError=error.message||'Please check the details.'; this.render();
        if (form.id==='message-form') this.toast(this.formError);
      }
    }
    onClick(event) {
      const button=event.target.closest('[data-action]'); if(!button) return;
      const action=button.dataset.action;
      try {
        if(action==='close'){this.dialog.close();return;}
        if(action==='signin'){this.signIn();return;}
        if(action==='login'){this.journey.signIn(button.dataset.persona);this.dialog.close();this.go(this.loginTarget||'dashboard');return;}
        if(action==='switch'){this.switchPersona();return;}
        if(action==='switch-to'){this.dialog.close();this.switchPersona(button.dataset.persona);return;}
        if(action==='signout'){this.journey.signOut();this.go('home');return;}
        if(action==='need'){
          if(this.journey.request){if(!this.journey.persona)this.signIn('case');else this.go('case');return;}
          if(!this.journey.persona)this.signIn('new');else this.go('new');return;
        }
        if(action==='explore'){if(!this.journey.persona)this.signIn('dashboard');else this.go('dashboard');return;}
        if(action==='resources-entry'){if(!this.journey.persona)this.signIn('resources');else this.go('resources');return;}
        if(action==='can-help'||action==='helper-info'){
          if(!this.journey.persona){this.signIn('dashboard','eli');return;}
          this.modal('Meet Eli, your demo helper.',`<div class="person-row" style="margin:22px 0">${avatar(profiles.eli)}<div><h3>Eli Navarro</h3><p>Fictional neighbor · Grocery pickup and delivery</p></div></div><p>Eli covers Central Park and Riverside today, 1–5 PM. His side of this prototype lets you accept an invitation, coordinate, start the pickup, and report delivery.</p><button class="btn" data-action="switch-to" data-persona="eli">View as Eli ${icon('arrow')}</button><p class="modal-foot">Editing and publishing new offers will be explored in a later design pass.</p>`,'Helper preview');return;
        }
        if(action==='requester-view'){this.journey.signIn('mira');this.go('new');return;}
        if(action==='example'){this.draft={raw:sampleText,area:'Central Park',timing:'Today, 1–5 PM'};this.formError='';this.render();document.querySelector('#request-text')?.focus();return;}
        if(action==='filter'){this.filter=button.dataset.category;this.render();return;}
        if(action==='sample'){
          const sample=samples.find(s=>s.category===button.dataset.category);
          this.modal(sample.title,`<p>${sample.summary}</p><div style="margin:20px 0">${metadata(sample.area,sample.time)}</div><p>Community listings show safe summaries. This design pass follows one complete grocery-help journey.</p><button class="btn" data-action="sample-journey">Try the grocery journey ${icon('arrow')}</button><p class="modal-foot">Fictional request · No actual person is requesting assistance.</p>`,'Community example');return;
        }
        if(action==='sample-journey'){this.dialog.close();this.draft={raw:sampleText,area:'Central Park',timing:'Today, 1–5 PM'};if(!this.journey.persona)this.signIn('new');else if(this.journey.request)this.go('case');else this.go('new');return;}
        if(action==='how'){document.querySelector('#how-it-works')?.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});return;}
        if(action==='vision'){this.modal('Build the network before it’s needed.','<p>Everyday help builds familiarity, participation, and trust. During an emergency, the same members, organizations, and resources adapt under new priorities and renewed availability checks.</p><div class="notice-box" style="margin-top:22px">The connected homepage and grocery journey are this design pass. Coordinator and Emergency Mode screens come in a later pass.</div>','The product’s foundation');return;}
        if(action==='message-example'){document.querySelector('#private-message').value=this.journey.persona==='mira'?'Thanks, Eli. Could we meet at the community center entrance at 3 PM? These are fictional pickup instructions.':'That works, Mira. I’ll collect the groceries and meet you at 3 PM. This is a fictional coordination message.';document.querySelector('#private-message').focus();return;}
        if(action==='edit-details'){this.draft={raw:this.journey.request.raw,area:this.journey.request.area,timing:this.journey.request.timing};this.go('review');return;}
        if(action==='cancel-dialog'){this.modal('Leave this need open?','<p>Cancelling ends this connection and reopens the grocery need. The timeline stays visible, and the private conversation is cleared in this prototype.</p><div class="cancel-dialog-actions"><button class="btn outline" data-action="close">Keep the connection</button><button class="btn" data-action="cancel">Cancel connection</button></div>','Cancel connection');return;}
        if(action==='reset'){this.journey.reset();this.filter='All requests';this.query='';this.draft={raw:'',area:'',timing:'Today, 1–5 PM'};this.formError='';this.dialog.close();this.go('home');this.toast('Fictional journey reset. You’re back at the public homepage.');return;}
        const operations={invite:()=>this.journey.invite(),accept:()=>this.journey.respond(true),decline:()=>this.journey.respond(false),start:()=>this.journey.start(),deliver:()=>this.journey.deliver(),confirm:()=>this.journey.confirm(),'follow-up':()=>this.journey.followUp(),cancel:()=>this.journey.cancel()};
        if(Object.hasOwn(operations,action)){operations[action]();if(this.dialog.open)this.dialog.close();this.render();const messages={invite:'Invitation created. Eli still needs to agree.',accept:'Both neighbors agreed. Private coordination is now open.',decline:'Invitation declined. The request remains open.',start:'Grocery assistance is in progress.',deliver:'Delivery reported. Mira still needs to confirm receipt.',confirm:'Mira confirmed receiving groceries. The outcome is now resolved.','follow-up':'Help remains needed. No successful outcome was counted.',cancel:'Connection cancelled. The need is open again.'};this.toast(messages[action]);}
      } catch(error) { this.toast(error.message||'That preview step is unavailable.'); }
    }
  }
  new PrototypeApp();
})();
