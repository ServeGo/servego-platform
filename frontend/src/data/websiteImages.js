// Single source of truth for the website's static/hero images.
// All Home-page image references import from here.
//
// The same relative Cloudinary paths (same public IDs) exist on BOTH the
// testing account (default) and the backup/production account. Set
// VITE_PUBLIC_IMAGES_CLOUD in the build environment to serve from a different
// Cloudinary — e.g. VITE_PUBLIC_IMAGES_CLOUD=qbnpjuua for backup/production.

const CLOUD_NAME = import.meta.env.VITE_PUBLIC_IMAGES_CLOUD || 'dal84gvkm';
const CLOUD_BASE = `https://res.cloudinary.com/${CLOUD_NAME}/image/upload`;

export const HERO_IMAGE_DESKTOP = `${CLOUD_BASE}/servego/public/j47zqpnzglwwelwn9ugf.jpg`;

export const HERO_IMAGE_MOBILE = `${CLOUD_BASE}/img1_m1lbe8.png`;

export const TRACKING_MAP = `${CLOUD_BASE}/servego/public/elvgllb287vgfwjjdcsg.jpg`;

export const DEFAULT_SEO_IMAGE = HERO_IMAGE_DESKTOP;