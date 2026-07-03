import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const DEFAULT_ICONS = {
  favicon32: '/favicon-32.png',
  favicon16: '/favicon-16.png',
  appleTouchIcon: '/apple-touch-icon.png',
  manifest: '/manifest.webmanifest',
};

// Lock-badged variant of the same icon, swapped in specifically for /login
// so a home-screen shortcut to the staff login is visually distinct from
// the public site's shortcut.
const LOGIN_ICONS = {
  favicon32: '/favicon-login-32.png',
  favicon16: '/favicon-login-32.png',
  appleTouchIcon: '/apple-touch-icon-login.png',
  manifest: '/manifest-login.webmanifest',
};

function setLinkHref(rel, sizes, href) {
  const selector = sizes ? `link[rel="${rel}"][sizes="${sizes}"]` : `link[rel="${rel}"]`;
  const el = document.querySelector(selector);
  if (el) el.setAttribute('href', href);
}

// Renders nothing — just keeps the document head's icon/manifest links in
// sync with the current route so "Add to Home Screen" picks up the right
// icon depending on whether you're adding the public site or /login.
export function DynamicHeadIcons() {
  const location = useLocation();

  useEffect(() => {
    const icons = location.pathname === '/login' ? LOGIN_ICONS : DEFAULT_ICONS;
    setLinkHref('icon', '32x32', icons.favicon32);
    setLinkHref('icon', '16x16', icons.favicon16);
    setLinkHref('apple-touch-icon', null, icons.appleTouchIcon);
    setLinkHref('manifest', null, icons.manifest);
  }, [location.pathname]);

  return null;
}
