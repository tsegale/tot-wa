// TOT WA: business facts shared by the pages and the build scripts.
// Null fields are waiting on the client; the UI hides them. See CONTENT-TODO.md.

const SITE_CONFIG = {
  name: 'Tot Wa Tours & Transfers',
  origin: 'https://tot-wa.com',
  phone: '+264816008766',
  phoneDisplay: '+264 81 600 8766',
  whatsappNumber: '264816008766',
  email: 'info@tot-wa.com',
  physicalAddress: {
    street: '14 Lenie Street',
    suburb: 'Ludwigsdorf',
    city: 'Windhoek',
    postalCode: '10005',
    country: 'NA',
  },
  postalAddress: 'P.O. Box 9332 Eros, Windhoek, Namibia',
  ntbRegistration: 'TSO 01268',
  hours: null, // e.g. 'Mon to Fri, 08:00 to 17:00'. Hidden until supplied.
};

if (typeof module !== 'undefined') module.exports = SITE_CONFIG;
