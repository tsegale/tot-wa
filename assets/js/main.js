// TOT WA: shared site behaviour (nav, ticket search toggle, footer year)

const header = document.getElementById('siteHeader');
if (header) {
  window.addEventListener('scroll', () => {
    header.classList.toggle('scrolled', window.scrollY > 40);
  }, { passive: true });
}

const menuToggle = document.getElementById('menuToggle');
const navLinks = document.getElementById('navLinks');
if (menuToggle && navLinks) {
  menuToggle.addEventListener('click', () => {
    const isOpen = navLinks.classList.toggle('open');
    menuToggle.setAttribute('aria-expanded', String(isOpen));
  });
  navLinks.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
    navLinks.classList.remove('open');
    menuToggle.setAttribute('aria-expanded', 'false');
  }));
}

// Transfers nav dropdown: CSS handles hover/focus reveal, this handles
// click-toggle plus closing on outside click or Escape.
const transfersDropdown = document.getElementById('transfersDropdown');
const transfersToggle = document.getElementById('transfersToggle');
if (transfersDropdown && transfersToggle) {
  const closeTransfersDropdown = () => {
    transfersDropdown.classList.remove('open');
    transfersToggle.setAttribute('aria-expanded', 'false');
  };
  transfersToggle.addEventListener('click', () => {
    const isOpen = transfersDropdown.classList.toggle('open');
    transfersToggle.setAttribute('aria-expanded', String(isOpen));
  });
  document.addEventListener('click', (e) => {
    if (!transfersDropdown.contains(e.target)) closeTransfersDropdown();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && transfersDropdown.classList.contains('open')) {
      closeTransfersDropdown();
      transfersToggle.focus();
    }
  });
}

// Ticket search card: Transfer / Tour & Safari mode toggle
const tabButtons = document.querySelectorAll('.tab-btn');
const fieldSets = document.querySelectorAll('.field-set');
tabButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    tabButtons.forEach(b => b.classList.remove('active'));
    fieldSets.forEach(f => f.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(btn.dataset.target).classList.add('active');
  });
});

const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = new Date().getFullYear();

const contactForm = document.getElementById('contactForm');
if (contactForm) {
  const formNote = document.getElementById('formNote');
  const submitBtn = contactForm.querySelector('button[type="submit"]');

  const setNote = (text, state) => {
    formNote.textContent = text;
    formNote.classList.remove('success', 'error');
    if (state) formNote.classList.add(state);
    formNote.hidden = false;
  };

  contactForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    submitBtn.disabled = true;
    setNote('Sending…');

    const payload = Object.fromEntries(new FormData(contactForm).entries());

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json();

      if (response.ok && result.ok) {
        setNote("Message sent. We'll get back to you within one business day.", 'success');
        contactForm.reset();
      } else {
        setNote(result.error || "Couldn't send your message. Please try again, or email info@tot-wa.com directly.", 'error');
      }
    } catch (err) {
      setNote("Couldn't reach the server. Please try again, or email info@tot-wa.com directly.", 'error');
    } finally {
      submitBtn.disabled = false;
    }
  });
}

// EASYOTA PLACEHOLDER: "Check availability" / "Book now" CTAs currently
// point at #book or book.totwa.com as a placeholder. Once EasyOTA delivers
// the embed code, wire it in here (likely an iframe modal or a redirect to
// the book.totwa.com subdomain already CNAMEd to web.easyota.com).
