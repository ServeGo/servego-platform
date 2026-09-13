/**
 * Home page image constants.
 *
 * All placeholder URLs are collected here so they can be swapped for real
 * photographs in one place. Replace each URL with a path like
 * `/home/hero.jpg` once actual assets are added to `public/home/`.
 */

// ── Hero ─────────────────────────────────────────────────────────────────────
export const HERO_BG =
  'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=1920&q=80';

// ── Verified Specialists On Demand (category cards) ──────────────────────────
export const CATEGORY_IMAGES = {
  'AC Repair': 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=700&q=85',
  'AC Repair & Service': 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=700&q=85',
  'Deep Home Cleaning': 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=700&q=85',
  'Deep Cleaning': 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=700&q=85',
  'Home Cleaning': 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?auto=format&fit=crop&w=700&q=85',
  Cleaning: 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?auto=format&fit=crop&w=700&q=85',
  Electrician: 'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?auto=format&fit=crop&w=700&q=85',
  'Electrical Repair': 'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?auto=format&fit=crop&w=700&q=85',
  Plumber: 'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?auto=format&fit=crop&w=700&q=85',
  Plumbing: 'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?auto=format&fit=crop&w=700&q=85',
  Carpentry: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&w=700&q=85',
  'Furniture Assembly': 'https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&w=700&q=85',
  Chef: 'https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=700&q=85',
  'Home Chef': 'https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=700&q=85',
  Cooking: 'https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=700&q=85',
  cooking: 'https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=700&q=85',
  Painting:
    'https://images.unsplash.com/photo-1562259929-b4e1fd3aef09?auto=format&fit=crop&w=600&q=80',
  'Appliance Repair': 'https://res.cloudinary.com/dal84gvkm/image/upload/v1789329517/servego/public/libj5xwayqp6hdxhw3pd.png',
  'Home Maintenance':
    'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=600&q=80',
};

// Fallback when a category name doesn't have a dedicated image
export const CATEGORY_FALLBACK =
  'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=600&q=80';

export function getCategoryImage(name) {
  const normalizedName = String(name || '').trim().toLowerCase();
  const key = Object.keys(CATEGORY_IMAGES).find((item) => item.toLowerCase() === normalizedName);
  return key ? CATEGORY_IMAGES[key] : CATEGORY_FALLBACK;
}

// ── Live Tracking Showcase ───────────────────────────────────────────────────
export const TRACKING_MAP = 'https://res.cloudinary.com/dal84gvkm/image/upload/v1789329516/servego/public/elvgllb287vgfwjjdcsg.jpg';
export const TRACKING_PHONE =
  'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?auto=format&fit=crop&w=400&q=80';

// ── Before & After Proof ─────────────────────────────────────────────────────
export const BEFORE_AFTER = [
  {
    title: 'Spotless Finishes, Visible Transformation',
    image: 'https://res.cloudinary.com/dal84gvkm/image/upload/v1789329513/servego/public/dspaonzfvlyo7hxbynca.jpg',
  },
  {
    title: 'Gleaming Surfaces, Deep-Cleaned & Shiny',
    image: 'https://res.cloudinary.com/dal84gvkm/image/upload/v1789329513/servego/public/yj66iurcnlmx6t3r8gzc.jpg',
  },
];

// ── Coverage Area ────────────────────────────────────────────────────────────
export const COVERAGE_IMAGE = 'https://res.cloudinary.com/dal84gvkm/image/upload/v1789329503/servego/public/rca7ba3hy5gdgp27q1tp.jpg';

// ── Quality Audit ────────────────────────────────────────────────────────────
export const AUDIT_IMAGES = [
  'https://res.cloudinary.com/dal84gvkm/image/upload/v1789329284/servego/images/quality-audit-background-verification.jpg',
  'https://res.cloudinary.com/dal84gvkm/image/upload/v1789329285/servego/images/quality-audit-skills-assessment.jpg',
  'https://res.cloudinary.com/dal84gvkm/image/upload/v1789329286/servego/images/quality-audit-safety-compliance.jpg',
  'https://res.cloudinary.com/dal84gvkm/image/upload/v1789329287/servego/images/quality-audit-on-job-supervision.jpg',
  'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?auto=format&fit=crop&w=400&q=80',
];

// ── Quality Guarantee ────────────────────────────────────────────────────────
export const GUARANTEE_IMAGES = [
  'https://res.cloudinary.com/dal84gvkm/image/upload/v1789329501/servego/public/w3iudhvztzn8ffipdtbb.jpg',
  'https://res.cloudinary.com/dal84gvkm/image/upload/v1789329502/servego/public/p5mhyrbya0xu6pc4pcod.jpg',
  'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?auto=format&fit=crop&w=600&q=80',
];

// ── Family Moments ───────────────────────────────────────────────────────────
export const FAMILY_IMAGES = [
  'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1600573472550-8090b5e0745e?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=600&q=80',
];

// ── Provider CTA ─────────────────────────────────────────────────────────────
export const PROVIDER_CTA_IMAGES = [
  'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1600880292089-90a7e086ee0c?auto=format&fit=crop&w=600&q=80',
];

// ── Customer Reviews (static placeholder data) ──────────────────────────────
export const PLACEHOLDER_REVIEWS = [
  {
    name: 'Priya Sharma',
    rating: 5,
    text: 'Amazing service! The electrician arrived within 20 minutes and fixed everything perfectly. Very professional and clean work.',
    service: 'Electrician',
    date: '2 days ago',
  },
  {
    name: 'Rahul Reddy',
    rating: 5,
    text: 'Booked a deep cleaning service for my 3BHK. The team was thorough, on time, and left my home sparkling. Highly recommend!',
    service: 'Deep Home Cleaning',
    date: '5 days ago',
  },
  {
    name: 'Ananya Krishnan',
    rating: 4,
    text: 'Good experience with the AC repair. Technician was knowledgeable and explained the issue clearly before starting work.',
    service: 'AC Repair',
    date: '1 week ago',
  },
  {
    name: 'Sanjay Rao',
    rating: 5,
    text: 'The plumber arrived quickly and fixed a major leak. Fair pricing and excellent workmanship. Will definitely use again.',
    service: 'Plumber',
    date: '3 days ago',
  },
];
