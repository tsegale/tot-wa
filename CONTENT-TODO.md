# Content still needed from Tot Wa

For Etienne. Everything below is left empty on purpose: the site never shows made-up
prices, capacities, reviews or itineraries. Each item says where it goes and what the
site does until it arrives. After editing a data file, run `npm run build` (plus
`npm run build:images` if you add photos or video).

## Every page

- [ ] **Business hours.** `assets/js/site-config.js`, field `hours` (for example
  `'Mon to Fri, 08:00 to 17:00'`). Until then the hours line on the Contact page is hidden.

## Home

- [ ] **Three real review quotes, the TripAdvisor URL, rating and review count.**
  `assets/js/reviews-data.js`, fields `quotes` (`[{ text, author, date }]`), `url`,
  `rating`, `count`. These are only a fallback for when the Elfsight widget fails to
  load. Until then: if the widget fails, the reviews section hides itself. The trust bar
  gains a fifth "rating" stat only once `rating` and `count` are both filled.
- [ ] **Hero video footage (optional).** Drop `hero.webm` and `hero.mp4` into
  `assets/video/`, then uncomment the `<video>` block in `index.html`. Until then the
  hero shows the still photo.
- [ ] **Editorial serif (optional).** If you want a serif for long-form text, approve a
  typeface and set `--editorial` in `assets/css/style.css`. Until then headings use
  Abel Pro.

## Tours & safaris and the five tour pages

All in `assets/js/tours-data.js`, one entry per package.

- [ ] **Final prices.** Set `priceConfirmed: true` on each package once its `price` is
  final. Until then prices show "From N$..." with "Guide price", and one footnote
  ("Guide prices per person sharing, confirmed at booking.") appears under the route lists.
- [ ] **Departure days.** `departureWeekdays`, for example `[1]` for Mondays
  (0 is Sunday). Until then tour pages say "Any date" and accept any date.
- [ ] **Group size.** `groupSize`. Until then it is hidden, and the travelers stepper
  allows up to 12.
- [ ] **Single supplement.** `singleSupplement` (N$). Until then a single traveler's
  total is just the per-person price.
- [ ] **Day-by-day itinerary.** `days`:
  `[{ day, title, driveHours, km, overnight, meals: 'B,L,D', body, stopIndex }]`.
  `stopIndex` points into `stops` so the map highlights that stop. Until then tour pages
  show a "Route overview" (map plus stop list) with no day-by-day accordion.
- [ ] **Inclusions and exclusions.** `inclusions`, `exclusions` (lists of short
  phrases). Until then the "What's included" section is hidden.
- [ ] **Good to know.** `goodToKnow` (list of short notes). Until then hidden.
- [ ] **Himba Living Museum.** Listed as a highlight of the 10-day route but not in its
  route (Sossusvlei, Swakopmund, Damaraland, Etosha, Windhoek). Confirm whether it
  belongs on that route, and its exact location. Until then it stays a highlight chip
  but is not plotted on the map.

## Airport and private transfers

In `assets/js/transfers-data.js`.

- [ ] **Airport fares.** `fares.windhoekAirport.hkia` and `.eros` (N$ per vehicle), then
  set `fareConfirmed`. Until then the drop-off field says "Windhoek airport transfer.
  Fixed fare, confirmed when you book." and the fares table stays hidden.
- [ ] **Outbound fares.** `fares.outbound`. Until then outbound drop-offs say "We'll
  quote it for you."
- [ ] **Fleet capacity.** `fleet[].seats` and `fleet[].bags` for the 4x4 Double Cab,
  4x4 SUV and Minibus. Until then the fleet cards show the vehicle type only.
- [ ] **Suburb list near-duplicates.** The Terms list both "Okuryangava" and
  "Okuyarangava", and both "Southern Industrial" and "Southern Industrial Area". The site
  treats the second of each pair as an alias of the first. Confirm the correct spellings
  (and update `terms.html` if the Terms should change).

## Maps

- [ ] **Namibia outline source.** No action needed: `assets/images/namibia-outline.svg`
  is projected from Natural Earth 1:50m admin-0 countries (public domain), not
  hand-traced. Listed here only so the source is on record.

## Booking

- [ ] **EasyOTA embed.** When EasyOTA sends the booking URL, set `easyotaUrl` in
  `assets/js/booking.js`. Until then every "Check availability" button offers
  "Continue on WhatsApp" or "Send an inquiry".
