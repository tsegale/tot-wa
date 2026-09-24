// TOT WA: static review fallback, used only if the Elfsight widget fails to
// render. Never invent quotes, a rating or a count: leave them null / empty
// until the client supplies real ones (see CONTENT-TODO.md).
// quotes: [{ text, author, date }]

const REVIEWS_DATA = {
  platform: 'TripAdvisor',
  url: null,
  rating: null, // e.g. 4.9
  count: null, // e.g. 120
  quotes: [],
};
