// TOT WA: single source of truth for tour packages. Prices and
// priceConfirmed are read client-side by tours-pricing.js, so a price change
// here needs no rebuild. Static content (names, routes, highlights, stops)
// is inlined into the tour detail pages by scripts/build-tours.js, so a
// change to those fields needs `npm run build`.
//
// Fields left null or empty are waiting on the client. The UI hides
// whatever is missing. See CONTENT-TODO.md before filling anything in.

const TOUR_STOPS = {
  windhoek: { name: 'Windhoek', lat: -22.56, lng: 17.08 },
  sossusvlei: { name: 'Sossusvlei', lat: -24.73, lng: 15.29 },
  sesriem: { name: 'Sesriem', lat: -24.49, lng: 15.8 },
  walvisBay: { name: 'Walvis Bay', lat: -22.96, lng: 14.51 },
  swakopmund: { name: 'Swakopmund', lat: -22.68, lng: 14.53 },
  twyfelfontein: { name: 'Twyfelfontein', lat: -20.59, lng: 14.37 },
  // Damaraland is a region; Khorixas stands in as its map point.
  damaraland: { name: 'Damaraland', lat: -20.37, lng: 14.97 },
  // Etosha is a park; Okaukuejo stands in as its map point.
  etosha: { name: 'Etosha', lat: -19.18, lng: 15.92 },
};

const TWYFELFONTEIN_CREDIT = {
  author: 'Schnobby',
  license: 'CC BY-SA 3.0',
  url: 'https://commons.wikimedia.org/wiki/File:Giraffe,_Twyfelfontein.jpg',
};

const TOUR_IMAGES = {
  sossusvlei: {
    src: 'assets/images/tours-safaris/sossusvlei-dunes.webp',
    alt: 'Petrified camel thorn trees at Deadvlei against the red dunes of Sossusvlei',
  },
  etosha: {
    src: 'assets/images/tours-safaris/etosha-game-drive.webp',
    alt: 'Guests on an open-vehicle game drive through the Namibian bush',
  },
  walvisBay: {
    src: 'assets/images/tours-safaris/walvis-bay-coast.webp',
    alt: 'Sand dunes meeting the Atlantic Ocean at Sandwich Harbour, near Walvis Bay',
  },
  twyfelfontein: {
    src: 'assets/images/tours-safaris/twyfelfontein-rock-art.webp',
    alt: 'Ancient giraffe rock engraving at Twyfelfontein',
    credit: TWYFELFONTEIN_CREDIT,
  },
  swakopmund: {
    src: 'assets/images/tours-safaris/swakopmund-seafront.webp',
    alt: "Swakopmund's jetty stretching into the Atlantic under a clear sky",
  },
};

// Itinerary and logistics fields shared by every package until the client
// supplies them. Spread first, then override per package.
const TOUR_PENDING = {
  days: [], // [{ day, title, driveHours, km, overnight, meals:'B,L,D', body, stopIndex }]
  inclusions: [],
  exclusions: [],
  goodToKnow: [],
  groupSize: null,
  departureWeekdays: null, // e.g. [1] for Mondays; null means any date
  singleSupplement: null, // N$
};

const TOUR_PACKAGES = {
  '5-day-south': {
    ...TOUR_PENDING,
    slug: '5-day-southbound',
    name: '5-Day Southbound',
    shortName: 'Southbound',
    direction: 'south',
    route: 'Windhoek → Sossusvlei → Namib Desert → return',
    duration: 5,
    price: 30000, // N$, per person sharing. PROVISIONAL, pending client sign-off
    priceConfirmed: false,
    image: TOUR_IMAGES.sossusvlei,
    gallery: [TOUR_IMAGES.sossusvlei],
    highlights: ['Sossusvlei dunes', 'Sesriem', 'Namib Desert'],
    stops: [TOUR_STOPS.windhoek, TOUR_STOPS.sossusvlei, TOUR_STOPS.windhoek],
  },
  '5-day-north': {
    ...TOUR_PENDING,
    slug: '5-day-northbound',
    name: '5-Day Northbound',
    shortName: 'Northbound',
    direction: 'north',
    route: 'Windhoek → Etosha National Park → return',
    duration: 5,
    price: 30000,
    priceConfirmed: false,
    image: TOUR_IMAGES.etosha,
    gallery: [TOUR_IMAGES.etosha],
    highlights: ['Etosha game drives', 'Waterhole viewing'],
    stops: [TOUR_STOPS.windhoek, TOUR_STOPS.etosha, TOUR_STOPS.windhoek],
  },
  '7-day-south': {
    ...TOUR_PENDING,
    slug: '7-day-southbound',
    name: '7-Day Southbound',
    shortName: 'Southbound',
    direction: 'south',
    route: 'Windhoek → Sossusvlei → Sesriem → Walvis Bay → return',
    duration: 7,
    price: 44000,
    priceConfirmed: false,
    image: TOUR_IMAGES.walvisBay,
    gallery: [TOUR_IMAGES.walvisBay, TOUR_IMAGES.sossusvlei],
    highlights: ['Sossusvlei dunes', 'Sesriem Canyon', 'Walvis Bay coast'],
    stops: [TOUR_STOPS.windhoek, TOUR_STOPS.sossusvlei, TOUR_STOPS.sesriem, TOUR_STOPS.walvisBay, TOUR_STOPS.windhoek],
  },
  '7-day-north': {
    ...TOUR_PENDING,
    slug: '7-day-northbound',
    name: '7-Day Northbound',
    shortName: 'Northbound',
    direction: 'north',
    route: 'Windhoek → Damaraland → Twyfelfontein → Etosha → return',
    duration: 7,
    price: 44000,
    priceConfirmed: false,
    image: TOUR_IMAGES.twyfelfontein,
    gallery: [TOUR_IMAGES.twyfelfontein, TOUR_IMAGES.etosha],
    highlights: ['Twyfelfontein rock art', 'Damaraland', 'Etosha game drives'],
    stops: [TOUR_STOPS.windhoek, TOUR_STOPS.damaraland, TOUR_STOPS.twyfelfontein, TOUR_STOPS.etosha, TOUR_STOPS.windhoek],
  },
  '10-day-best': {
    ...TOUR_PENDING,
    slug: '10-day-namibias-best',
    name: "10-Day Namibia's Best",
    shortName: "Namibia's Best",
    direction: 'loop',
    route: 'Sossusvlei → Swakopmund → Damaraland → Etosha → Windhoek',
    duration: 10,
    price: 63000,
    priceConfirmed: false,
    image: TOUR_IMAGES.swakopmund,
    gallery: [TOUR_IMAGES.swakopmund, TOUR_IMAGES.sossusvlei, TOUR_IMAGES.etosha],
    // Himba Living Museum is a highlight but not on the route string, and
    // its location is unconfirmed, so it stays out of stops. See CONTENT-TODO.
    highlights: ['Sossusvlei dunes', 'Swakopmund', 'Twyfelfontein', 'Himba Living Museum', 'Etosha'],
    stops: [TOUR_STOPS.sossusvlei, TOUR_STOPS.swakopmund, TOUR_STOPS.damaraland, TOUR_STOPS.etosha, TOUR_STOPS.windhoek],
  },
  custom: {
    ...TOUR_PENDING,
    slug: 'custom',
    name: 'Build your own',
    shortName: 'Build your own',
    direction: 'custom',
    route: 'Flexible, built around your dates and interests',
    duration: null,
    price: null,
    priceConfirmed: false,
    image: null,
    gallery: [],
    highlights: ['Your dates', 'Your pace', 'Your stops'],
    stops: [],
    href: 'contact.html?service=custom-tour',
  },
};

if (typeof module !== 'undefined') module.exports = TOUR_PACKAGES;
