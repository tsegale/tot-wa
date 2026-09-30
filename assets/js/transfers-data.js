// TOT WA: transfer data. Fares and fleet capacities are null until the
// client confirms them; the UI hides or softens anything missing. See
// CONTENT-TODO.md.
//
// EasyOTA books airport transfers between HKIA or Eros and Windhoek or
// Dordabis only. Every Windhoek suburb shares one flat airport fare (the
// guest gives the exact address in the booking notes), so the suburb list
// and fare line are information for the guest, not a price lookup.

const TRANSFER_DATA = {
  airports: [
    { id: 'hkia', name: 'Hosea Kutako Intl. (HKIA)' },
    { id: 'eros', name: 'Eros Airport' },
  ],
  // The Terms "Windhoek suburbs" definition, verbatim, in the same order.
  // No exact duplicates exist. Near-duplicates are kept as aliases below
  // (they still match when typed) and are flagged in CONTENT-TODO.md.
  windhoekSuburbs: [
    'Academia', 'Auas View', 'Auasblick', 'Avis', 'Cimbebasia', 'Dorado Park',
    'Eros', 'Eros Park', 'Goreangab', 'Hakahana', 'Hochland Park', 'Hochland Rand',
    'Katutura', 'Khomasdal', 'Klein Windhoek', 'Kleine Kuppe', 'Lafrenz',
    'Ludwigsdorf', 'Luxury Hill', 'Northern Industrial', 'Okuryangava', 'Olympia',
    'Ongos', 'Otjomuise', 'Pioneers Park', 'Prosperita', 'Rhino Park', 'Rocky Crest',
    'Southern Industrial', 'Suiderhof', 'Tauben Glen', 'Wanaheda',
    'Windhoek Central', 'Windhoek Country Club', 'Windhoek East', 'Windhoek North',
    'Windhoek South', 'Windhoek West',
  ],
  suburbAliases: {
    Okuyarangava: 'Okuryangava',
    'Southern Industrial Area': 'Southern Industrial',
  },
  // Outside Windhoek but bookable in EasyOTA as an airport transfer
  // destination, so never labelled as an outbound transfer.
  bookableAreas: ['Dordabis'],
  fares: {
    // One fare per airport, per vehicle, shared by every Windhoek suburb.
    windhoekAirport: { hkia: null, eros: null, currency: 'NAD', per: 'vehicle' },
    outbound: null,
  },
  fareConfirmed: false,
  fleet: [
    { type: '4x4 Double Cab', seats: null, bags: null },
    { type: '4x4 SUV', seats: null, bags: null },
    { type: 'Minibus', seats: null, bags: null },
  ],
};

if (typeof module !== 'undefined') module.exports = TRANSFER_DATA;
