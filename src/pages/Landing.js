import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Calendar, CheckCircle, X, Mail, Phone,
  MessageCircle, Menu, MapPin, Navigation, Mic, WifiOff, Eye,
  CreditCard, Bell, Image as ImageIcon, Send, FileText, Clock, AlertCircle
} from 'lucide-react';
import './Landing.css';
import { getDoc, doc } from 'backend/database';
import { db, auth } from '../backend/config';

const NewHomePage = () => {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activePortal, setActivePortal] = useState('caregiver');
  const [demoModalOpen, setDemoModalOpen] = useState(false);
  const [salesModalOpen, setSalesModalOpen] = useState(false);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formSuccess, setFormSuccess] = useState(false);
  const [formData, setFormData] = useState({
    name: '', email: '', phone: '', organization: '', message: ''
  });
  const [gdprConsent, setGdprConsent] = useState(false);
  const [showCookieBanner, setShowCookieBanner] = useState(false);

  // GDPR Cookie consent — check localStorage on mount
  useEffect(() => {
    const consent = localStorage.getItem('cm-cookie-consent');
    if (!consent) setShowCookieBanner(true);
  }, []);

  const handleCookieAccept = () => {
    localStorage.setItem('cm-cookie-consent', 'accepted');
    setShowCookieBanner(false);
  };

  const handleCookieDecline = () => {
    localStorage.setItem('cm-cookie-consent', 'declined');
    setShowCookieBanner(false);
  };

  // Body scroll lock when any modal is open
  useEffect(() => {
    const modalOpen = demoModalOpen || salesModalOpen;
    if (modalOpen) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [demoModalOpen, salesModalOpen]);

  // Scroll reveal animation
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) entry.target.classList.add('visible');
      });
    }, { threshold: 0.1 });
    const els = document.querySelectorAll('.landing-page .reveal');
    els.forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  // Secret access to superadmin portal
  const [secretClickCount, setSecretClickCount] = useState(0);
  const [secretKeySequence, setSecretKeySequence] = useState([]);
  const SECRET_KEY_SEQUENCE = ['s','u','p','e','r','a','d','m','i','n'];
  const SECRET_CLICK_COUNT = 5;

  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      const key = e.key.toLowerCase();
      setSecretKeySequence(prev => {
        const newSeq = [...prev, key].slice(-SECRET_KEY_SEQUENCE.length);
        if (newSeq.length === SECRET_KEY_SEQUENCE.length) {
          if (newSeq.every((k, i) => k === SECRET_KEY_SEQUENCE[i])) {
            handleSecretAccess();
            return [];
          }
        }
        return newSeq;
      });
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  const handleSecretAccess = async () => {
    const user = auth.currentUser;
    if (!user) { navigate('/login'); return; }
    try {
      const token = await user.getIdTokenResult();
      const hasSuperAdminClaim = token?.claims?.superAdmin === true;
      let hasSuperAdminFlag = false;
      try {
        const { doc, getDoc } = await import('../services/databaseCompat');
        const { db } = await import('../backend/config');
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          hasSuperAdminFlag = userData?.isSuperAdmin === true || userData?.superAdmin === true;
        }
      } catch (err) {
        console.warn('Database check failed in secret access:', err.message);
      }
      if (hasSuperAdminClaim || hasSuperAdminFlag) {
        navigate('/super-admin/dashboard');
      } else {
        navigate('/login');
      }
    } catch (error) {
      console.error('Error checking superadmin status:', error);
      navigate('/login');
    }
  };

  const handleLogoClick = () => {
    setSecretClickCount(prev => {
      const newCount = prev + 1;
      if (newCount >= SECRET_CLICK_COUNT) {
        handleSecretAccess();
        return 0;
      }
      setTimeout(() => setSecretClickCount(0), 3000);
      return newCount;
    });
  };

  const sanitizeInput = (str) => {
    if (typeof str !== 'string') return '';
    return str
      .replace(/[<>]/g, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+=/gi, '')
      .trim()
      .slice(0, 1000);
  };

  const handleInputChange = (e) => {
    const sanitized = sanitizeInput(e.target.value);
    setFormData({ ...formData, [e.target.name]: sanitized });
  };

  const handleFormSubmit = async (e, formType) => {
    e.preventDefault();
    if (!gdprConsent) {
      alert('Please accept the Privacy Policy and data processing terms to continue.');
      return;
    }
    setFormSubmitting(true);
    try {
      const safeName = sanitizeInput(formData.name);
      const safeEmail = sanitizeInput(formData.email);
      const safePhone = sanitizeInput(formData.phone);
      const safeOrg = sanitizeInput(formData.organization);
      const safeMsg = sanitizeInput(formData.message);
      const subject = formType === 'demo'
        ? `Demo Request from ${safeName}`
        : `Sales Inquiry from ${safeName}`;
      const body = `Name: ${safeName}\nEmail: ${safeEmail}\nPhone: ${safePhone || 'N/A'}\nOrganization: ${safeOrg || 'N/A'}\n\nMessage:\n${safeMsg || 'No additional message.'}`.trim();
      const mailtoUrl = `mailto:support@getcaremaster.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      window.location.href = mailtoUrl;
      setFormSuccess(true);
      setTimeout(() => {
        setFormData({ name: '', email: '', phone: '', organization: '', message: '' });
        setGdprConsent(false);
        setFormSuccess(false);
        setDemoModalOpen(false);
        setSalesModalOpen(false);
      }, 3000);
    } catch (error) {
      console.error('Form submission error:', error);
    } finally {
      setFormSubmitting(false);
    }
  };

  const timelineEvents = [
    { time: '8:58 AM', tag: 'Caregiver', tagClass: 'tag-caregiver', dotColor: 'var(--coral)', desc: 'Maria clocks in at the Wilson residence. Location verified by GPS.' },
    { time: '8:59 AM', tag: 'Admin', tagClass: 'tag-admin', dotColor: 'var(--gold)', desc: 'Visit appears live on the agency schedule. No action needed.' },
    { time: '9:04 AM', tag: 'Caregiver', tagClass: 'tag-caregiver', dotColor: 'var(--coral)', desc: 'Care notes logged by voice: medication given, vitals stable.' },
    { time: '9:05 AM', tag: 'Family', tagClass: 'tag-family', dotColor: 'var(--sage)', desc: "James gets a visit update on his phone. He doesn't have to call to check." },
    { time: '9:47 AM', tag: 'Admin', tagClass: 'tag-admin', dotColor: 'var(--gold)', desc: 'Maria clocks out. Visit is auto-logged for payroll and billing.' },
  ];

  const ledgerStats = [
    { num: '500+', label: 'Care agencies onboarded' },
    { num: '10,000+', label: 'Active caregivers' },
    { num: '50,000+', label: 'Clients cared for' },
    { num: '99.8%', label: 'Platform uptime' },
  ];

  const trustLogos = ['Compassion Home Care', 'Golden Years Care', 'Comfort Keepers Group', 'Elite Elder Care'];

  const portals = {
    caregiver: {
      title: 'Built for a phone in one hand and a client in the other',
      desc: 'The caregiver app runs the visit — clocking in, routing, and documenting care — without ever getting in the way of the care itself.',
      features: [
        { icon: MapPin, color: '#DD6E4F', bg: 'var(--coral-soft)', title: 'GPS clock in/out', sub: 'Verifies the caregiver is actually on site — the basis for EVV compliance.' },
        { icon: Navigation, color: '#DD6E4F', bg: 'var(--coral-soft)', title: 'Route-optimized schedule', sub: 'Each day is ordered by travel time, not just appointment order.' },
        { icon: Mic, color: '#DD6E4F', bg: 'var(--coral-soft)', title: 'Voice-to-text care notes', sub: 'Log vitals and observations hands-free, between tasks.' },
        { icon: WifiOff, color: '#DD6E4F', bg: 'var(--coral-soft)', title: 'Works offline', sub: 'Notes sync automatically once signal returns — nothing is lost in a basement or rural route.' },
      ],
      visual: 'caregiver',
      cards: [
        { icon: MapPin, bg: 'var(--coral)', title: 'Wilson Residence', sub: 'Visit 3 of 6 today', status: 'On site', statusBg: 'var(--sage-soft)', statusColor: '#3E5D50' },
        { icon: Navigation, bg: '#F0A98F', title: 'Next: Boyd Residence', sub: '9 min drive · 10:15 AM' },
        { icon: CheckCircle, bg: '#E7C4B4', title: 'Care note saved', sub: 'Vitals stable · med given' },
      ]
    },
    admin: {
      title: 'Run the whole agency from one screen',
      desc: 'See every caregiver, every visit, and every dollar moving through the agency — and get out ahead of the ones that need attention.',
      features: [
        { icon: Eye, color: '#B9832E', bg: '#FBF1DC', title: 'Live visit map', sub: 'Every active caregiver, plotted in real time across your territory.' },
        { icon: CreditCard, color: '#B9832E', bg: '#FBF1DC', title: 'Automated payroll & billing', sub: 'Clocked hours flow straight into pay runs and client invoices.' },
        { icon: FileText, color: '#B9832E', bg: '#FBF1DC', title: 'EVV & compliance reporting', sub: 'Export state-ready reports in a couple of clicks, not a couple of days.' },
        { icon: AlertCircle, color: '#B9832E', bg: '#FBF1DC', title: 'Missed-visit alerts', sub: "Get notified the moment a check-in doesn't happen — before the family does." },
      ],
      visual: 'admin',
      cards: [
        { icon: Eye, bg: 'var(--gold)', title: '14 caregivers active', sub: '3 territories · live now' },
        { icon: CreditCard, bg: '#E6BE72', title: 'Payroll ready', sub: 'Pay run closes in 2 days', status: 'On track', statusBg: '#fff', statusColor: '#B9832E' },
        { icon: Clock, bg: '#EFCB93', title: '0 missed visits', sub: 'This week, agency-wide' },
      ]
    },
    family: {
      title: 'Peace of mind, without the phone calls',
      desc: "Families see the same visit their caregiver just logged — arrival time, notes, and photos — without needing to call the office.",
      features: [
        { icon: Bell, color: '#3E5D50', bg: 'var(--sage-soft)', title: 'Real-time visit notifications', sub: 'A message the moment a caregiver arrives and leaves.' },
        { icon: ImageIcon, color: '#3E5D50', bg: 'var(--sage-soft)', title: 'Care plan & photo updates', sub: "See how a loved one's day actually went." },
        { icon: Send, color: '#3E5D50', bg: 'var(--sage-soft)', title: 'Secure messaging', sub: 'A direct line to the care team, kept in one thread.' },
        { icon: FileText, color: '#3E5D50', bg: 'var(--sage-soft)', title: 'Invoices & billing history', sub: 'Every visit, itemized, in one place — no more paper statements.' },
      ],
      visual: 'family',
      cards: [
        { icon: Bell, bg: 'var(--sage)', title: 'Maria arrived', sub: 'Wilson residence · 8:58 AM', status: 'Just now', statusBg: '#fff', statusColor: '#3E5D50' },
        { icon: ImageIcon, bg: '#8FAE9E', title: "Today's care note", sub: 'Vitals stable, in good spirits' },
        { icon: FileText, bg: '#AFC6BA', title: 'March invoice ready', sub: '$1,240.00 · view breakdown' },
      ]
    },
  };

  const testimonials = [
    { quote: 'We cut no-show visits by 40% in the first quarter. The GPS verification alone paid for the platform.', author: 'Amara O.', role: 'Compassion Home Care', avatarBg: 'var(--coral)', initials: 'AO' },
    { quote: 'Families stopped calling to ask "did the caregiver show up." They just check the app now.', author: 'David K.', role: 'Golden Years Care', avatarBg: 'var(--sage)', initials: 'DK' },
    { quote: "Payroll used to take me a full day every two weeks. Now it's twelve minutes, and it's actually right.", author: 'Ruth N.', role: 'Elite Elder Care', avatarBg: 'var(--gold)', initials: 'RN' },
  ];

  return (
    <div className="landing-page">
      {/* Navigation */}
      <header>
        <nav>
          <div className="logo" onClick={handleLogoClick}>
            <img src="/images/caremaster-logo.jpg" alt="Care Master" className="logo-mark" />
            <span className="logo-text">Care Master</span>
          </div>
          <div className="nav-links">
            <a href="#portals">Platforms</a>
            <a href="#features">Features</a>
            <a href="#reviews">Reviews</a>
            <a href="#pricing">Pricing</a>
          </div>
          <div className="nav-cta">
            <Link to="/login" className="btn btn-ghost-light" style={{ padding: '10px 18px', fontSize: '13.5px' }}>Partner Login</Link>
            <button onClick={() => setDemoModalOpen(true)} className="btn btn-gold" style={{ padding: '10px 20px', fontSize: '13.5px' }}>Schedule a Demo</button>
          </div>
          <button className="mobile-menu-btn" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </nav>
        {mobileMenuOpen && (
          <div className="mobile-nav open">
            <a href="#portals" onClick={() => setMobileMenuOpen(false)}>Platforms</a>
            <a href="#features" onClick={() => setMobileMenuOpen(false)}>Features</a>
            <a href="#reviews" onClick={() => setMobileMenuOpen(false)}>Reviews</a>
            <a href="#pricing" onClick={() => setMobileMenuOpen(false)}>Pricing</a>
            <Link to="/login" onClick={() => setMobileMenuOpen(false)}>Partner Login</Link>
            <button onClick={() => { setDemoModalOpen(true); setMobileMenuOpen(false); }} className="btn btn-gold" style={{ padding: '10px 20px', fontSize: '13.5px' }}>Schedule a Demo</button>
          </div>
        )}
      </header>

      {/* Hero */}
      <section className="hero" style={{
        backgroundImage: 'linear-gradient(rgba(18,48,44,0.82), rgba(14,38,34,0.88)), url(/images/story-care-checkup-1.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}>
        <div className="hero-inner">
          <span className="eyebrow">Multi-tenant care platform</span>
          <h1>Care doesn't happen on a dashboard.<br />It happens at <em>8:58&nbsp;AM</em>, at someone's front door.</h1>
          <p className="lead">CareMaster connects your caregivers, your office, and the families you serve in one live system — so every visit is scheduled, verified, and logged the moment it happens.</p>
          <div className="hero-ctas">
            <button onClick={() => setDemoModalOpen(true)} className="btn btn-gold">
              Schedule a Demo
              <svg viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
            <a href="#timeline" className="btn btn-ghost-dark">
              See a live visit
              <svg viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12l7 7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </a>
          </div>
          <div className="hero-proof">
            <span><span className="stars">★★★★★</span> 4.9/5 from 500+ agencies</span>
            <span>No credit card required</span>
          </div>

          {/* Timeline */}
          <div className="timeline-shell" id="timeline">
            <div className="timeline-head">
              <h3>One visit, three portals — in real time</h3>
              <span className="mono">WILSON RESIDENCE · TUE 09:00</span>
            </div>
            <div className="timeline">
              {timelineEvents.map((evt, i) => (
                <div className="t-event" key={i}>
                  <span className="t-dot" style={{ background: evt.dotColor }} />
                  <span className="t-time">{evt.time}</span>
                  <span className={`t-tag ${evt.tagClass}`}>{evt.tag}</span>
                  <p className="t-desc">{evt.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Trust bar */}
      <div className="trust reveal">
        <div className="trust-inner">
          <span className="trust-label">Trusted by care agencies across three continents</span>
          <div className="trust-logos">
            {trustLogos.map((logo, i) => <span key={i}>{logo}</span>)}
          </div>
        </div>
      </div>

      {/* Ledger stats */}
      <section className="ledger reveal">
        <div className="wrap">
          <div className="ledger-grid">
            {ledgerStats.map((stat, i) => (
              <div className="ledger-item" key={i}>
                <div className="ledger-num">{stat.num}</div>
                <div className="ledger-label">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Three portals */}
      <section className="portals reveal" id="portals">
        <div className="wrap">
          <div className="section-head">
            <span className="eyebrow">Platform features</span>
            <h2 id="features">Three ways in. One source of truth.</h2>
            <p>Every caregiver, coordinator, and family member sees the same visit — just from where they sit.</p>
          </div>

          <div className="portal-tabs">
            {Object.keys(portals).map(key => (
              <button
                key={key}
                className={`portal-tab ${activePortal === key ? 'active' : ''}`}
                data-portal={key}
                onClick={() => setActivePortal(key)}
              >
                <span className="dot" />
                {key === 'caregiver' ? 'Caregiver App' : key === 'admin' ? 'Admin Console' : 'Family Portal'}
              </button>
            ))}
          </div>

          {Object.keys(portals).map(key => {
            const p = portals[key];
            return (
              <div key={key} className={`portal-panel ${activePortal === key ? 'active' : ''}`} data-panel={key}>
                <div className="portal-copy">
                  <h3>{p.title}</h3>
                  <p className="desc">{p.desc}</p>
                  <div className="portal-feature-list">
                    {p.features.map((f, i) => {
                      const FeatureIcon = f.icon;
                      return (
                        <div className="portal-feature" key={i}>
                          <span className="icon" style={{ background: f.bg }}>
                            <FeatureIcon size={17} color={f.color} />
                          </span>
                          <div>
                            <strong>{f.title}</strong>
                            <span className="sub">{f.sub}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="portal-visual" data-visual={p.visual}>
                  {p.cards.map((c, i) => {
                    const CardIcon = c.icon;
                    return (
                      <div className="pv-card" key={i}>
                        <span className="pv-icon" style={{ background: c.bg }}>
                          <CardIcon size={18} color="#fff" />
                        </span>
                        <div>
                          <strong>{c.title}</strong>
                          <span>{c.sub}</span>
                        </div>
                        {c.status && (
                          <span className="status" style={{ background: c.statusBg, color: c.statusColor }}>{c.status}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Testimonials */}
      <section className="quotes reveal" id="reviews">
        <div className="wrap">
          <div className="section-head center">
            <span className="eyebrow">Reviews</span>
            <h2>What agencies say once they stop firefighting</h2>
          </div>
          <div className="quote-grid">
            {testimonials.map((t, i) => (
              <div className="quote-card" key={i}>
                <span className="quote-mark">"</span>
                <p className="body">{t.quote}</p>
                <div className="quote-person">
                  <span className="quote-avatar" style={{ background: t.avatarBg }}>{t.initials}</span>
                  <div>
                    <strong>{t.author}</strong>
                    <span>{t.role}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA banner */}
      <section className="cta-banner reveal" id="demo">
        <div className="wrap">
          <h2>Ready to run a calmer care agency?</h2>
          <p>Join 500+ agencies using CareMaster to keep every caregiver, client, and family on the same page.</p>
          <div className="cta-row">
            <button onClick={() => setDemoModalOpen(true)} className="btn btn-gold">
              Schedule a Free Demo
              <svg viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
            <Link to="/login" className="btn btn-ghost-dark">
              Access Your Portal
              <svg viewBox="0 0 24 24" fill="none"><path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
            </Link>
          </div>
          <div className="cta-checks">NO CREDIT CARD REQUIRED · FREE 30-DAY TRIAL · CANCEL ANYTIME</div>
        </div>
      </section>

      {/* Footer */}
      <footer id="pricing" className="reveal">
        <div className="wrap">
          <div className="footer-grid">
            <div className="footer-brand">
              <div className="logo" style={{ color: 'var(--sand)' }}>
                <img src="/images/caremaster-logo.jpg" alt="Care Master" className="logo-mark" />
                <span className="logo-text-light">Care Master</span>
              </div>
              <p>The health tech platform connecting caregivers, agencies, and families — in real time.</p>
              <div className="footer-social">
                <a href="#" aria-label="Chat" rel="noopener noreferrer"><MessageCircle size={15} /></a>
                <a href="mailto:support@getcaremaster.com" aria-label="Email"><Mail size={15} /></a>
                <a href="tel:+2348000000000" aria-label="Phone"><Phone size={15} /></a>
              </div>
            </div>
            <div>
              <h4>Platform</h4>
              <ul>
                <li><a href="#portals">Caregiver App</a></li>
                <li><a href="#portals">Admin Console</a></li>
                <li><a href="#portals">Family Portal</a></li>
                <li><a href="#features">EVV Compliance</a></li>
                <li><a href="#features">Billing & Payroll</a></li>
              </ul>
            </div>
            <div>
              <h4>Solutions</h4>
              <ul>
                <li><a href="#pricing">For Small Agencies</a></li>
                <li><a href="#pricing">For Enterprise</a></li>
                <li><a href="#pricing">For Franchises</a></li>
                <li><a href="#pricing">Custom Integrations</a></li>
              </ul>
            </div>
            <div>
              <h4>Get Started</h4>
              <ul>
                <li><Link to="/login">Partner Login</Link></li>
                <li><a href="tel:+2348000000000">+234 800 000 0000</a></li>
                <li><a href="mailto:support@getcaremaster.com">support@getcaremaster.com</a></li>
              </ul>
            </div>
          </div>
          <div className="footer-bottom">
            <span>© 2026 Care Master. All rights reserved.</span>
            <span>
              <a href="/privacy-policy" rel="noopener">Privacy Policy</a> · 
              <a href="/terms" rel="noopener">Terms of Service</a> · 
              <a href="/security" rel="noopener">Security</a> · 
              <a href="/gdpr" rel="noopener">GDPR</a>
            </span>
          </div>
        </div>
      </footer>

      {/* Demo Request Modal */}
      {demoModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4" onClick={() => setDemoModalOpen(false)}>
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-5 sm:p-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-2xl sm:text-3xl font-bold text-gray-900">Schedule a Demo</h3>
                  <p className="text-gray-600 mt-2">See CareMaster in action — personalized for your agency</p>
                </div>
                <button onClick={() => setDemoModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                  <X className="h-6 w-6" />
                </button>
              </div>
              {formSuccess ? (
                <div className="text-center py-12">
                  <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle className="h-12 w-12 text-green-600" />
                  </div>
                  <h4 className="text-2xl font-bold text-gray-900 mb-2">Thank You!</h4>
                  <p className="text-gray-600">We'll contact you shortly to schedule your personalized demo.</p>
                </div>
              ) : (
                <form onSubmit={(e) => handleFormSubmit(e, 'demo')} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Full Name *</label>
                      <input type="text" name="name" value={formData.name} onChange={handleInputChange} required autoComplete="name" maxLength="100" className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" placeholder="John Doe" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Email Address *</label>
                      <input type="email" name="email" value={formData.email} onChange={handleInputChange} required autoComplete="email" maxLength="200" className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" placeholder="john@example.com" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Phone Number *</label>
                      <input type="tel" name="phone" value={formData.phone} onChange={handleInputChange} required autoComplete="tel" maxLength="30" className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" placeholder="+234 800 000 0000" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Organization Name *</label>
                      <input type="text" name="organization" value={formData.organization} onChange={handleInputChange} required autoComplete="organization" maxLength="200" className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" placeholder="Your Care Agency" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Tell us about your needs (Optional)</label>
                    <textarea name="message" value={formData.message} onChange={handleInputChange} rows="4" maxLength="1000" className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none" placeholder="Number of caregivers, clients, specific features you're interested in..." />
                  </div>
                  <div className="flex items-start gap-3 pt-2">
                    <input type="checkbox" id="gdpr-demo" checked={gdprConsent} onChange={(e) => setGdprConsent(e.target.checked)} required className="mt-1 w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                    <label htmlFor="gdpr-demo" className="text-xs text-gray-600 leading-relaxed">
                      I agree to the <a href="/privacy-policy" className="text-blue-600 underline" rel="noopener">Privacy Policy</a> and consent to having CareMaster process my data to respond to this request, in accordance with GDPR.
                    </label>
                  </div>
                  <div className="flex gap-4 pt-4">
                    <button type="submit" disabled={formSubmitting} className="flex-1 px-8 py-4 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center">
                      {formSubmitting ? (
                        <><span className="inline-block w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />Submitting...</>
                      ) : (
                        <>Schedule Demo<Calendar className="ml-2 h-5 w-5" /></>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Sales Contact Modal */}
      {salesModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4" onClick={() => setSalesModalOpen(false)}>
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-5 sm:p-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-2xl sm:text-3xl font-bold text-gray-900">Talk to Sales</h3>
                  <p className="text-gray-600 mt-2">Get answers to your questions and learn how we can help</p>
                </div>
                <button onClick={() => setSalesModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                  <X className="h-6 w-6" />
                </button>
              </div>
              {formSuccess ? (
                <div className="text-center py-12">
                  <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle className="h-12 w-12 text-green-600" />
                  </div>
                  <h4 className="text-2xl font-bold text-gray-900 mb-2">Thank You!</h4>
                  <p className="text-gray-600">Our sales team will reach out to you within 24 hours.</p>
                </div>
              ) : (
                <form onSubmit={(e) => handleFormSubmit(e, 'sales')} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Full Name *</label>
                      <input type="text" name="name" value={formData.name} onChange={handleInputChange} required autoComplete="name" maxLength="100" className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" placeholder="John Doe" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Email Address *</label>
                      <input type="email" name="email" value={formData.email} onChange={handleInputChange} required autoComplete="email" maxLength="200" className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" placeholder="john@example.com" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Phone Number *</label>
                      <input type="tel" name="phone" value={formData.phone} onChange={handleInputChange} required autoComplete="tel" maxLength="30" className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" placeholder="+234 800 000 0000" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Organization Name *</label>
                      <input type="text" name="organization" value={formData.organization} onChange={handleInputChange} required autoComplete="organization" maxLength="200" className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" placeholder="Your Care Agency" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">How can we help? *</label>
                    <textarea name="message" value={formData.message} onChange={handleInputChange} required rows="4" maxLength="1000" className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none" placeholder="Tell us about your questions, requirements, or what you'd like to learn more about..." />
                  </div>
                  <div className="flex items-start gap-3 pt-2">
                    <input type="checkbox" id="gdpr-sales" checked={gdprConsent} onChange={(e) => setGdprConsent(e.target.checked)} required className="mt-1 w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                    <label htmlFor="gdpr-sales" className="text-xs text-gray-600 leading-relaxed">
                      I agree to the <a href="/privacy-policy" className="text-blue-600 underline" rel="noopener">Privacy Policy</a> and consent to having CareMaster process my data to respond to this inquiry, in accordance with GDPR.
                    </label>
                  </div>
                  <div className="flex gap-4 pt-4">
                    <button type="submit" disabled={formSubmitting} className="flex-1 px-8 py-4 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center">
                      {formSubmitting ? (
                        <><span className="inline-block w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />Submitting...</>
                      ) : (
                        <>Contact Sales<Mail className="ml-2 h-5 w-5" /></>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* GDPR Cookie Consent Banner */}
      {showCookieBanner && (
        <div className="cookie-banner">
          <div className="cookie-content">
            <p>
              We use cookies to enhance your browsing experience and analyze site traffic. By clicking "Accept", you consent to our use of cookies. See our <a href="/privacy-policy" rel="noopener">Privacy Policy</a> for details.
            </p>
            <div className="cookie-actions">
              <button onClick={handleCookieDecline} className="cookie-btn cookie-btn-decline">Decline</button>
              <button onClick={handleCookieAccept} className="cookie-btn cookie-btn-accept">Accept</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NewHomePage;
