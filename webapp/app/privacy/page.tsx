import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Link from 'next/link';

// Pagina PUBBLICA (nessuna autenticazione) — richiesta da Meta per l'app review.
// Sovrascrive il noindex globale del layout: una privacy policy deve essere
// raggiungibile e indicizzabile.
export const metadata: Metadata = {
  title: 'Privacy Policy · GENERAH AI',
  description:
    'How GENERAH AI collects, uses, stores, shares and protects personal data, including data obtained through Meta Platforms (Facebook, Instagram, WhatsApp and the Marketing API) and Google APIs (Google Calendar).',
  robots: { index: true, follow: true },
};

export const dynamic = 'force-static';

const EFFECTIVE = '1 July 2026';
const CONTACT = 'info@generah.app';

// Dati legali del titolare.
const LEGAL = {
  entity: 'Generah AI',
  address: 'Via Palmiro Togliatti 103, Saronno (VA), Italy',
};

function Section({
  id,
  n,
  title,
  children,
}: {
  id: string;
  n: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-28 border-t border-white/8 pt-10">
      <h2 className="flex items-baseline gap-3 font-display text-2xl font-semibold tracking-tighter text-bone">
        <span className="font-mono text-sm font-medium text-teal-300">{n}</span>
        {title}
      </h2>
      <div className="mt-4 space-y-4 text-[0.98rem] leading-relaxed text-mist">{children}</div>
    </section>
  );
}

const TOC: { id: string; label: string }[] = [
  { id: 'who', label: '1 · Who we are' },
  { id: 'data', label: '2 · Data we collect' },
  { id: 'use', label: '3 · How we use data' },
  { id: 'meta', label: '4 · Meta Platform data' },
  { id: 'google', label: '5 · Google Platform data' },
  { id: 'roles', label: '6 · Controller / processor' },
  { id: 'legal-bases', label: '7 · Legal bases' },
  { id: 'subprocessors', label: '8 · Service providers' },
  { id: 'sharing', label: '9 · Sharing & disclosure' },
  { id: 'transfers', label: '10 · International transfers' },
  { id: 'retention', label: '11 · Retention' },
  { id: 'security', label: '12 · Security' },
  { id: 'rights', label: '13 · Your rights' },
  { id: 'deletion', label: '14 · Data deletion' },
  { id: 'cookies', label: '15 · Cookies' },
  { id: 'children', label: '16 · Children' },
  { id: 'changes', label: '17 · Changes' },
  { id: 'contact', label: '18 · Contact' },
];

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-ink text-bone">
      {/* Header */}
      <header className="border-b border-white/8">
        <div className="mx-auto flex max-w-content items-center justify-between px-5 py-5 sm:px-8">
          <Link href="/" className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-wordmark.png" alt="GENERAH AI" className="h-7 w-auto" />
          </Link>
          <span className="font-mono text-xs uppercase tracking-[0.2em] text-teal-300/80">
            Privacy Policy
          </span>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-5 pb-28 pt-14 sm:px-8">
        {/* Title block */}
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-teal-300">
          GENERAH AI
        </p>
        <h1 className="mt-4 font-display text-4xl font-semibold leading-[1.05] tracking-tighter text-bone sm:text-5xl">
          Privacy Policy
        </h1>
        <p className="mt-5 text-lg leading-relaxed text-mist">
          This Privacy Policy explains how GENERAH AI (&ldquo;GENERAH&rdquo;, &ldquo;we&rdquo;,
          &ldquo;us&rdquo;) collects, uses, stores, shares and protects personal data when you use
          our platform, including data we access through Meta Platforms (Facebook, Instagram,
          WhatsApp Business and the Meta Marketing API), and Google APIs (Google Calendar).
        </p>
        <p className="mt-4 font-mono text-xs text-mist/80">
          Effective date: {EFFECTIVE} · Last updated: {EFFECTIVE}
        </p>

        {/* TOC */}
        <nav
          aria-label="Table of contents"
          className="mt-10 rounded-2xl border border-white/8 bg-white/[0.02] p-5"
        >
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-teal-300/80">Contents</p>
          <ul className="mt-3 grid gap-x-6 gap-y-2 sm:grid-cols-2">
            {TOC.map((t) => (
              <li key={t.id}>
                <a
                  href={`#${t.id}`}
                  className="text-sm text-mist transition-colors hover:text-teal-300"
                >
                  {t.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="mt-12 space-y-10">
          <Section id="who" n="1" title="Who we are">
            <p>
              GENERAH AI is an autonomous, AI-driven sales and marketing platform. The data
              controller for the personal data described in this policy is{' '}
              <span className="text-bone">{LEGAL.entity}</span>, {LEGAL.address}. You can reach us at
              any time at{' '}
              <a href={`mailto:${CONTACT}`} className="text-teal-300 hover:underline">
                {CONTACT}
              </a>
              .
            </p>
            <p>
              GENERAH is designed for businesses (&ldquo;Admins&rdquo;) that use our tools to run
              their own marketing, advertising and customer-relationship activities. Where we
              process personal data on behalf of an Admin (for example, the contacts and leads they
              collect), the roles described in section 6 apply.
            </p>
          </Section>

          <Section id="data" n="2" title="Data we collect">
            <p>We collect the following categories of personal data:</p>
            <ul className="ml-1 space-y-3">
              <li>
                <span className="text-bone">Account &amp; registration data.</span> First name, last
                name, email address, mobile phone number and business sector, plus login
                credentials.
              </li>
              <li>
                <span className="text-bone">Content you upload.</span> Marketing materials and
                knowledge-base documents you provide to configure your AI assistant. These may
                contain business information and, where you choose to include it, personal data.
              </li>
              <li>
                <span className="text-bone">Connected-platform data.</span> When you connect a Meta
                account, Instagram or Facebook Page, an Ad account, a WhatsApp Business number or a
                Metricool account, we access data needed to operate the service — see section 4.
              </li>
              <li>
                <span className="text-bone">Leads &amp; customer data.</span> Contact details and
                interaction history of the leads and customers you manage in the platform (including
                leads generated by advertising lead forms and contact lists you import).
              </li>
              <li>
                <span className="text-bone">Communications.</span> Messages exchanged through
                connected channels (e.g. WhatsApp) and content generated for or during AI video
                consultations.
              </li>
              <li>
                <span className="text-bone">Usage &amp; technical data.</span> Log data, device and
                browser information, and diagnostic events needed to run, secure and improve the
                service.
              </li>
            </ul>
          </Section>

          <Section id="use" n="3" title="How we use data">
            <p>We use personal data to:</p>
            <ul className="ml-1 space-y-2">
              <li>provide, operate and secure the platform and your personalised dashboard;</li>
              <li>
                generate content with AI — social posts and infographics, advertising creatives
                (video, voiceover, subtitles) and persuasive copy — based on your knowledge base;
              </li>
              <li>
                create, publish, schedule and optimise social posts and advertising campaigns on the
                platforms you connect;
              </li>
              <li>capture, store, enrich and manage leads and customer relationships (CRM);</li>
              <li>enable AI video consultations and messaging automations;</li>
              <li>
                meter usage of plan features (AI calls, video consultations, messaging, campaign
                management) and notify you about remaining capacity;
              </li>
              <li>provide support, prevent abuse and comply with legal obligations.</li>
            </ul>
            <p>
              We do not sell personal data, and we do not use data obtained through Meta Platforms
              for advertising unrelated to the service you configure.
            </p>
          </Section>

          <Section id="meta" n="4" title="Meta Platform data">
            <p>
              With your explicit authorisation, GENERAH connects to Meta Platforms on your behalf
              and accesses only the data required to deliver the features you enable:
            </p>
            <ul className="ml-1 space-y-2">
              <li>
                <span className="text-bone">Facebook Login &amp; permissions.</span> To authenticate
                the connection and obtain the access tokens needed for the scopes you grant.
              </li>
              <li>
                <span className="text-bone">Facebook Pages &amp; Instagram.</span> Page and
                professional-account identifiers, and the ability to publish and schedule posts you
                approve.
              </li>
              <li>
                <span className="text-bone">Marketing API (Ads).</span> Ad-account identifiers,
                campaign/ad-set/ad objects, audiences and performance insights, to create and
                optimise campaigns you configure.
              </li>
              <li>
                <span className="text-bone">Lead Ads.</span> Contacts submitted through advertising
                lead forms, which are stored in your CRM.
              </li>
              <li>
                <span className="text-bone">WhatsApp Business.</span> Business phone-number
                identifiers and message content, to send and automate the conversations you enable.
              </li>
            </ul>
            <p>
              Access tokens and credentials are stored encrypted (see section 12) and are used only
              to perform the actions you authorise. Our use of information received from Meta APIs
              adheres to the{' '}
              <a
                href="https://developers.facebook.com/terms/"
                className="text-teal-300 hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                Meta Platform Terms
              </a>{' '}
              and{' '}
              <a
                href="https://developers.facebook.com/devpolicy/"
                className="text-teal-300 hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                Developer Policies
              </a>
              . You can revoke access at any time (see section 14).
            </p>
          </Section>

          <Section id="google" n="5" title="Google Platform data">
            <p>
              With your explicit authorisation, when you connect Google Calendar GENERAH requests the
              Google Calendar scope{' '}
              <span className="whitespace-nowrap font-mono text-sm text-bone">
                .../auth/calendar.events
              </span>{' '}
              and accesses your Google account data only to deliver the appointment-booking feature.
            </p>
            <ul className="ml-1 space-y-2">
              <li>
                <span className="text-bone">What we access and why.</span> We use this scope solely to
                create and manage calendar events on your behalf &mdash; the appointments that the AI
                video-avatar, voice agent and WhatsApp assistant schedule for you. We do not read,
                display, sell or store the contents of your existing calendar, and we do not use this
                access for any other purpose.
              </li>
              <li>
                <span className="text-bone">What we store.</span> A Google OAuth refresh token,
                encrypted at rest (see section 12), used only to obtain short-lived access tokens to
                create those events, together with the target calendar identifier (by default, your
                primary calendar).
              </li>
              <li>
                <span className="text-bone">No transfer for other uses.</span> We do not sell or share
                Google user data, do not use it for advertising, and do not use it to train
                generalised or third-party AI models.
              </li>
            </ul>
            <p>
              GENERAH&rsquo;s use and transfer of information received from Google APIs adheres to the{' '}
              <a
                href="https://developers.google.com/terms/api-services-user-data-policy"
                className="text-teal-300 hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                Google API Services User Data Policy
              </a>
              , including the Limited Use requirements.
            </p>
            <p>
              You can revoke access at any time by disconnecting Google Calendar from the GENERAH
              admin area &mdash; which deletes the stored refresh token &mdash; or from your Google
              Account at{' '}
              <a
                href="https://myaccount.google.com/permissions"
                className="text-teal-300 hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                myaccount.google.com/permissions
              </a>
              .
            </p>
          </Section>

          <Section id="roles" n="6" title="Controller and processor roles">
            <p>
              For your account data (registration, billing, usage), GENERAH acts as the{' '}
              <span className="text-bone">data controller</span>.
            </p>
            <p>
              For the leads, customers and contacts you upload, import or collect through the
              platform, you (the Admin/business) are the controller and GENERAH acts as a{' '}
              <span className="text-bone">data processor</span> that processes such data solely on
              your documented instructions and to provide the service. You are responsible for having
              a valid legal basis and appropriate notices/consents for the personal data you bring
              into the platform.
            </p>
          </Section>

          <Section id="legal-bases" n="7" title="Legal bases (GDPR)">
            <p>Where the GDPR applies, we rely on:</p>
            <ul className="ml-1 space-y-2">
              <li>
                <span className="text-bone">Contract</span> — to provide the service you request;
              </li>
              <li>
                <span className="text-bone">Consent</span> — to connect third-party accounts (e.g.
                Meta) and for optional processing; you may withdraw consent at any time;
              </li>
              <li>
                <span className="text-bone">Legitimate interests</span> — to secure, maintain and
                improve the service and prevent abuse;
              </li>
              <li>
                <span className="text-bone">Legal obligation</span> — to comply with applicable law.
              </li>
            </ul>
          </Section>

          <Section id="subprocessors" n="8" title="Service providers (sub-processors)">
            <p>
              We rely on trusted providers who process data on our behalf, under contractual data
              protection obligations, only to deliver the service:
            </p>
            <ul className="ml-1 space-y-2">
              <li>
                <span className="text-bone">Meta Platforms</span> — Facebook, Instagram, WhatsApp
                Business and the Marketing API;
              </li>
              <li>
                <span className="text-bone">Supabase</span> — database, authentication and file
                storage;
              </li>
              <li>
                <span className="text-bone">Vercel</span> — application hosting;
              </li>
              <li>
                <span className="text-bone">Anthropic</span> and <span className="text-bone">OpenAI</span>{' '}
                — AI text, embeddings, speech and real-time processing;
              </li>
              <li>
                <span className="text-bone">Higgsfield</span> — AI image, video and voiceover
                generation;
              </li>
              <li>
                <span className="text-bone">Metricool</span> — social-media scheduling and analytics;
              </li>
              <li>
                <span className="text-bone">HeyGen / LiveAvatar</span> — AI video-consultation avatar;
              </li>
              <li>
                <span className="text-bone">DIDWW</span> — telephony services, where enabled.
              </li>
            </ul>
            <p>
              If we enable paid plans, payments will be handled by a third-party payment processor
              (e.g. PayPal); we do not store full card details.
            </p>
          </Section>

          <Section id="sharing" n="9" title="Sharing and disclosure">
            <p>
              We do not sell personal data. We share data only with the service providers listed
              above, with the platforms you explicitly connect (to perform the actions you
              authorise), and where required by law or to protect our rights, users and the public.
            </p>
          </Section>

          <Section id="transfers" n="10" title="International transfers">
            <p>
              Some providers are located outside the EEA (for example, in the United States). Where
              personal data is transferred internationally, we rely on appropriate safeguards such as
              the European Commission&rsquo;s Standard Contractual Clauses.
            </p>
          </Section>

          <Section id="retention" n="11" title="Data retention">
            <p>
              We keep personal data only for as long as needed to provide the service and for the
              purposes described here, then delete or anonymise it. Account data is retained while
              your account is active; connected-platform tokens are retained until you disconnect;
              leads and CRM data are retained under your control until you delete them or close your
              account. On account closure, we delete or anonymise your data within a reasonable
              period, subject to legal retention requirements.
            </p>
          </Section>

          <Section id="security" n="12" title="Security">
            <p>
              We apply technical and organisational measures appropriate to the risk. Data is
              encrypted in transit (TLS). Third-party access tokens and secrets are encrypted at rest
              using AES-256-GCM before storage, and platform credentials are kept in records
              accessible only to privileged server roles (row-level security). Access is restricted
              on a need-to-know basis. No method of transmission or storage is completely secure, but
              we work to protect your data and to respond promptly to incidents.
            </p>
          </Section>

          <Section id="rights" n="13" title="Your rights">
            <p>
              Subject to applicable law, you may have the right to access, rectify, erase, restrict
              or object to processing, to data portability, and to withdraw consent at any time. To
              exercise these rights, contact us at{' '}
              <a href={`mailto:${CONTACT}`} className="text-teal-300 hover:underline">
                {CONTACT}
              </a>
              . You also have the right to lodge a complaint with your local data protection
              authority (in Italy, the Garante per la protezione dei dati personali). Where GENERAH
              acts as a processor for an Admin&rsquo;s contacts, requests from those individuals are
              forwarded to the relevant Admin (controller).
            </p>
          </Section>

          <Section id="deletion" n="14" title="Data deletion &amp; revoking access">
            <p>
              You can disconnect any connected platform (including Meta, Instagram, Facebook,
              WhatsApp, Metricool and Google Calendar) at any time from within the GENERAH admin area; disconnecting
              deletes the stored access tokens for that integration.
            </p>
            <p>
              To request deletion of your account and the personal data associated with it —
              including data obtained through Meta Platforms — email{' '}
              <a href={`mailto:${CONTACT}`} className="text-teal-300 hover:underline">
                {CONTACT}
              </a>{' '}
              with the subject &ldquo;Data deletion request&rdquo;. We will verify the request and
              delete the associated personal data within 30 days, except where retention is required
              by law. You can also remove GENERAH&rsquo;s access from your Facebook account settings
              under Settings &amp; Privacy → Settings → Apps and Websites.
            </p>
          </Section>

          <Section id="cookies" n="15" title="Cookies">
            <p>
              We use strictly necessary cookies and similar technologies to keep you signed in and to
              secure the application. We do not use these for third-party advertising. You can control
              cookies through your browser settings, though some features may not work without them.
            </p>
          </Section>

          <Section id="children" n="16" title="Children">
            <p>
              GENERAH is intended for businesses and is not directed to individuals under 18. We do
              not knowingly collect personal data from minors. If you believe a minor has provided us
              data, contact us and we will delete it.
            </p>
          </Section>

          <Section id="changes" n="17" title="Changes to this policy">
            <p>
              We may update this policy from time to time. We will post the updated version here and
              revise the &ldquo;Last updated&rdquo; date. Material changes will be communicated
              through the service where appropriate.
            </p>
          </Section>

          <Section id="contact" n="18" title="Contact">
            <p>
              For any question about this policy or your personal data, contact{' '}
              <a href={`mailto:${CONTACT}`} className="text-teal-300 hover:underline">
                {CONTACT}
              </a>{' '}
              or write to {LEGAL.entity}, {LEGAL.address}.
            </p>
          </Section>
        </div>

        {/* Footer */}
        <footer className="mt-16 border-t border-white/8 pt-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-mist/70">
              © {new Date().getFullYear()} GENERAH AI
            </p>
            <Link href="/" className="text-sm text-teal-300 hover:underline">
              ← Back to GENERAH
            </Link>
          </div>
        </footer>
      </div>
    </main>
  );
}
