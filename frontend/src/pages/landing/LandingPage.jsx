import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import i18n from '../../i18n/index.js';
import s from './landing.module.css';
import {
  IcChat, IcCard, IcSummary, IcNotes, IcStreak,
  IcTimer, IcMic, IcSearch, IcArrow,
} from './LandingIcons.jsx';
import {
  StudentReading, StudentThinking, StudentLaptop,
  Sparkle, UnderlineScribble,
  IlluUpload, IlluGenerate, IlluMaster,
} from './LandingIllustrations.jsx';

/* ── Brand mark SVG ─────────────────────────────────────── */
function BrandMark({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M4 6 L12 3 L20 6 L20 14 C20 17,16 19,12 21 C8 19,4 17,4 14 Z"
        fill="currentColor" stroke="currentColor" strokeWidth="0.6" />
    </svg>
  );
}

/* ── Nav ─────────────────────────────────────────────────── */
function Nav() {
  const { t } = useTranslation();
  return (
    <nav className={s.nav}>
      <div className={s.navInner}>
        <Link to="/" className={s.brand}>
          <div className={s.brandMark}><BrandMark /></div>
          <span className={s.brandName}>StudyAI</span>
        </Link>
        <div className={s.navCta}>
          <Link to="/login" className={`${s.btn} ${s.btnLink}`}>{t('landing.nav.signIn')}</Link>
          <Link to="/register" className={`${s.btn} ${s.btnPrimary}`}>{t('landing.nav.getStarted')}</Link>
        </div>
      </div>
    </nav>
  );
}

/* ── Hero scene ──────────────────────────────────────────── */
function HeroScene() {
  const { t } = useTranslation();
  return (
    <div className={s.scene}>
      {/* PDF doc */}
      <div className={`${s.sceneItem} ${s.scenePdf}`}>
        <div className={s.illuPdf}>
          <div className={s.illuPdfCorner} />
          <div className={s.illuPdfTag}>PDF</div>
          <div className={s.illuPdfTitle}>{t('landing.hero.pdfTitle')}</div>
          <div className={s.illuPdfHighlight} />
          <div className={s.illuPdfLine} />
          <div className={`${s.illuPdfLine} ${s.illuPdfLineShort}`} />
          <div className={s.illuPdfLine} />
          <div className={`${s.illuPdfLine} ${s.illuPdfLineShorter}`} />
          <div className={s.illuPdfDiagram}>{t('landing.hero.pdfDiagram')}</div>
        </div>
      </div>

      {/* Sparkle */}
      <div className={`${s.sceneItem} ${s.sceneSparkle}`}><Sparkle size={50} /></div>

      {/* Notebook ipynb */}
      <div className={`${s.sceneItem} ${s.sceneIpynb}`}>
        <div className={s.illuIpynb}>
          <div className={s.illuIpynbHeader}>
            <div className={s.illuIpynbIcon}>J</div>
            <span>linear-algebra.ipynb</span>
          </div>
          <div className={`${s.illuIpynbCell} ${s.illuIpynbCellIn}`}>
            <span className={s.illuIpynbMarker}>[3]:</span>
            <div>
              <span className={s.tkKey}>import</span> numpy <span className={s.tkKey}>as</span> np<br />
              <span className={s.tkFn}>eigvals</span> = np.linalg.<span className={s.tkFn}>eig</span>(<span className={s.tkStr}>A</span>)
            </div>
          </div>
          <div className={`${s.illuIpynbCell} ${s.illuIpynbCellOut}`}>
            <div>array([<span className={s.tkNum}>3.41</span>, <span className={s.tkNum}>1.59</span>, <span className={s.tkNum}>0.0</span>])</div>
            <div className={s.illuIpynbPlot}>
              <svg width="100%" height="40" viewBox="0 0 200 40" preserveAspectRatio="none">
                <polyline points="5,30 30,18 55,28 80,10 105,22 130,6 155,18 180,8 195,14"
                  fill="none" stroke="#8b5e34" strokeWidth="1.6"/>
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className={`${s.sceneItem} ${s.sceneNotes}`}>
        <div className={s.illuNotes}>
          <span className={s.illuNotesHole} style={{ top: 12 }} />
          <span className={s.illuNotesHole} style={{ top: 60 }} />
          <span className={s.illuNotesHole} style={{ top: 108 }} />
          <span className={s.illuNotesHole} style={{ top: 156 }} />
          <div className={s.illuNotesTitle}>{t('landing.hero.notesTitle')}</div>
          <div className={s.illuNotesLine}>{t('landing.hero.notesLine1')}</div>
          <div className={s.illuNotesLine}>{t('landing.hero.notesLine2')}</div>
          <div className={s.illuNotesLine}>{t('landing.hero.notesLine3')}</div>
          <div className={s.illuNotesLine}>{t('landing.hero.notesLine4')}</div>
        </div>
      </div>

      {/* Sticky */}
      <div className={`${s.sceneItem} ${s.sceneSticky}`}>
        <div className={s.illuSticky}>
          <span className={s.illuStickyLabel}>{t('landing.hero.stickyLabel')}</span>
          {t('landing.hero.stickyText').split('\n').map((line, i) => <span key={i}>{line}<br /></span>)}
        </div>
      </div>

      {/* Student */}
      <div className={`${s.sceneItem} ${s.sceneStudent}`}>
        <StudentReading size={240} />
      </div>

      {/* Chips */}
      <div className={s.sceneChipA}>
        <div className={s.illuChip}>
          <div className={s.illuChipIcon}><IcCard size={14} /></div>
          <div>
            <div className={s.illuChipTitle}>{t('landing.hero.chip1Title')}</div>
            <div className={s.illuChipSub}>{t('landing.hero.chip1Sub')}</div>
          </div>
        </div>
      </div>
      <div className={s.sceneChipB}>
        <div className={s.illuChip}>
          <div className={`${s.illuChipIcon} ${s.illuChipIconLeaf}`}><IcStreak size={14} /></div>
          <div>
            <div className={s.illuChipTitle}>{t('landing.hero.chip2Title')}</div>
            <div className={s.illuChipSub}>{t('landing.hero.chip2Sub')}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Hero ────────────────────────────────────────────────── */
function Hero() {
  const { t } = useTranslation();
  return (
    <section className={s.hero}>
      <div className={s.heroBg} />
      <div className={s.container}>
        <div className={s.heroInner}>
          <div className={s.heroCopy}>
            <span className={s.eyebrow}>
              <span className={s.eyebrowDot} />
              {t('landing.hero.eyebrow')}
            </span>
            <h1 className={s.hDisplay} style={{ marginTop: 28 }}>
              {t('landing.hero.headline1')}<br />
              {t('landing.hero.headline2')}{' '}
              <span className={s.underlined}>
                {t('landing.hero.headline2em')}
                <UnderlineScribble />
              </span><br />
              {t('landing.hero.headline3')}
            </h1>
            <p className={`${s.lead} ${s.heroLead}`}>{t('landing.hero.lead')}</p>
            <div className={s.heroCtas}>
              <Link to="/register" className={`${s.btn} ${s.btnPrimary} ${s.btnLg}`}>
                {t('landing.hero.cta1')} <IcArrow size={16} />
              </Link>
              <a href="#how" className={`${s.btn} ${s.btnGhost} ${s.btnLg}`}>
                {t('landing.hero.cta2')}
              </a>
            </div>
            <div className={s.heroMeta}>
              <span>{t('landing.hero.meta1')}</span>
              <span className={s.heroDot} />
              <span>{t('landing.hero.meta2')}</span>
              <span className={s.heroDot} />
              <span>{t('landing.hero.meta3')}</span>
            </div>
          </div>
          <div><HeroScene /></div>
        </div>
      </div>
    </section>
  );
}

/* ── Features ────────────────────────────────────────────── */
function Features() {
  const { t } = useTranslation();
  const features = [
    { num: '01', icon: <IcChat size={20} />, key: 'f01' },
    { num: '02', icon: <IcCard size={20} />, key: 'f02' },
    { num: '03', icon: <IcSummary size={20} />, key: 'f03' },
    { num: '04', icon: <IcNotes size={20} />, key: 'f04' },
    { num: '05', icon: <IcMic size={20} />, key: 'f05' },
    { num: '06', icon: <IcSearch size={20} />, key: 'f06' },
    { num: '07', icon: <IcTimer size={20} />, key: 'f07' },
    { num: '08', icon: <IcStreak size={20} />, key: 'f08' },
  ];
  return (
    <section className={s.section} id="features">
      <div className={s.container}>
        <div className={s.featuresHead}>
          <div>
            <div className={s.sectionEyebrow}>{t('landing.features.eyebrow')}</div>
            <h2 className={s.hSection}>
              {t('landing.features.title1')}<br />
              <em>{t('landing.features.title2')}</em>
            </h2>
          </div>
          <p className={s.lead}>{t('landing.features.lead')}</p>
        </div>
        <div className={s.featuresList}>
          {features.map(({ num, icon, key }) => (
            <article className={s.feature} key={key}>
              <div>
                <div className={s.featureNum}>{num}</div>
                <div className={s.featureIcon}>{icon}</div>
              </div>
              <div>
                <h3 className={s.featureTitle}>{t(`landing.features.${key}Title`)}</h3>
                <p className={s.featureDesc}>{t(`landing.features.${key}Desc`)}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── How it works ────────────────────────────────────────── */
function HowItWorks() {
  const { t } = useTranslation();
  const steps = [
    { label: 's1', illu: <IlluUpload /> },
    { label: 's2', illu: <IlluGenerate /> },
    { label: 's3', illu: <IlluMaster /> },
  ];
  return (
    <section className={`${s.section} ${s.how}`} id="how">
      <div className={s.container}>
        <div className={s.howHead}>
          <div className={s.sectionEyebrow}>{t('landing.how.eyebrow')}</div>
          <h2 className={s.hSection}>
            {t('landing.how.title1')} <em>{t('landing.how.title1em')}</em><br />
            {t('landing.how.title2')}
          </h2>
        </div>
        <div className={s.howSteps}>
          {steps.map(({ label, illu }, i) => (
            <div className={s.step} key={label}>
              <div className={s.stepIllu}>{illu}</div>
              <div className={s.stepNumLine}>
                <span className={s.stepNum}>{i + 1}</span>
                {t(`landing.how.${label}Label`)}
              </div>
              <h3 className={s.stepTitle}>{t(`landing.how.${label}Title`)}</h3>
              <p className={s.stepDesc}>{t(`landing.how.${label}Desc`)}</p>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 64 }}>
          <span className={s.handnote}>{t('landing.how.handnote')}</span>
        </div>
      </div>
    </section>
  );
}

/* ── Pricing ─────────────────────────────────────────────── */
function Pricing() {
  const { t } = useTranslation();
  return (
    <section className={s.section} id="pricing">
      <div className={s.container}>
        <div className={s.pricingHead}>
          <div className={s.sectionEyebrow}>{t('landing.pricing.eyebrow')}</div>
          <h2 className={s.hSection}>
            {t('landing.pricing.title1')}<br />
            <em>{t('landing.pricing.title2')}</em>
          </h2>
        </div>
        <div className={s.pricingGrid}>
          {/* Free */}
          <div className={s.plan}>
            <div className={s.planName}>{t('landing.pricing.freeName')}</div>
            <div className={s.planPrice}>
              <span className={s.planPriceNum}>{t('landing.pricing.freePrice')}</span>
              <span className={s.planPricePer}>{t('landing.pricing.freePer')}</span>
            </div>
            <p className={s.planTagline}>{t('landing.pricing.freeTagline')}</p>
            <ul className={s.planFeatures}>
              {[1,2,3,4,5].map(n => <li key={n}>{t(`landing.pricing.freeF${n}`)}</li>)}
            </ul>
            <Link to="/register" className={`${s.btn} ${s.btnGhost} ${s.btnLg}`} style={{ width: '100%' }}>
              {t('landing.pricing.freeCta')}
            </Link>
          </div>
          {/* Pro */}
          <div className={`${s.plan} ${s.planPro}`}>
            <div className={s.planBadge}>{t('landing.pricing.proBadge')}</div>
            <div className={s.planName}>{t('landing.pricing.proName')}</div>
            <div className={s.planPrice}>
              <span className={s.planPriceNum}>{t('landing.pricing.proPrice')}</span>
              <span className={s.planPricePer}>{t('landing.pricing.proPer')}</span>
            </div>
            <p className={s.planTagline}>{t('landing.pricing.proTagline')}</p>
            <ul className={s.planFeatures}>
              {[1,2,3,4,5].map(n => <li key={n}>{t(`landing.pricing.proF${n}`)}</li>)}
            </ul>
            <Link to="/register" className={`${s.btn} ${s.btnPrimary} ${s.btnLg}`} style={{ width: '100%' }}>
              {t('landing.pricing.proCta')} <IcArrow size={16} />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── Final CTA ───────────────────────────────────────────── */
function FinalCTA() {
  const { t } = useTranslation();
  return (
    <section className={s.finalCta}>
      <div className={s.container}>
        <div className={s.finalCtaInner}>
          <div className={s.sectionEyebrow}>{t('landing.finalCta.eyebrow')}</div>
          <h2 className={`${s.hDisplay} ${s.finalCtaTitle}`}>
            {t('landing.finalCta.title1')}<br />
            <em>{t('landing.finalCta.title2')}</em>
          </h2>
          <p className={`${s.lead} ${s.finalCtaLead}`} style={{ textAlign: 'center' }}>
            {t('landing.finalCta.lead')}
          </p>
          <div className={s.finalCtaBtns}>
            <Link to="/register" className={`${s.btn} ${s.btnPrimary} ${s.btnXl}`}>
              {t('landing.finalCta.cta1')} <IcArrow size={18} />
            </Link>
          </div>
          <div className={s.finalCtaIllus}>
            <StudentThinking size={140} />
            <StudentLaptop size={160} />
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── Footer ──────────────────────────────────────────────── */
function Footer() {
  const { t } = useTranslation();
  const currentLang = i18n.language?.startsWith('tr') ? 'TR' : 'EN';

  const switchLang = (lang) => {
    i18n.changeLanguage(lang === 'TR' ? 'tr' : 'en');
  };

  return (
    <footer className={s.footer}>
      <div className={s.container}>
        <div className={s.footerInner}>
          <div className={s.footerBrand}>
            <div className={s.brand}>
              <div className={s.brandMark}><BrandMark size={14} /></div>
              <span className={s.brandName}>StudyAI</span>
            </div>
            <p className={s.footerTag}>{t('landing.footer.tagline')}</p>
          </div>
        </div>

        <div className={s.footerBottom}>
          <div>{t('landing.footer.copyright')}</div>
          <div className={s.langToggle}>
            <button
              className={`${s.langBtn} ${currentLang === 'EN' ? s.langBtnActive : ''}`}
              onClick={() => switchLang('EN')}
            >EN</button>
            <button
              className={`${s.langBtn} ${currentLang === 'TR' ? s.langBtnActive : ''}`}
              onClick={() => switchLang('TR')}
            >TR</button>
          </div>
        </div>
      </div>
    </footer>
  );
}

/* ── Page ────────────────────────────────────────────────── */
export default function LandingPage() {
  return (
    <div className={s.page}>
      <Nav />
      <Hero />
      <Features />
      <HowItWorks />
      <Pricing />
      <FinalCTA />
      <Footer />
    </div>
  );
}
