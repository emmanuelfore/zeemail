import React, { useRef, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageTransition, { PageTransitionHandle } from '../components/shared/PageTransition';
import { FloatingWhatsApp } from '../components/shared/FloatingWhatsApp';
import { Logo } from '../components/shared/Logo';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { usePricing } from '../hooks/useSettings';
import type { Plan } from '../types';

const TLD = '.co.zw';
const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '';

const TESTIMONIALS = [
  { id:'1', author:'Tatenda Chunga', role:'Founder', company:'ZimTech Solutions', quote:'ZeeMail made it so easy to get our .co.zw email addresses linked with our existing Gmail. The local support is actually based in Harare and they know their stuff.', avatar:'https://i.pravatar.cc/150?u=tatenda' },
  { id:'2', author:'Ruvimbo Mapfumo', role:'Managing Director', company:'Harare Logistics', quote:'Switching to ZeeMail was the best decision for our brand. Having a professional .co.zw email built on a stable platform has significantly increased customer trust.', avatar:'https://i.pravatar.cc/150?u=ruvimbo' },
  { id:'3', author:'Kuda Mafemba', role:'Creative Director', company:'Bulawayo Creatives', quote:'Fast setup and excellent reliability. We had our entire team on board with professional emails in less than 24 hours. Highly recommended for any local business.', avatar:'https://i.pravatar.cc/150?u=kuda' },
];

// Move PLANS and COMPARISON_DATA inside the component or pass them as props if they need to be static.
// I'll use PLANS_DYNAMIC and COMPARISON_DYNAMIC inside the component.

const STATS = [
  { value:'1,240+', label:'Active domains' },
  { value:'99.9%', label:'Uptime SLA' },
  { value:'< 24h', label:'Go-live time' },
  { value:'ZIM$', label:'Local pricing' },
];

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@500;600;700;800&family=Inter:wght@400;500;600;700&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  :root{
    --red:#8C1007;--red-dark:#5C0904;--red-mid:#B01209;
    --cream:#FFFDF5;--cream-2:#FFF9E8;--cream-3:#FBF3D9;--cream-4:#F5EBC1;
    --ink:#1A0400;--muted:#9A6040;
    --border:rgba(140,16,7,0.11);--border-strong:rgba(140,16,7,0.20);
    --ff-display:'Outfit', sans-serif;--ff-body:'Inter', sans-serif;
    --shadow-sm:0 2px 12px rgba(140,16,7,0.06);--shadow-md:0 8px 32px rgba(140,16,7,0.09);
    --shadow-lg:0 20px 60px rgba(140,16,7,0.13);--shadow-xl:0 32px 80px rgba(140,16,7,0.17);
    --max-w:1200px;--px:clamp(1.25rem,4vw,2.5rem)
  }
  body{background:var(--cream);color:var(--ink);font-family:var(--ff-body);-webkit-font-smoothing:antialiased;letter-spacing:-0.01em}
  @keyframes spin{to{transform:rotate(360deg)}}
  @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
  .anim-1{animation:fadeUp .55s ease both}
  .anim-2{animation:fadeUp .55s .10s ease both}
  .anim-3{animation:fadeUp .55s .20s ease both}
  .anim-4{animation:fadeUp .55s .30s ease both}

  .wrap{width:100%;max-width:var(--max-w);margin:0 auto;padding:0 var(--px)}

  .nav-root{position:fixed;top:0;left:0;right:0;z-index:1000;height:68px;display:flex;align-items:center;transition:background .3s,backdrop-filter .3s,border-color .3s}
  .nav-root.scrolled{background:rgba(255,253,245,0.93);backdrop-filter:blur(16px);border-bottom:1px solid var(--border)}
  .nav-inner{width:100%;max-width:var(--max-w);margin:0 auto;padding:0 var(--px);display:flex;align-items:center;justify-content:space-between;gap:1rem}
  .nav-logo{font-family:var(--ff-display);font-size:1.625rem;font-weight:800;color:var(--red);cursor:pointer;letter-spacing:-0.02em;line-height:1;border:none;background:none;flex-shrink:0}
  .nav-links{display:flex;align-items:center;gap:.125rem}
  .nav-link{background:none;border:none;cursor:pointer;font-family:var(--ff-body);font-size:.9rem;font-weight:600;color:var(--muted);padding:6px 14px;border-radius:999px;transition:color .18s,background .18s;white-space:nowrap}
  .nav-link:hover{color:var(--red);background:rgba(140,16,7,0.06)}
  .nav-cta{font-family:var(--ff-body);font-size:.875rem;font-weight:700;background:var(--red);color:white;border:none;padding:9px 22px;border-radius:999px;cursor:pointer;flex-shrink:0;box-shadow:0 4px 16px rgba(140,16,7,0.28);transition:background .18s,transform .1s}
  .nav-cta:hover{background:var(--red-mid)}
  .nav-cta:active{transform:scale(.97)}

  .btn-primary{display:inline-flex;align-items:center;justify-content:center;gap:8px;font-family:var(--ff-body);font-weight:700;cursor:pointer;border:none;background:var(--red);color:white;border-radius:12px;transition:background .18s,transform .1s,box-shadow .18s;box-shadow:0 6px 20px rgba(140,16,7,0.28)}
  .btn-primary:hover{background:var(--red-mid);box-shadow:0 8px 28px rgba(140,16,7,0.35)}
  .btn-primary:active{transform:scale(.97)}

  .domain-wrap{background:white;border:1.5px solid var(--border-strong);border-radius:16px;display:flex;align-items:center;padding:5px 5px 5px 1.125rem;gap:8px;box-shadow:var(--shadow-md);transition:border-color .2s,box-shadow .2s}
  .domain-wrap:focus-within{border-color:var(--red);box-shadow:0 0 0 4px rgba(140,16,7,0.08),var(--shadow-md)}
  .domain-input{flex:1;background:transparent;border:none;outline:none;font-family:var(--ff-body);font-size:1rem;font-weight:600;color:var(--ink);min-width:0}
  .domain-input::placeholder{color:#C9A98A;font-weight:400}
  .domain-tld{font-family:var(--ff-body);font-weight:800;font-size:.9375rem;color:var(--red);white-space:nowrap;flex-shrink:0}

  .feat-card{background:white;border:1px solid var(--border);border-radius:20px;padding:1.75rem;box-shadow:var(--shadow-sm);transition:transform .2s,box-shadow .2s,border-color .2s}
  .feat-card:hover{transform:translateY(-3px);box-shadow:var(--shadow-lg);border-color:var(--border-strong)}
  .feat-icon{width:50px;height:50px;border-radius:14px;display:flex;align-items:center;justify-content:center;margin-bottom:1.125rem;background:rgba(140,16,7,0.07);border:1px solid rgba(140,16,7,0.1)}

  .plan-card{background:white;border:1.5px solid var(--border);border-radius:24px;padding:2.25rem 2rem;display:flex;flex-direction:column;position:relative;box-shadow:var(--shadow-sm);transition:transform .2s,box-shadow .2s}
  .plan-card:hover{transform:translateY(-3px);box-shadow:var(--shadow-lg)}
  .plan-card.popular{background:var(--ink);border-color:var(--ink);box-shadow:var(--shadow-xl)}

  .testi-card{background:white;border:1px solid var(--border);border-radius:20px;padding:2rem;box-shadow:var(--shadow-sm);position:relative;overflow:hidden;transition:transform .2s,box-shadow .2s}
  .testi-card:hover{transform:translateY(-3px);box-shadow:var(--shadow-md)}

  .comp-table{width:100%;border-collapse:collapse;min-width:480px}
  .comp-table thead tr{background:var(--cream-3)}
  .comp-table tbody tr{border-top:1px solid rgba(140,16,7,0.07)}
  .comp-table tbody tr:nth-child(even){background:rgba(251,243,217,0.4)}
  .comp-table td,.comp-table th{padding:1.125rem 1.5rem}

  .billing-toggle{display:inline-flex;align-items:center;gap:4px;background:var(--cream-3);border:1.5px solid var(--border-strong);border-radius:999px;padding:4px}
  .bill-btn{padding:8px 22px;border-radius:999px;border:none;font-family:var(--ff-body);font-size:.875rem;font-weight:700;cursor:pointer;transition:background .2s,color .2s;display:flex;align-items:center;gap:7px}
  .bill-btn.active{background:var(--red);color:white}
  .bill-btn.inactive{background:transparent;color:var(--muted)}
`;

function CheckSVG({ color='#22C55E', size=18 }: { color?:string; size?:number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ flexShrink:0 }}>
      <circle cx="12" cy="12" r="11" fill={color} fillOpacity="0.12" />
      <path d="M7 12.5l3.5 3.5 6-7" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CrossSVG({ size=18 }: { size?:number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ flexShrink:0, opacity:0.28 }}>
      <path d="M18 6L6 18M6 6L18 18" stroke="#9A6040" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function renderCell(val:string|boolean, primary:boolean) {
  if (typeof val === 'string') return <span style={{ fontWeight:primary?800:400, color:primary?'var(--red)':'var(--muted)', fontFamily:'var(--ff-body)', fontSize:primary?'1rem':'0.9375rem' }}>{val}</span>;
  return val
    ? <div style={{ display:'flex', justifyContent:'center' }}><CheckSVG color={primary?'#22C55E':'#9A6040'} /></div>
    : <div style={{ display:'flex', justifyContent:'center' }}><CrossSVG /></div>;
}

const DomainSearch = ({ onRegister }: { onRegister?:(n:string,t:string)=>void }) => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ available:boolean; name:string }|null>(null);

  const doSearch = async (val:string) => {
    if (val.length < 3) { setResult(null); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/domains/check?name=${encodeURIComponent(val)}&tld=${encodeURIComponent(TLD)}`);
      const data = await res.json();
      setResult({ available:data.available, name:val });
    } catch { setResult(null); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ width:'100%', maxWidth:'560px' }}>
      <div className="domain-wrap">
        <span style={{ color:'var(--muted)', fontWeight:600, fontSize:'0.9375rem', whiteSpace:'nowrap' }}>www.</span>
        <input className="domain-input" type="text" value={query} placeholder="yourbusiness"
          onChange={e => { const v=e.target.value.toLowerCase().replace(/[^a-z0-9-]/g,''); setQuery(v); doSearch(v); }} />
        <span className="domain-tld">.co.zw</span>
        {loading && <div style={{ width:15, height:15, border:'2px solid var(--cream-4)', borderTopColor:'var(--red)', borderRadius:'50%', animation:'spin 0.75s linear infinite', flexShrink:0 }} />}
        <button className="btn-primary" onClick={() => doSearch(query)} style={{ padding:'10px 18px', fontSize:'0.875rem', borderRadius:10, whiteSpace:'nowrap' }}>Check →</button>
      </div>
      {result && (
        <div style={{ marginTop:10, padding:'0.875rem 1.125rem', borderRadius:12, background:result.available?'rgba(74,222,128,0.07)':'rgba(248,113,113,0.07)', border:`1px solid ${result.available?'rgba(74,222,128,0.28)':'rgba(248,113,113,0.25)'}`, display:'flex', alignItems:'center', gap:12 }}>
          <span style={{ flex:1, fontWeight:700, fontSize:'0.9375rem', color:result.available?'#15803D':'#B91C1C' }}>{result.name}{TLD} — {result.available?'Available! 🎉':'Already taken'}</span>
          {result.available && <button className="btn-primary" onClick={() => onRegister?.(result.name, TLD)} style={{ padding:'7px 16px', fontSize:'0.8125rem', borderRadius:8 }}>Get started</button>}
        </div>
      )}
    </div>
  );
};

const Counter = ({ target }: { target:number }) => {
  const [n, setN] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const done = useRef(false);
  useEffect(() => {
    if (!ref.current) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !done.current) {
        done.current = true;
        let start:number|null = null;
        const tick = (t:number) => { if (!start) start=t; const p=Math.min((t-start)/1400,1); setN(Math.floor((1-(1-p)**3)*target)); if (p<1) requestAnimationFrame(tick); };
        requestAnimationFrame(tick);
      }
    }, { threshold:0.2 });
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, [target]);
  return <span ref={ref}>{n.toLocaleString()}</span>;
};

const BillingToggle = ({ billing, onChange }: { billing:'monthly'|'annual'; onChange:(b:'monthly'|'annual')=>void }) => (
  <div className="billing-toggle">
    <button className={`bill-btn ${billing==='monthly'?'active':'inactive'}`} onClick={() => onChange('monthly')}>Monthly</button>
    <button className={`bill-btn ${billing==='annual'?'active':'inactive'}`} onClick={() => onChange('annual')}>
      Annual <span style={{ background:billing==='annual'?'rgba(255,255,255,0.22)':'rgba(140,16,7,0.1)', color:billing==='annual'?'white':'var(--red)', padding:'2px 8px', borderRadius:999, fontSize:'0.625rem', fontWeight:800 }}>−20%</span>
    </button>
  </div>
);

export function LandingPage() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [billing, setBilling] = useState<'monthly' | 'annual'>('annual');
  const transitionRef = useRef<PageTransitionHandle>(null);
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const isTablet  = useMediaQuery('(min-width: 640px)');
  const { pricing } = usePricing();

  const PLANS_DYNAMIC = [
    { id: 'starter' as Plan, name: 'Starter', monthlyPrice: pricing.starter, mailboxes: 1, storage: '2 GB', popular: false, features: ['1 Mailbox', `${pricing.starter} GB Storage`, 'Outlook/Gmail sync', '.co.zw domain'] },
    { id: 'business' as Plan, name: 'Business', monthlyPrice: pricing.business, mailboxes: 5, storage: '10 GB', popular: true, features: ['5 Mailboxes', '10 GB Storage', 'Unlimited aliases', 'Group calendars', '.co.zw domain'] },
    { id: 'pro' as Plan, name: 'Pro', monthlyPrice: pricing.pro, mailboxes: 20, storage: '50 GB', popular: false, features: ['20 Mailboxes', '50 GB Storage', 'Priority support', 'DMARC setup', '.co.zw domain'] },
  ];

  const COMPARISON_DYNAMIC = [
    { label: 'Monthly Price', zeemail: `$${pricing.starter}/mo`, competitors: '$12/mo+' },
    { label: 'EcoCash & ZimSwitch Payments', zeemail: true, competitors: false },
    { label: 'Local Zimbabwe Support', zeemail: true, competitors: false },
    { label: '.co.zw Domain Included', zeemail: true, competitors: false },
    { label: 'Full Setup Time', zeemail: '< 24 Hours', competitors: '3-7 Days' },
    { label: 'Cloud Storage', zeemail: 'Included', competitors: 'Extra Cost' },
  ];

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 16);
    window.addEventListener('scroll', fn);
    return () => window.removeEventListener('scroll', fn);
  }, []);

  const scrollTo = (id:string) => { const el=document.getElementById(id); if (el) window.scrollTo({ top:el.offsetTop-72, behavior:'smooth' }); };
  const handleRegister = (name:string, tld:string) => navigate(`/register?domain=${encodeURIComponent(name)}&tld=${encodeURIComponent(tld)}`);

  return (
    <PageTransition ref={transitionRef}>
      <style>{CSS}</style>
      <div style={{ minHeight:'100vh', background:'var(--cream)', color:'var(--ink)', overflowX:'hidden' }}>

        <nav className={`nav-root${scrolled?' scrolled':''}`}>
          <div className="nav-inner">
            <Logo onClick={() => window.scrollTo({ top:0, behavior:'smooth' })} />
            <div style={{ display:'flex', alignItems:'center', gap:'0.5rem' }}>
              {isTablet && (
                <div className="nav-links">
                  {['Features','Pricing','Comparison'].map(l => (
                    <button key={l} className="nav-link" onClick={() => scrollTo(l.toLowerCase())}>{l}</button>
                  ))}
                  <button className="nav-link" onClick={() => navigate('/login')}>Log in</button>
                </div>
              )}
              {!isTablet && <button className="nav-link" onClick={() => navigate('/login')}>Log in</button>}
              <button className="nav-cta" onClick={() => scrollTo('pricing')}>Get Started</button>
            </div>
          </div>
        </nav>

        <main>

          {/* HERO */}
          <section id="home" style={{ width:'100%', background:'linear-gradient(160deg,var(--cream) 0%,var(--cream-2) 55%,var(--cream-3) 100%)', paddingTop:'clamp(5.5rem,14vw,9rem)', paddingBottom:'clamp(4rem,10vw,7rem)', position:'relative', overflow:'hidden' }}>
            <div style={{ position:'absolute', top:'0', right:'-8%', width:'52vw', height:'52vw', maxWidth:660, maxHeight:660, background:'radial-gradient(circle,rgba(140,16,7,0.06) 0%,transparent 68%)', pointerEvents:'none' }} />
            <div className="wrap" style={{ display:'grid', gridTemplateColumns:isDesktop?'1fr 1fr':'1fr', gap:'clamp(2.5rem,6vw,5rem)', alignItems:'center', position:'relative' }}>

              {/* Left */}
              <div>
                <h1 className="anim-1" style={{ fontFamily:'var(--ff-display)', fontSize:'clamp(2.25rem,5.5vw,4rem)', fontWeight:800, lineHeight:1.1, letterSpacing:'-0.025em', color:'var(--ink)', marginBottom:'1.25rem' }}>
                  Professional email<br />for <em style={{ color:'var(--red)', fontStyle:'italic' }}>Zimbabwean</em><br />business.
                </h1>
                <p className="anim-2" style={{ color:'var(--muted)', fontSize:'clamp(1rem,2vw,1.125rem)', lineHeight:1.75, maxWidth:460, marginBottom:'2.25rem' }}>
                  Secure, sovereign .co.zw email with Outlook & Gmail sync, EcoCash payments, and locally based support you can actually call.
                </p>
                <div className="anim-3"><DomainSearch onRegister={handleRegister} /></div>

                {/* Social proof */}
                <div className="anim-4" style={{ display:'flex', alignItems:'center', gap:10, marginTop:'1.5rem', flexWrap:'wrap' }}>
                  <div style={{ display:'flex' }}>
                    {['TC','RM','KM','NM','TM'].map((i,idx) => (
                      <div key={i} style={{ width:30, height:30, borderRadius:'50%', border:'2px solid var(--cream)', marginLeft:idx===0?0:-9, background:`hsl(${idx*48+10},48%,56%)`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.6rem', fontWeight:800, color:'white', zIndex:5-idx, position:'relative', boxShadow:'0 1px 4px rgba(0,0,0,0.1)' }}>{i}</div>
                    ))}
                  </div>
                  <span style={{ fontSize:'0.875rem', fontWeight:700, color:'var(--ink)' }}><Counter target={1250} />+ businesses trust ZeeMail</span>
                  <div style={{ display:'flex', gap:2 }}>
                    {[...Array(5)].map((_,i) => <svg key={i} width="13" height="13" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="#F59E0B"/></svg>)}
                  </div>
                </div>

                <div style={{ display:'flex', gap:'1.25rem', flexWrap:'wrap', marginTop:'1.375rem' }}>
                  {['Outlook/Gmail Sync','EcoCash Accepted','24h Local Support'].map(item => (
                    <div key={item} style={{ display:'flex', alignItems:'center', gap:6, fontSize:'0.8125rem', fontWeight:600, color:'var(--muted)' }}>
                      <CheckSVG size={15} />{item}
                    </div>
                  ))}
                </div>
              </div>

              {/* Right — Hero Graphic */}
              {isDesktop && (
                <div style={{ position:'relative', height: 450, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ position:'absolute', inset:'-15%', background:'radial-gradient(circle,rgba(140,16,7,0.12),transparent 75%)', filter:'blur(45px)', zIndex:0 }} />
                  <div style={{ position:'relative', zIndex:1 }}>
                    <img 
                      src="/hero-graphic.png" 
                      alt="ZeeMail Secure Infrastructure" 
                      style={{ 
                        width: '100%', 
                        maxWidth: '520px', 
                        height: 'auto', 
                        borderRadius: '32px',
                        boxShadow: 'var(--shadow-2xl)',
                        animation: 'fadeUp 0.8s ease both'
                      }} 
                    />
                    
                    {/* Floating Sovereign Badge */}
                    <div style={{ 
                      position:'absolute', 
                      bottom: -24, 
                      right: 24, 
                      zIndex:2, 
                      background:'rgba(26, 4, 0, 0.95)', 
                      backdropFilter: 'blur(12px)',
                      color:'white', 
                      padding:'14px 28px', 
                      borderRadius:16, 
                      boxShadow:'0 24px 48px rgba(0,0,0,0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      border: '1px solid rgba(255,255,255,0.1)',
                      animation: 'fadeUp 0.8s 0.3s ease both'
                    }}>
                      <div style={{ width: 12, height: 12, borderRadius: '2px', background: '#22C55E', boxShadow: '0 0 10px #22C55E' }} />
                      <div style={{ fontSize: '0.875rem', fontWeight: 800, letterSpacing: '0.05em' }}>SECURED SOVEREIGN INFRASTRUCTURE</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* TRUST BAR */}
          <section style={{ borderTop:'1px solid var(--border)', borderBottom:'1px solid var(--border)', background:'var(--cream-2)', padding:'2.125rem 0' }}>
            <div className="wrap">
              <p style={{ textAlign:'center', fontSize:'0.6875rem', fontWeight:800, letterSpacing:'0.12em', textTransform:'uppercase', color:'var(--muted)', marginBottom:'1.375rem' }}>Trusted by leading Zimbabwean entities</p>
              <div style={{ display:'flex', justifyContent:'center', flexWrap:'wrap', gap:'1.5rem 3.5rem', opacity:0.32 }}>
                {['LocalBank','ZimTrade','EcoPave','HarareHub','ZimSwitch'].map(n => (
                  <span key={n} style={{ fontFamily:'var(--ff-display)', fontWeight:700, fontSize:'1.0625rem', color:'var(--ink)', letterSpacing:'-0.02em' }}>{n}</span>
                ))}
              </div>
            </div>
          </section>

          {/* STATS */}
          <section style={{ padding:'clamp(3rem,6vw,5rem) 0', background:'var(--cream)' }}>
            <div className="wrap">
              <div style={{ background:'var(--ink)', borderRadius:28, padding:isDesktop?'3.5rem 5rem':'2.5rem 2rem', display:'grid', gridTemplateColumns:isTablet?'repeat(4,1fr)':'repeat(2,1fr)', gap:'2rem', position:'relative', overflow:'hidden' }}>
                <div style={{ position:'absolute', top:'-30%', right:'-5%', width:'45%', paddingTop:'45%', background:'radial-gradient(circle,rgba(140,16,7,0.45) 0%,transparent 65%)', pointerEvents:'none' }} />
                {STATS.map(s => (
                  <div key={s.label} style={{ position:'relative', zIndex:1 }}>
                    <div style={{ fontFamily:'var(--ff-display)', fontSize:'clamp(1.75rem,3vw,2.5rem)', fontWeight:800, color:'white', lineHeight:1, marginBottom:6 }}>{s.value}</div>
                    <div style={{ fontSize:'0.8125rem', color:'rgba(255,255,255,0.45)', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.08em' }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* FEATURES */}
          <section id="features" style={{ padding:'clamp(4rem,8vw,7rem) 0', background:'var(--cream-2)' }}>
            <div className="wrap">
              <div style={{ maxWidth:540, marginBottom:'3.5rem' }}>
                <p style={{ fontSize:'0.75rem', fontWeight:800, letterSpacing:'0.12em', textTransform:'uppercase', color:'var(--red)', marginBottom:10 }}>Why ZeeMail</p>
                <h2 style={{ fontFamily:'var(--ff-display)', fontSize:'clamp(1.75rem,4vw,2.75rem)', fontWeight:800, lineHeight:1.15, letterSpacing:'-0.025em', color:'var(--ink)', marginBottom:'0.875rem' }}>Built for the way Zimbabwe does business</h2>
                <p style={{ color:'var(--muted)', lineHeight:1.75, fontSize:'1rem' }}>Not a global product shoehorned for local use — ZeeMail is designed from the ground up for Zimbabwean entrepreneurs.</p>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:isDesktop?'repeat(3,1fr)':isTablet?'repeat(2,1fr)':'1fr', gap:'1.25rem' }}>
                {[
                  { emoji:'🔄', title:'Universal Sync', desc:'Native integration with Outlook, Gmail, and Apple Mail. Your .co.zw address works everywhere you do.' },
                  { emoji:'💳', title:'Local Payments', desc:'Pay via EcoCash, ZimSwitch, or Paynow in local currency — no international card needed.' },
                  { emoji:'📍', title:'Harare Support', desc:"Real humans based in Zimbabwe answer your calls. No chatbot queues, no overseas call centres." },
                  { emoji:'🔐', title:'Enterprise Security', desc:"DMARC, DKIM, and SPF configured out of the box. Your brand's email credibility is protected." },
                  { emoji:'⚡', title:'Under 24h Setup', desc:'From sign-up to a live professional inbox, most customers are up and running same day.' },
                  { emoji:'🌍', title:'Sovereign Identity', desc:'Your data stays local. A .co.zw domain signals credibility to every Zimbabwean customer.' },
                ].map(f => (
                  <div key={f.title} className="feat-card">
                    <div className="feat-icon"><span style={{ fontSize:'1.375rem' }}>{f.emoji}</span></div>
                    <h3 style={{ fontFamily:'var(--ff-display)', fontSize:'1.0625rem', fontWeight:700, color:'var(--ink)', marginBottom:8 }}>{f.title}</h3>
                    <p style={{ fontSize:'0.9rem', color:'var(--muted)', lineHeight:1.7 }}>{f.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* PRICING */}
          <section id="pricing" style={{ padding:'clamp(4rem,8vw,7rem) 0', background:'var(--cream)' }}>
            <div className="wrap">
              <div style={{ textAlign:'center', marginBottom:'3rem' }}>
                <p style={{ fontSize:'0.75rem', fontWeight:800, letterSpacing:'0.12em', textTransform:'uppercase', color:'var(--red)', marginBottom:10 }}>Pricing</p>
                <h2 style={{ fontFamily:'var(--ff-display)', fontSize:'clamp(1.75rem,4vw,2.75rem)', fontWeight:800, letterSpacing:'-0.025em', color:'var(--ink)', marginBottom:'1.5rem' }}>Simple, transparent tiers</h2>
                <BillingToggle billing={billing} onChange={setBilling} />
              </div>
              <div style={{ display:'grid', gridTemplateColumns:isDesktop?'repeat(3,1fr)':'1fr', gap:'1.25rem', alignItems:'start' }}>
                {PLANS_DYNAMIC.map(p => (
                  <div key={p.id} className={`plan-card${p.popular?' popular':''}`}>
                    {p.popular && <div style={{ position:'absolute', top:-13, left:'50%', transform:'translateX(-50%)', background:'var(--red)', color:'white', padding:'4px 16px', borderRadius:999, fontSize:'0.6875rem', fontWeight:800, letterSpacing:'0.08em', textTransform:'uppercase', whiteSpace:'nowrap', boxShadow:'0 4px 14px rgba(140,16,7,0.3)' }}>Most Popular</div>}
                    <div style={{ marginBottom:'0.25rem', fontSize:'0.875rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', color:p.popular?'rgba(255,255,255,0.45)':'var(--muted)' }}>{p.name}</div>
                    <div style={{ marginBottom:'1.5rem', display:'flex', alignItems:'baseline', gap:4 }}>
                      <span style={{ fontFamily:'var(--ff-display)', fontSize:'3rem', fontWeight:800, letterSpacing:'-0.04em', lineHeight:1, color:p.popular?'white':'var(--ink)' }}>${Math.round(billing==='annual'?p.monthlyPrice*0.83:p.monthlyPrice)}</span>
                      <span style={{ fontSize:'0.9rem', color:p.popular?'rgba(255,255,255,0.45)':'var(--muted)' }}>/mo</span>
                    </div>
                    <ul style={{ listStyle:'none', padding:0, marginBottom:'2rem', flex:1 }}>
                      {p.features.map(f => (
                        <li key={f} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10, fontSize:'0.9rem', color:p.popular?'rgba(255,255,255,0.8)':'var(--muted)' }}>
                          <CheckSVG color={p.popular?'#4ADE80':'var(--red)'} size={16} />{f}
                        </li>
                      ))}
                    </ul>
                    <button onClick={() => navigate(`/register?plan=${p.id}&billing=${billing}`)} style={{ width:'100%', padding:'0.875rem', borderRadius:12, border:p.popular?'none':'1.5px solid var(--border-strong)', background:p.popular?'var(--red)':'transparent', color:p.popular?'white':'var(--red)', fontFamily:'var(--ff-body)', fontWeight:700, fontSize:'0.9375rem', cursor:'pointer', boxShadow:p.popular?'0 6px 20px rgba(140,16,7,0.35)':'none', transition:'all 0.18s' }}>
                      Choose {p.name}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* TESTIMONIALS */}
          <section style={{ padding:'clamp(4rem,8vw,7rem) 0', background:'var(--cream-2)', borderTop:'1px solid var(--border)' }}>
            <div className="wrap">
              <div style={{ textAlign:'center', marginBottom:'3rem' }}>
                <p style={{ fontSize:'0.75rem', fontWeight:800, letterSpacing:'0.12em', textTransform:'uppercase', color:'var(--red)', marginBottom:10 }}>Testimonials</p>
                <h2 style={{ fontFamily:'var(--ff-display)', fontSize:'clamp(1.75rem,4vw,2.75rem)', fontWeight:800, letterSpacing:'-0.025em', color:'var(--ink)' }}>The founder's choice</h2>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:isDesktop?'repeat(3,1fr)':isTablet?'repeat(2,1fr)':'1fr', gap:'1.25rem' }}>
                {TESTIMONIALS.map(t => (
                  <div key={t.id} className="testi-card">
                    <div style={{ fontSize:'3.5rem', lineHeight:0.85, color:'rgba(140,16,7,0.09)', fontFamily:'Georgia,serif', marginBottom:12 }}>"</div>
                    <p style={{ fontSize:'0.9375rem', lineHeight:1.75, color:'var(--ink)', marginBottom:'1.5rem', fontStyle:'italic' }}>{t.quote}</p>
                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <img src={t.avatar} alt={t.author} style={{ width:42, height:42, borderRadius:'50%', border:'2px solid var(--border-strong)', objectFit:'cover', flexShrink:0 }} />
                      <div>
                        <div style={{ fontWeight:700, fontSize:'0.875rem', color:'var(--ink)' }}>{t.author}</div>
                        <div style={{ fontSize:'0.75rem', color:'var(--muted)', fontWeight:500 }}>{t.role} · {t.company}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* COMPARISON */}
          <section id="comparison" style={{ padding:'clamp(4rem,8vw,7rem) 0', background:'var(--cream)' }}>
            <div style={{ maxWidth:900, margin:'0 auto', padding:'0 var(--px)' }}>
              <div style={{ textAlign:'center', marginBottom:'3rem' }}>
                <p style={{ fontSize:'0.75rem', fontWeight:800, letterSpacing:'0.12em', textTransform:'uppercase', color:'var(--red)', marginBottom:10 }}>Why us</p>
                <h2 style={{ fontFamily:'var(--ff-display)', fontSize:'clamp(1.75rem,4vw,2.75rem)', fontWeight:800, letterSpacing:'-0.025em', color:'var(--ink)' }}>Local excellence vs. global defaults</h2>
              </div>
              <div style={{ overflowX:'auto', borderRadius:24, border:'1px solid var(--border)', background:'white', boxShadow:'var(--shadow-md)' }}>
                <table className="comp-table">
                  <thead>
                    <tr>
                      <th style={{ textAlign:'left', fontFamily:'var(--ff-body)', fontWeight:700, color:'var(--ink)', fontSize:'0.875rem' }}>Feature</th>
                      <th style={{ textAlign:'center', fontFamily:'var(--ff-display)', fontWeight:800, color:'var(--red)', fontSize:'1.0625rem' }}>ZeeMail</th>
                      <th style={{ textAlign:'center', fontFamily:'var(--ff-body)', fontWeight:600, color:'var(--muted)', fontSize:'0.875rem' }}>Alternatives</th>
                    </tr>
                  </thead>
                  <tbody>
                    {COMPARISON_DYNAMIC.map(r => (
                      <tr key={r.label}>
                        <td style={{ fontWeight:500, fontSize:'0.9375rem', color:'var(--ink)' }}>{r.label}</td>
                        <td style={{ textAlign:'center' }}>{renderCell(r.zeemail, true)}</td>
                        <td style={{ textAlign:'center' }}>{renderCell(r.competitors, false)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* FINAL CTA */}
          <section style={{ padding:'clamp(4rem,8vw,6rem) 0', background:'var(--cream-2)', borderTop:'1px solid var(--border)' }}>
            <div className="wrap">
              <div style={{ background:'var(--ink)', borderRadius:32, padding:isDesktop?'5rem 6rem':'3rem 2rem', textAlign:'center', position:'relative', overflow:'hidden', boxShadow:'var(--shadow-xl)' }}>
                <div style={{ position:'absolute', inset:0, background:'radial-gradient(ellipse at 15% 50%,rgba(140,16,7,0.55) 0%,transparent 55%)', pointerEvents:'none' }} />
                <div style={{ position:'relative', maxWidth:680, margin:'0 auto' }}>
                  <h2 style={{ fontFamily:'var(--ff-display)', fontSize:'clamp(2rem,5vw,3.5rem)', fontWeight:800, color:'white', letterSpacing:'-0.03em', lineHeight:1.1, marginBottom:'1rem' }}>Own your domain territory.</h2>
                  <p style={{ color:'rgba(255,255,255,0.55)', fontSize:'1.0625rem', lineHeight:1.75, marginBottom:'2.5rem' }}>Don't settle for generic email. Secure your professional Zimbabwean identity today with EcoCash integration and local support.</p>
                  <div style={{ display:'flex', gap:'1rem', justifyContent:'center', flexWrap:'wrap' }}>
                    <button className="btn-primary" onClick={() => navigate('/register')} style={{ padding:'1rem 2.5rem', fontSize:'1rem', borderRadius:14 }}>Claim Your .co.zw Domain</button>
                    <button onClick={() => scrollTo('pricing')} style={{ padding:'1rem 2.5rem', fontSize:'1rem', borderRadius:14, fontFamily:'var(--ff-body)', fontWeight:700, cursor:'pointer', background:'rgba(255,255,255,0.08)', color:'white', border:'1.5px solid rgba(255,255,255,0.14)', transition:'background 0.18s' }}>View Plans</button>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:6, marginTop:'1.5rem', color:'rgba(255,255,255,0.38)', fontSize:'0.8125rem', fontWeight:600 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><rect x="2" y="5" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="2"/><path d="M2 10h20" stroke="currentColor" strokeWidth="2"/></svg>
                    Pay with EcoCash · OneMoney · ZimSwitch
                  </div>
                </div>
              </div>
            </div>
          </section>

        </main>

        {/* FOOTER */}
        <footer style={{ background:'var(--ink)', borderTop:'1px solid rgba(255,255,255,0.05)', padding:'clamp(2rem,4vw,3rem) 0' }}>
          <div className="wrap" style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'1.5rem' }}>
            <span style={{ fontFamily:'var(--ff-display)', fontWeight:800, fontSize:'1.375rem', color:'#FFF9E8', letterSpacing:'-0.02em' }}>ZeeMail</span>
            <div style={{ display:'flex', gap:'2rem', flexWrap:'wrap' }}>
              {['Terms','Privacy','EcoCash','ZISPA'].map(l => (
                <a key={l} href="#" style={{ color:'rgba(255,255,255,0.38)', textDecoration:'none', fontSize:'0.8125rem', fontWeight:600, letterSpacing:'0.05em', transition:'color 0.18s' }}>{l}</a>
              ))}
            </div>
            <span style={{ color:'rgba(255,255,255,0.28)', fontSize:'0.8125rem' }}>© 2025 ZeeMail Zimbabwe</span>
          </div>
        </footer>

        <FloatingWhatsApp />
      </div>
    </PageTransition>
  );
}

export default LandingPage;