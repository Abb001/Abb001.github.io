document.addEventListener('DOMContentLoaded', function () {
  var root = document.documentElement;

  // Theme toggle
  var themeToggle = document.getElementById('themeToggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', function () {
      var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      try { localStorage.setItem('theme', next); } catch (e) {}
    });
  }

  // Mobile nav toggle
  var navToggle = document.getElementById('navToggle');
  var mainNav = document.getElementById('mainNav');
  if (navToggle && mainNav) {
    navToggle.addEventListener('click', function () {
      var isOpen = mainNav.classList.toggle('open');
      navToggle.setAttribute('aria-expanded', isOpen);
    });
    mainNav.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () { mainNav.classList.remove('open'); });
    });
  }

  // Header scroll shadow
  var header = document.getElementById('siteHeader');
  if (header) {
    window.addEventListener('scroll', function () {
      header.classList.toggle('scrolled', window.scrollY > 20);
    }, { passive: true });
  }

  // Scroll reveal (with a safety-net timeout so content is never stuck invisible
  // if the observer's first callback is delayed)
  var revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && revealEls.length) {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });
    revealEls.forEach(function (el) { observer.observe(el); });
    setTimeout(function () {
      revealEls.forEach(function (el) { el.classList.add('visible'); });
    }, 1200);
  } else {
    revealEls.forEach(function (el) { el.classList.add('visible'); });
  }

  // Tilt + cursor spotlight (hybrid glass touch)
  document.querySelectorAll('.tilt').forEach(function (el) {
    el.addEventListener('mousemove', function (e) {
      var rect = el.getBoundingClientRect();
      var x = e.clientX - rect.left;
      var y = e.clientY - rect.top;
      var px = (x / rect.width) * 100;
      var py = (y / rect.height) * 100;
      var rx = ((y / rect.height) - 0.5) * -8;
      var ry = ((x / rect.width) - 0.5) * 8;
      el.style.setProperty('--mx', px + '%');
      el.style.setProperty('--my', py + '%');
      el.style.transform = 'perspective(900px) rotateX(' + rx + 'deg) rotateY(' + ry + 'deg)';
    });
    el.addEventListener('mouseleave', function () {
      el.style.transform = 'perspective(900px) rotateX(0deg) rotateY(0deg)';
    });
  });

  // Filter chips (dev projects + fine art)
  function setupFilter(barId, itemsSelector) {
    var bar = document.getElementById(barId);
    if (!bar) return;
    var items = document.querySelectorAll(itemsSelector);
    bar.addEventListener('click', function (e) {
      var chip = e.target.closest('.filter-chip');
      if (!chip) return;
      bar.querySelectorAll('.filter-chip').forEach(function (c) { c.classList.remove('active'); });
      chip.classList.add('active');
      var filter = chip.getAttribute('data-filter');
      items.forEach(function (item) {
        var tags = (item.getAttribute('data-tags') || '').split(',');
        item.style.display = (filter === 'all' || tags.indexOf(filter) !== -1) ? '' : 'none';
      });
    });
  }
  setupFilter('projectFilters', '#projectGrid .card');
  setupFilter('artFilters', '#artGrid .card');

  // Hero cube — follows the mouse, no autoplay loop
  var heroCube = document.querySelector('.hero-cube');
  if (heroCube && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    var restX = -18, restY = 22;
    var targetX = restX, targetY = restY;
    var currentX = restX, currentY = restY;
    document.addEventListener('mousemove', function (e) {
      var nx = (e.clientX / window.innerWidth) * 2 - 1;
      var ny = (e.clientY / window.innerHeight) * 2 - 1;
      targetY = restY + nx * 40;
      targetX = restX - ny * 30;
    });
    (function animateCube() {
      currentX += (targetX - currentX) * 0.06;
      currentY += (targetY - currentY) * 0.06;
      heroCube.style.transform = 'rotateX(' + currentX.toFixed(2) + 'deg) rotateY(' + currentY.toFixed(2) + 'deg)';
      requestAnimationFrame(animateCube);
    })();
  }

  // Home carousel (featured dev projects + fine art)
  document.querySelectorAll('.carousel').forEach(function (carousel) {
    var track = carousel.querySelector('.carousel-track');
    carousel.querySelectorAll('.carousel-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var dir = parseInt(btn.getAttribute('data-dir'), 10);
        track.scrollBy({ left: dir * 300, behavior: 'smooth' });
      });
    });
  });

  // Footer year
  var yearEl = document.getElementById('year');
  if (yearEl) { yearEl.textContent = new Date().getFullYear(); }
});
