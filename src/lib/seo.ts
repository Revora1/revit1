export interface SEOData {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: 'website' | 'article' | 'profile';
  keywords?: string[];
  jsonLd?: Record<string, any>;
}

const DEFAULT_SEO: SEOData = {
  title: 'RevItUp - Social Garage & Automotive Build Community',
  description: 'Join RevItUp: The premier social garage for car enthusiasts. Share project builds, dyno sheets, 0-60 & quarter-mile times, modifications, and connect with tuners worldwide.',
  image: 'https://revitup.today/icon-512.png',
  url: 'https://revitup.today',
  type: 'website',
  keywords: ['car builds', 'virtual garage', 'dyno tuning', 'car modifications', 'tuner community', 'drag times', 'automotive marketplace', 'RevItUp'],
  jsonLd: {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'RevItUp',
    url: 'https://revitup.today',
    description: 'Social garage and vehicle build platform for automotive enthusiasts and tuners.',
    potentialAction: {
      '@type': 'SearchAction',
      target: 'https://revitup.today/?q={search_term_string}',
      'query-input': 'required name=search_term_string'
    }
  }
};

function setMetaTag(name: string, content: string, isProperty = false) {
  if (typeof document === 'undefined') return;
  const attributeName = isProperty ? 'property' : 'name';
  let element = document.querySelector(`meta[${attributeName}="${name}"]`) as HTMLMetaElement | null;
  
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attributeName, name);
    document.head.appendChild(element);
  }
  element.setAttribute('content', content);
}

function setCanonicalUrl(url: string) {
  if (typeof document === 'undefined') return;
  let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement('link');
    link.setAttribute('rel', 'canonical');
    document.head.appendChild(link);
  }
  link.setAttribute('href', url);
}

function setJsonLd(data: Record<string, any>) {
  if (typeof document === 'undefined') return;
  const scriptId = 'revitup-seo-jsonld';
  let script = document.getElementById(scriptId) as HTMLScriptElement | null;
  if (!script) {
    script = document.createElement('script');
    script.id = scriptId;
    script.type = 'application/ld+json';
    document.head.appendChild(script);
  }
  script.text = JSON.stringify(data);
}

export function updateSEO(seo: SEOData) {
  if (typeof document === 'undefined') return;

  const title = seo.title || DEFAULT_SEO.title!;
  const description = seo.description || DEFAULT_SEO.description!;
  const image = seo.image || DEFAULT_SEO.image!;
  const url = seo.url || (typeof window !== 'undefined' ? window.location.href : DEFAULT_SEO.url!);
  const type = seo.type || 'website';
  const keywords = seo.keywords && seo.keywords.length > 0 ? seo.keywords.join(', ') : DEFAULT_SEO.keywords!.join(', ');

  // 1. Standard HTML Title & Meta
  document.title = title;
  setMetaTag('description', description);
  setMetaTag('keywords', keywords);

  // 2. Canonical URL
  setCanonicalUrl(url);

  // 3. Open Graph (Facebook, Discord, iMessage, WhatsApp)
  setMetaTag('og:title', title, true);
  setMetaTag('og:description', description, true);
  setMetaTag('og:image', image, true);
  setMetaTag('og:url', url, true);
  setMetaTag('og:type', type, true);
  setMetaTag('og:site_name', 'RevItUp', true);

  // 4. Twitter Cards
  setMetaTag('twitter:card', 'summary_large_image');
  setMetaTag('twitter:title', title);
  setMetaTag('twitter:description', description);
  setMetaTag('twitter:image', image);

  // 5. Schema.org Structured Data (JSON-LD)
  if (seo.jsonLd) {
    setJsonLd(seo.jsonLd);
  } else {
    setJsonLd(DEFAULT_SEO.jsonLd!);
  }
}

export function resetDefaultSEO() {
  updateSEO(DEFAULT_SEO);
}

export function buildPostSEO(post: any, authorUsername?: string): SEOData {
  const author = authorUsername || post.authorUsername || 'Tuner';
  const cleanCaption = post.caption ? post.caption.replace(/(\r\n|\n|\r)/gm, ' ').trim() : 'Project Build Update';
  const previewText = cleanCaption.length > 120 ? cleanCaption.slice(0, 117) + '...' : cleanCaption;
  
  const title = `${previewText} | @${author} on RevItUp`;
  const description = `${cleanCaption} - Discover custom build updates, horsepower stats, and modification logs by @${author} on RevItUp.`;
  const image = post.thumbnailUrl || (post.mediaUrls && post.mediaUrls[0]) || post.mediaUrl || 'https://revitup.today/icon-512.png';
  const postUrl = `https://revitup.today/?p=${post.id}`;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SocialMediaPosting',
    headline: title,
    articleBody: cleanCaption,
    image: [image],
    datePublished: post.createdAt ? new Date(typeof post.createdAt === 'number' ? post.createdAt : Date.now()).toISOString() : new Date().toISOString(),
    author: {
      '@type': 'Person',
      name: author,
      url: `https://revitup.today/?ref=${author}`
    },
    publisher: {
      '@type': 'Organization',
      name: 'RevItUp',
      logo: {
        '@type': 'ImageObject',
        url: 'https://revitup.today/icon-512.png'
      }
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': postUrl
    },
    interactionStatistic: [
      {
        '@type': 'InteractionCounter',
        interactionType: 'https://schema.org/LikeAction',
        userInteractionCount: post.likesCount || 0
      },
      {
        '@type': 'InteractionCounter',
        interactionType: 'https://schema.org/CommentAction',
        userInteractionCount: post.commentsCount || 0
      }
    ]
  };

  return {
    title,
    description,
    image,
    url: postUrl,
    type: 'article',
    keywords: ['car build', author, 'automotive project', 'dyno tuning', 'RevItUp post'],
    jsonLd
  };
}

export function buildProfileSEO(profile: any, carsCount = 0): SEOData {
  const username = profile.username || 'tuner';
  const displayName = profile.displayName || `@${username}`;
  const bio = profile.bio ? profile.bio.replace(/(\r\n|\n|\r)/gm, ' ').trim() : `Check out @${username}'s virtual garage and project builds on RevItUp.`;
  
  const title = `${displayName} (@${username}) - Virtual Garage & Car Builds | RevItUp`;
  const description = `${bio} - Virtual garage featuring ${carsCount} project vehicle${carsCount === 1 ? '' : 's'}, performance specs, and modification timelines on RevItUp.`;
  const image = profile.profilePic || profile.photoURL || 'https://revitup.today/icon-512.png';
  const profileUrl = `https://revitup.today/?ref=${username}`;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    mainEntity: {
      '@type': 'Person',
      name: displayName,
      alternateName: username,
      description: bio,
      image: image,
      url: profileUrl,
      sameAs: profile.socialLinks ? Object.values(profile.socialLinks).filter(Boolean) : []
    }
  };

  return {
    title,
    description,
    image,
    url: profileUrl,
    type: 'profile',
    keywords: [username, displayName, 'virtual garage', 'car builder', 'project car specs', 'RevItUp profile'],
    jsonLd
  };
}

export function buildCarSEO(car: any, ownerUsername?: string): SEOData {
  const carName = `${car.year || ''} ${car.make || ''} ${car.model || ''}`.trim() || 'Custom Project Car';
  const stage = car.stage || 'Custom Build';
  const powerInfo = car.power ? `(${car.power} HP)` : '';
  const title = `${carName} ${powerInfo} [${stage}] - Garage Build | RevItUp`;
  
  const modsSummary = car.mods ? `Modifications: ${car.mods.slice(0, 100)}` : 'Full build specs, modifications, and performance log on RevItUp.';
  const ownerText = ownerUsername ? `built by @${ownerUsername}` : 'featured on RevItUp';
  const description = `${carName} ${stage} ${ownerText}. ${modsSummary}`;
  const image = car.coverImage || 'https://revitup.today/icon-512.png';
  const carUrl = `https://revitup.today/?car=${car.id}`;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Vehicle',
    name: carName,
    manufacturer: car.make || 'Custom',
    model: car.model || 'Build',
    vehicleModelDate: car.year ? String(car.year) : undefined,
    image: image,
    description: description,
    url: carUrl
  };

  return {
    title,
    description,
    image,
    url: carUrl,
    type: 'article',
    keywords: [car.make, car.model, 'car build', stage, 'dyno horsepower', 'virtual garage'],
    jsonLd
  };
}
