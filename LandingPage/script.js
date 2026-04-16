/* ═══════════════════════════════════════════
   RetroLab Portfolio — Interactions
   ═══════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {

  /* ── Nav Scroll Effect ───────────────────── */
  const nav = document.getElementById('main-nav');
  let lastScroll = 0;

  const onScroll = () => {
    const y = window.scrollY;
    if (y > 50) {
      nav.classList.add('scrolled');
    } else {
      nav.classList.remove('scrolled');
    }
    lastScroll = y;
  };

  window.addEventListener('scroll', onScroll, { passive: true });

  /* ── Smooth Scroll for Anchor Links ──────── */
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', e => {
      const target = document.querySelector(link.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  /* ── Active Nav Link Highlight ───────────── */
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.nav-link');

  const highlightNav = () => {
    const scrollPos = window.scrollY + 150;
    sections.forEach(section => {
      const top = section.offsetTop;
      const height = section.offsetHeight;
      const id = section.getAttribute('id');

      if (scrollPos >= top && scrollPos < top + height) {
        navLinks.forEach(link => {
          link.classList.remove('active');
          if (link.getAttribute('href') === `#${id}`) {
            link.classList.add('active');
          }
        });
      }
    });
  };

  window.addEventListener('scroll', highlightNav, { passive: true });

  /* ── Showcase Tab Switching ──────────────── */
  const tabBtns = document.querySelectorAll('.tab-btn');
  const panels = document.querySelectorAll('.showcase-panel');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tabId = btn.dataset.tab;

      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      panels.forEach(panel => {
        panel.classList.remove('active');
        if (panel.id === `panel-${tabId}`) {
          panel.classList.add('active');
        }
      });
    });
  });

  /* ── Counter Animation ───────────────────── */
  const counters = document.querySelectorAll('.stat-number[data-count]');

  const animateCounter = (el) => {
    const target = parseInt(el.dataset.count, 10);
    const duration = 2000;
    const start = performance.now();

    const easeOutExpo = t => t === 1 ? 1 : 1 - Math.pow(2, -10 * t);

    const tick = (now) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeOutExpo(progress);
      el.textContent = Math.round(target * eased);

      if (progress < 1) {
        requestAnimationFrame(tick);
      }
    };

    requestAnimationFrame(tick);
  };

  /* ── Scroll Reveal & Counter Trigger ─────── */
  const revealElements = document.querySelectorAll(
    '.problem-card, .solution-banner, .feature-row, .arch-flow, .tech-stack, ' +
    '.metric-card, .pm-card, .portfolio-card, .cta-content'
  );

  revealElements.forEach(el => el.classList.add('reveal'));

  const countersTriggered = new Set();

  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');

        // If this is the hero stats area, trigger counters
        if (entry.target.closest('.hero-stats') || entry.target.classList.contains('hero-stats')) {
          counters.forEach(counter => {
            if (!countersTriggered.has(counter)) {
              countersTriggered.add(counter);
              animateCounter(counter);
            }
          });
        }
      }
    });
  }, {
    threshold: 0.15,
    rootMargin: '0px 0px -50px 0px'
  });

  revealElements.forEach(el => revealObserver.observe(el));

  /* ── Counter observer (separate for hero) ── */
  const heroStats = document.querySelector('.hero-stats');
  if (heroStats) {
    const statsObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          counters.forEach(counter => {
            if (!countersTriggered.has(counter)) {
              countersTriggered.add(counter);
              animateCounter(counter);
            }
          });
          statsObserver.disconnect();
        }
      });
    }, { threshold: 0.5 });
    statsObserver.observe(heroStats);
  }

  /* ── Staggered reveal for grid items ─────── */
  const staggerContainers = document.querySelectorAll(
    '.problems-grid, .metrics-grid, .pm-grid, .tech-grid'
  );

  staggerContainers.forEach(container => {
    const items = container.children;
    Array.from(items).forEach((item, i) => {
      item.style.transitionDelay = `${i * 0.08}s`;
    });
  });

  /* ── Parallax on hero glows ──────────────── */
  const glows = document.querySelectorAll('.hero-glow');
  let rafId = null;

  const onMouseMove = (e) => {
    if (rafId) return;
    rafId = requestAnimationFrame(() => {
      const x = (e.clientX / window.innerWidth - 0.5) * 2;
      const y = (e.clientY / window.innerHeight - 0.5) * 2;

      glows.forEach((glow, i) => {
        const factor = (i + 1) * 15;
        glow.style.transform = `translate(${x * factor}px, ${y * factor}px)`;
      });
      rafId = null;
    });
  };

  window.addEventListener('mousemove', onMouseMove, { passive: true });

});
