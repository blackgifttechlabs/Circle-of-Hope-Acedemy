import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const SITE_NAME = 'Circle of Hope Academy';
const DEFAULT_DESCRIPTION = 'Circle of Hope Academy is an inclusive private school in Ongwediva, Namibia, offering basic education, special needs support, admissions, school tours, and vocational training.';
const LOGO_PATH = '/logo.png';

const pageMeta: Record<string, { title: string; description: string; noindex?: boolean }> = {
  '/': {
    title: 'Circle of Hope Academy | Inclusive Private School in Ongwediva, Namibia',
    description: DEFAULT_DESCRIPTION,
  },
  '/about-us': {
    title: 'About Circle of Hope Academy | Inclusive Education in Namibia',
    description: 'Learn about Circle of Hope Academy, an inclusive school in Ongwediva focused on academic growth, dignity, pastoral care, and support for every learner.',
  },
  '/apply': {
    title: 'Apply Online | Circle of Hope Academy Admissions',
    description: 'Apply online for Circle of Hope Academy admissions. Submit learner details and begin the school enrolment process for inclusive education in Namibia.',
  },
  '/vtc-apply': {
    title: 'VTC Application | Circle of Hope Academy Vocational Training Centre',
    description: 'Apply for Circle of Hope Academy Vocational Training Centre programmes and practical skills training in Ondangwa, Namibia.',
  },
  '/tour': {
    title: 'School Tour | Circle of Hope Academy',
    description: 'Explore Circle of Hope Academy facilities, classrooms, sport, technology, inclusive learning spaces, and vocational training centre.',
  },
  '/login': {
    title: 'Portal Login | Circle of Hope Academy',
    description: 'Secure portal login for Circle of Hope Academy parents, teachers, matrons, VTC students, and administrators.',
    noindex: true,
  },
};

const setMeta = (selector: string, attribute: string, value: string) => {
  let tag = document.head.querySelector(selector) as HTMLMetaElement | HTMLLinkElement | null;
  if (!tag) {
    tag = document.createElement(selector.startsWith('link') ? 'link' : 'meta') as HTMLMetaElement | HTMLLinkElement;
    const selectorMatch = selector.match(/\[(name|property|rel)="([^"]+)"\]/);
    if (selectorMatch) tag.setAttribute(selectorMatch[1], selectorMatch[2]);
    document.head.appendChild(tag);
  }
  tag.setAttribute(attribute, value);
};

export const SEO: React.FC = () => {
  const location = useLocation();

  useEffect(() => {
    const pathname = location.pathname || '/';
    const meta = pageMeta[pathname] || {
      title: SITE_NAME,
      description: DEFAULT_DESCRIPTION,
      noindex: pathname !== '/',
    };
    const origin = window.location.origin;
    const canonicalUrl = `${origin}${pathname === '/' ? '/' : pathname}`;
    const logoUrl = `${origin}${LOGO_PATH}`;

    document.title = meta.title;
    setMeta('meta[name="description"]', 'content', meta.description);
    setMeta('meta[name="robots"]', 'content', meta.noindex ? 'noindex, follow' : 'index, follow');
    setMeta('link[rel="canonical"]', 'href', canonicalUrl);
    setMeta('meta[property="og:title"]', 'content', meta.title);
    setMeta('meta[property="og:description"]', 'content', meta.description);
    setMeta('meta[property="og:url"]', 'content', canonicalUrl);
    setMeta('meta[property="og:image"]', 'content', logoUrl);
    setMeta('meta[name="twitter:title"]', 'content', meta.title);
    setMeta('meta[name="twitter:description"]', 'content', meta.description);
    setMeta('meta[name="twitter:image"]', 'content', logoUrl);

    const jsonLd = {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'School',
          '@id': `${origin}/#school`,
          name: SITE_NAME,
          alternateName: 'COHA',
          url: origin,
          logo: logoUrl,
          image: logoUrl,
          description: DEFAULT_DESCRIPTION,
          address: {
            '@type': 'PostalAddress',
            streetAddress: 'Elcin Centre Old Ongwediva',
            addressLocality: 'Ongwediva',
            addressRegion: 'Oshana Region',
            addressCountry: 'NA',
          },
          telephone: '+264 81 666 4074',
          email: 'circleofhopeacademy@yahoo.com',
        },
        {
          '@type': 'WebSite',
          '@id': `${origin}/#website`,
          name: SITE_NAME,
          url: origin,
          publisher: { '@id': `${origin}/#school` },
        },
        {
          '@type': 'SiteNavigationElement',
          name: ['Home', 'About Us', 'Admissions', 'School Tour', 'VTC Application'],
          url: [`${origin}/`, `${origin}/about-us`, `${origin}/apply`, `${origin}/tour`, `${origin}/vtc-apply`],
        },
      ],
    };

    let script = document.getElementById('coha-json-ld') as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement('script');
      script.id = 'coha-json-ld';
      script.type = 'application/ld+json';
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(jsonLd);
  }, [location.pathname]);

  return null;
};
