// TOT WA: reviews section. Shows a skeleton until the lazy Elfsight widget
// renders. If it hasn't rendered 6s after the section scrolls into view,
// falls back to REVIEWS_DATA: quote cards, else a link card, else the
// section is hidden. Also adds the trust-bar rating when real data exists.

(function () {
  const { TotWa } = window;
  const section = document.getElementById('reviews');
  const widget = document.querySelector('[class^="elfsight-app-"]');
  const skeleton = document.getElementById('reviewsSkeleton');
  const fallback = document.getElementById('reviewsFallback');
  const data = typeof REVIEWS_DATA !== 'undefined' ? REVIEWS_DATA : null;

  // Trust bar: a fifth stat only if a real rating and count exist.
  const statsGrid = document.getElementById('statsGrid');
  if (statsGrid && data && data.rating != null && data.count != null) {
    const stat = document.createElement('div');
    stat.className = 'stat';
    stat.innerHTML = `<div class="stat-num">${TotWa.escapeHtml(data.rating)}</div>
      <div class="stat-label">Average rating on ${TotWa.escapeHtml(data.platform)},<br>from ${TotWa.escapeHtml(data.count)} reviews</div>`;
    statsGrid.appendChild(stat);
  }

  if (!section || !widget) return;

  let rendered = false;
  const markRendered = () => {
    if (rendered) return;
    rendered = true;
    if (skeleton) skeleton.remove();
    fallback.hidden = true;
    section.hidden = false;
  };
  const hasContent = () => widget.children.length > 0 || widget.shadowRoot;
  if (hasContent()) markRendered();
  new MutationObserver(() => { if (hasContent()) markRendered(); })
    .observe(widget, { childList: true, subtree: true });

  const renderFallback = () => {
    if (rendered || !data) return;
    if (skeleton) skeleton.remove();
    if (data.quotes.length) {
      fallback.innerHTML = `<div class="review-cards">${data.quotes.map((q) => `
        <figure class="review-card">
          <blockquote><p>${TotWa.escapeHtml(q.text)}</p></blockquote>
          <figcaption><cite>${TotWa.escapeHtml(q.author || '')}${q.date ? `, ${TotWa.escapeHtml(q.date)}` : ''}</cite></figcaption>
        </figure>`).join('')}</div>`;
      fallback.hidden = false;
    } else if (data.url) {
      fallback.innerHTML = `<div class="review-link-card card-hover">
        <a class="card-link text-link" href="${TotWa.escapeHtml(data.url)}" target="_blank" rel="noopener">Read our reviews on ${TotWa.escapeHtml(data.platform)}</a>
      </div>`;
      fallback.hidden = false;
    } else {
      section.hidden = true;
    }
  };

  // The widget is lazy (it loads when scrolled to), so the 6s clock starts
  // when the section first comes into view, not at page load.
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      io.disconnect();
      setTimeout(renderFallback, 6000);
    }, { rootMargin: '200px 0px' });
    io.observe(section);
  } else {
    setTimeout(renderFallback, 6000);
  }
})();
