/* Общий скрипт для всех страниц. Данные пока хранятся в localStorage,
   позже эти функции заменятся запросами к серверу (PHP + MySQL). */

const store = {
  get(key, fallback) {
    try {
      const value = JSON.parse(localStorage.getItem(key));
      return value === null ? fallback : value;
    } catch (error) {
      return fallback;
    }
  },
  set(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }
};

async function hashPassword(password) {
  const bytes = new TextEncoder().encode('ashot:' + password);
  const buffer = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(buffer)).map(function (b) {
    return b.toString(16).padStart(2, '0');
  }).join('');
}

function currentUser() {
  const phone = store.get('session', null);
  return store.get('users', []).find(function (u) { return u.phone === phone; }) || null;
}

// Сегодняшняя дата по местному времени (YYYY-MM-DD), а не по UTC.
function todayISO() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

function getCart() {
  return store.get('cart', []);
}

function saveCart(cart) {
  store.set('cart', cart);
  updateHeader();
  updateFab();
}

function addToCart(name, price) {
  const cart = getCart();
  const item = cart.find(function (i) { return i.name === name; });
  if (item) {
    item.qty += 1;
  } else {
    cart.push({ name: name, price: price, qty: 1 });
  }
  saveCart(cart);
}

function updateHeader() {
  const link = document.querySelector('.btn-login');
  if (!link) {
    return;
  }
  const count = getCart().reduce(function (sum, i) { return sum + i.qty; }, 0);
  if (currentUser()) {
    link.textContent = 'Профиль' + (count ? ' (' + count + ')' : '');
    link.href = 'profile.html';
  } else {
    link.textContent = 'Вход/регистрация';
    link.href = 'login.html';
  }
}

function toast(text) {
  const note = document.createElement('div');
  note.className = 'toast';
  note.textContent = text;
  document.body.appendChild(note);
  setTimeout(function () { note.remove(); }, 1800);
}

document.addEventListener('DOMContentLoaded', updateHeader);

/* ---------- роли и блюдо дня ---------- */

// Кто зарегистрируется с этим номером, становится администратором (учебный вариант).
const ADMIN_PHONE = '+70000000000';

function isAdmin(user) {
  return Boolean(user) && user.phone === ADMIN_PHONE;
}

function activeDish() {
  const deal = store.get('dishOfDay', null);
  return deal && deal.until > Date.now() ? deal : null;
}

/* ---------- меню-бургер на телефоне ---------- */

document.addEventListener('DOMContentLoaded', function () {
  const header = document.querySelector('header');
  const nav = header && header.querySelector('nav');
  if (!nav) {
    return;
  }
  const burger = document.createElement('button');
  burger.type = 'button';
  burger.className = 'burger';
  burger.textContent = '☰';
  burger.setAttribute('aria-label', 'Открыть меню');
  burger.setAttribute('aria-expanded', 'false');
  header.insertBefore(burger, nav);
  burger.addEventListener('click', function () {
    const open = nav.classList.toggle('open');
    burger.setAttribute('aria-expanded', String(open));
  });
});

/* ---------- плавающая корзина (на странице меню) ---------- */

function updateFab() {
  if (!document.querySelector('.menu')) {
    return;
  }
  let fab = document.querySelector('.fab-cart');
  const cart = getCart();
  const count = cart.reduce(function (sum, i) { return sum + i.qty; }, 0);
  const total = cart.reduce(function (sum, i) { return sum + i.qty * i.price; }, 0);

  if (count === 0) {
    if (fab) {
      fab.remove();
    }
    return;
  }
  if (!fab) {
    fab = document.createElement('a');
    fab.className = 'fab-cart';
    fab.href = 'profile.html';
    document.body.appendChild(fab);
  }
  fab.textContent = 'Корзина · ' + count + ' · ' + total + ' ₽';
}

/* ---------- плавное появление блоков и кнопка «наверх» ---------- */

document.addEventListener('DOMContentLoaded', function () {
  updateFab();

  const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if ('IntersectionObserver' in window && !calm) {
    const observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });

    document.querySelectorAll('main section, .dishes .card, .card, .panel').forEach(function (el) {
      el.classList.add('reveal');
      observer.observe(el);
    });
  }

  const up = document.createElement('button');
  up.type = 'button';
  up.className = 'to-top';
  up.textContent = '↑';
  up.setAttribute('aria-label', 'Наверх');
  up.addEventListener('click', function () {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
  document.body.appendChild(up);
  window.addEventListener('scroll', function () {
    up.classList.toggle('show', window.scrollY > 500);
  });
});
