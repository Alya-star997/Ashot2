const user = currentUser();
if (!user) {
  location.href = 'login.html';
}

const $ = function (id) { return document.getElementById(id); };
const digits = function (text) { return String(text).replace(/\D/g, ''); };

function h(tag, className, text) {
  const node = document.createElement(tag);
  if (className) {
    node.className = className;
  }
  if (text !== undefined) {
    node.textContent = text;
  }
  return node;
}

function actionButton(className, text, action, id) {
  const button = h('button', className, text);
  button.type = 'button';
  button.dataset.act = action;
  button.dataset.id = id;
  return button;
}

/* ---------- данные и бонусы ---------- */

function myOrders() {
  return store.get('orders', []).filter(function (o) { return o.phone === user.phone; });
}

function renderUser() {
  $('user-name').textContent = user.name;
  $('avatar').textContent = (user.name || '?').trim().charAt(0).toUpperCase();
  $('user-phone').textContent = user.phone;
  $('bonus').textContent = 'Бонусы: ' + bonusBalance() + ' баллов (1 балл = 1 ₽, копится 5% от заказов)';
}

function bonusBalance() {
  const live = myOrders().filter(function (o) { return o.status !== 'отменён'; });
  const earned = Math.floor(live.reduce(function (sum, o) { return sum + o.total; }, 0) * 0.05);
  const used = live.reduce(function (sum, o) { return sum + (o.bonusUsed || 0); }, 0);
  return Math.max(0, earned - used);
}

// Сколько бонусов можно списать: не больше баланса и не больше половины заказа.
function payment(cart) {
  const sum = cart.reduce(function (s, i) { return s + i.price * i.qty; }, 0);
  const limit = Math.min(bonusBalance(), Math.floor(sum / 2));
  const bonus = $('use-bonus').checked ? limit : 0;
  return { sum: sum, limit: limit, bonus: bonus, pay: sum - bonus };
}

/* ---------- корзина ---------- */

function renderCart() {
  const cart = getCart();
  const box = $('cart');
  box.innerHTML = '';
  $('checkout').classList.toggle('hidden', cart.length === 0);

  if (cart.length === 0) {
    box.appendChild(h('p', 'hint', 'Корзина пуста. Добавьте блюда в меню.'));
    return;
  }

  cart.forEach(function (item, index) {
    const row = h('div', 'row-item');
    row.appendChild(h('span', 'grow', item.name));
    row.appendChild(actionButton('mini', '−', 'minus', index));
    row.appendChild(h('span', '', String(item.qty)));
    row.appendChild(actionButton('mini', '+', 'plus', index));
    row.appendChild(h('span', '', item.price * item.qty + ' ₽'));
    row.appendChild(actionButton('link-btn', '×', 'remove', index));
    box.appendChild(row);
  });

  const deal = payment(cart);
  $('bonus-hint').textContent = '(можно списать до ' + deal.limit + ' ₽)';
  if (deal.bonus > 0) {
    box.appendChild(h('p', 'hint', 'Сумма: ' + deal.sum + ' ₽, списано бонусов: ' + deal.bonus));
  }
  box.appendChild(h('p', 'total', 'К оплате: ' + deal.pay + ' ₽'));
}

$('use-bonus').addEventListener('change', renderCart);

$('cart').addEventListener('click', function (event) {
  const button = event.target.closest('button');
  if (!button) {
    return;
  }
  const cart = getCart();
  const index = Number(button.dataset.id);
  if (button.dataset.act === 'plus') {
    cart[index].qty += 1;
  } else if (button.dataset.act === 'minus') {
    cart[index].qty -= 1;
    if (cart[index].qty <= 0) {
      cart.splice(index, 1);
    }
  } else {
    cart.splice(index, 1);
  }
  saveCart(cart);
  renderCart();
});

/* ---------- оформление заказа ---------- */

document.querySelectorAll('input[name="way"]').forEach(function (radio) {
  radio.addEventListener('change', function () {
    const delivery = radio.value === 'delivery';
    $('addr-box').classList.toggle('hidden', !delivery);
    $('pick-box').classList.toggle('hidden', delivery);
  });
});

$('order-btn').addEventListener('click', function () {
  const cart = getCart();
  const delivery = document.querySelector('input[name="way"]:checked').value === 'delivery';
  const address = $('address').value.trim();

  if (cart.length === 0) {
    $('order-error').textContent = 'Корзина пуста.';
    return;
  }
  if (delivery && address.length < 5) {
    $('order-error').textContent = 'Введите адрес доставки: улица, дом, квартира.';
    return;
  }

  const deal = payment(cart);
  const orders = store.get('orders', []);
  orders.push({
    id: Date.now(),
    phone: user.phone,
    items: cart,
    total: deal.pay,
    bonusUsed: deal.bonus,
    way: delivery ? 'доставка' : 'самовывоз',
    place: delivery ? address : $('branch').value,
    date: new Date().toLocaleString('ru-RU'),
    status: 'новый'
  });
  store.set('orders', orders);
  saveCart([]);

  $('order-error').textContent = '';
  $('address').value = '';
  $('use-bonus').checked = false;
  toast('Заказ оформлен');
  renderCart();
  renderOrders();
  renderUser();
});

/* ---------- мои заказы ---------- */

function renderOrders() {
  const box = $('orders');
  box.innerHTML = '';
  const orders = myOrders().reverse();

  if (orders.length === 0) {
    box.appendChild(h('p', 'hint', 'Заказов пока нет.'));
    return;
  }

  orders.forEach(function (order) {
    const card = h('div', 'order');
    card.appendChild(h('strong', '', order.date + ' · ' + order.total + ' ₽'));
    card.appendChild(h('p', '', order.items.map(function (i) { return i.name + ' ×' + i.qty; }).join(', ')));
    card.appendChild(h('p', '', order.way + ': ' + order.place));
    if (order.bonusUsed) {
      card.appendChild(h('p', '', 'Оплачено бонусами: ' + order.bonusUsed + ' ₽'));
    }
    card.appendChild(h('p', order.status === 'отменён' ? 'st cancelled' : 'st', 'Статус: ' + order.status));
    card.appendChild(actionButton('link-btn', 'Повторить заказ', 'repeat', order.id));
    if (order.status === 'новый') {
      card.appendChild(actionButton('link-btn', 'Отменить заказ', 'cancel-order', order.id));
    }
    box.appendChild(card);
  });
}

$('orders').addEventListener('click', function (event) {
  const button = event.target.closest('button');
  if (!button) {
    return;
  }
  const id = Number(button.dataset.id);
  const orders = store.get('orders', []);

  if (button.dataset.act === 'repeat') {
    const order = orders.find(function (o) { return o.id === id; });
    const cart = getCart();
    order.items.forEach(function (item) {
      const found = cart.find(function (c) { return c.name === item.name; });
      if (found) {
        found.qty += item.qty;
      } else {
        cart.push({ name: item.name, price: item.price, qty: item.qty });
      }
    });
    saveCart(cart);
    renderCart();
    toast('Блюда добавлены в корзину');
    return;
  }

  if (!confirm('Отменить заказ? Списанные бонусы вернутся.')) {
    return;
  }
  orders.forEach(function (order) {
    if (order.id === id) {
      order.status = 'отменён';
    }
  });
  store.set('orders', orders);
  renderOrders();
  renderUser();
  renderCart();
});

/* ---------- мои брони (создаются на странице «Бронь столика») ---------- */

function renderBookings() {
  const box = $('my-bookings');
  box.innerHTML = '';
  const today = todayISO();
  const list = store.get('bookings', []).filter(function (b) {
    return digits(b.phone) === digits(user.phone);
  });

  if (list.length === 0) {
    box.appendChild(h('p', 'hint', 'Броней пока нет. Забронировать можно на странице «Бронь столика».'));
    return;
  }

  list.forEach(function (b) {
    const card = h('div', 'order');
    card.appendChild(h('strong', '', b.type === 'full' ? 'Всё кафе целиком' : 'Столик ' + b.table));
    card.appendChild(h('p', '', b.date.split('-').reverse().join('.') + ' в ' + b.time + ', ' + b.branchName));
    card.appendChild(h('p', 'st', b.date < today ? 'прошла' : b.status));
    if (b.date >= today) {
      card.appendChild(actionButton('link-btn', 'Отменить бронь', 'cancel-booking', b.id));
    }
    box.appendChild(card);
  });
}

$('my-bookings').addEventListener('click', function (event) {
  const button = event.target.closest('button');
  if (!button || !confirm('Отменить бронь?')) {
    return;
  }
  const id = Number(button.dataset.id);
  store.set('bookings', store.get('bookings', []).filter(function (b) { return b.id !== id; }));
  renderBookings();
});

/* ---------- выход ---------- */

$('logout').addEventListener('click', function () {
  localStorage.removeItem('session');
  location.href = 'index.html';
});

renderUser();
renderCart();
renderOrders();
renderBookings();

/* ---------- настройки и админка ---------- */

if (isAdmin(user)) {
  $('admin-link').classList.remove('hidden');
}
$('set-name').value = user.name;

$('settings-form').addEventListener('submit', async function (event) {
  event.preventDefault();
  const name = $('set-name').value.trim();
  const pass = $('set-pass').value;

  if (name.length < 2) {
    $('set-msg').textContent = 'Введите имя.';
    return;
  }
  if (pass && pass.length < 6) {
    $('set-msg').textContent = 'Пароль должен быть не короче 6 символов.';
    return;
  }

  const hash = pass ? await hashPassword(pass) : '';
  const users = store.get('users', []);
  users.forEach(function (u) {
    if (u.phone === user.phone) {
      u.name = name;
      if (hash) {
        u.hash = hash;
      }
    }
  });
  store.set('users', users);
  user.name = name;
  $('set-pass').value = '';
  $('set-msg').textContent = 'Сохранено.';
  renderUser();
});
