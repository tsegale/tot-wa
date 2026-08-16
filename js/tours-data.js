// TOT WA: single source of truth for tour package pricing. Update a price
// or flip priceConfirmed here, every page that reads it (via js/tours-pricing.js)
// picks it up automatically, no template edits needed.
const TOUR_PACKAGES = {
  "5-day-south": {
    name: "5-Day Southbound",
    route: "Windhoek → Sossusvlei → Namib Desert → return",
    days: 5,
    price: 30000, // N$, per person sharing — PROVISIONAL, pending Etienne sign-off
    priceConfirmed: false,
  },
  "5-day-north": {
    name: "5-Day Northbound",
    route: "Windhoek → Etosha National Park → return",
    days: 5,
    price: 30000,
    priceConfirmed: false,
  },
  "7-day-south": {
    name: "7-Day Southbound",
    route: "Windhoek → Sossusvlei → Sesriem → Walvis Bay → return",
    days: 7,
    price: 44000,
    priceConfirmed: false,
  },
  "7-day-north": {
    name: "7-Day Northbound",
    route: "Windhoek → Damaraland → Twyfelfontein → Etosha → return",
    days: 7,
    price: 44000,
    priceConfirmed: false,
  },
  "10-day-best": {
    name: "Namibia's Best (10 Days)",
    route: "Sossusvlei → Swakopmund → Damaraland → Etosha → Windhoek",
    days: 10,
    price: 63000,
    priceConfirmed: false,
  },
  "custom": {
    name: "Build Your Own",
    route: "Flexible, built around your dates and interests",
    days: null,
    price: null,
    priceConfirmed: false,
  },
};
