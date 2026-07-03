// Rewrites the tagged <title>/icon/OG elements in the built index.html for
// routes that need different sharing metadata than the default (currently
// just /login). This matters because link-preview generators (iMessage,
// etc.) fetch the raw HTML and never execute client JS, so a purely
// client-side icon swap (see DynamicHeadIcons.jsx) only affects "Add to
// Home Screen", not what a shared link previews as.

const LOGIN_OVERRIDES = {
  title: 'Talent Hub — Staff Login',
  icon32: '/favicon-login-32.png',
  icon16: '/favicon-login-32.png',
  appleIcon: '/apple-touch-icon-login.png',
  manifest: '/manifest-login.webmanifest',
  appleTitle: 'Talent Hub Staff',
  ogTitle: 'Talent Hub — Staff Login',
  ogDescription: 'Admin login for Talent Hub.',
  ogImage: '/icon-login-512.png',
};

function escapeAttr(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function replaceTagContent(html, id, newContent) {
  const re = new RegExp(`(<[a-z]+ id="${id}"[^>]*>)([^<]*)(</[a-z]+>)`, 'i');
  return html.replace(re, (_m, open, _old, close) => `${open}${escapeAttr(newContent)}${close}`);
}

function replaceTagAttr(html, id, attr, newValue) {
  const re = new RegExp(`(<[a-z]+ id="${id}"[^>]*\\s${attr}=")[^"]*(")`, 'i');
  return html.replace(re, (_m, open, close) => `${open}${escapeAttr(newValue)}${close}`);
}

export function renderLoginHtml(rawHtml) {
  let html = rawHtml;
  html = replaceTagContent(html, 'page-title', LOGIN_OVERRIDES.title);
  html = replaceTagAttr(html, 'icon-32', 'href', LOGIN_OVERRIDES.icon32);
  html = replaceTagAttr(html, 'icon-16', 'href', LOGIN_OVERRIDES.icon16);
  html = replaceTagAttr(html, 'apple-icon', 'href', LOGIN_OVERRIDES.appleIcon);
  html = replaceTagAttr(html, 'manifest-link', 'href', LOGIN_OVERRIDES.manifest);
  html = replaceTagAttr(html, 'apple-title', 'content', LOGIN_OVERRIDES.appleTitle);
  html = replaceTagAttr(html, 'og-title', 'content', LOGIN_OVERRIDES.ogTitle);
  html = replaceTagAttr(html, 'og-description', 'content', LOGIN_OVERRIDES.ogDescription);
  html = replaceTagAttr(html, 'og-image', 'content', LOGIN_OVERRIDES.ogImage);
  html = replaceTagAttr(html, 'twitter-title', 'content', LOGIN_OVERRIDES.ogTitle);
  html = replaceTagAttr(html, 'twitter-description', 'content', LOGIN_OVERRIDES.ogDescription);
  html = replaceTagAttr(html, 'twitter-image', 'content', LOGIN_OVERRIDES.ogImage);
  return html;
}
