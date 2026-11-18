if (!isAdmin(currentUser())) {
  location.href = 'login.html';
}

const $ = function (id) { return document.getElementById(id); };

const ORDER_STATUSES = ['новый', 'готовится', 'в пути', 'готов к выдаче', 'выдан', 'отменён'];
const BOOKING_STATUSES = ['ждёт звонка', 'ждёт подтверждения администратора', 'подтверждена', 'отклонена'];

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

function statusSelect(options, value, kind, id) {
  const select = h('select');
  select.dataset.kind = kind;
  select.dataset.id = id;
  options.concat(options.includes(value) ? [] : [value]).forEach(function (name) {
    const option = h('option', '', name);
    option.selected = name === value;
    select.appendChild(option);
  });
  return select;
}

function fill(boxId, list, emptyText, build) {
  const box = $(boxId);
  box.innerHTML = '';
  if (list.length === 0) {
    box.appendChild(h('p', 'hint', emptyText));
    return;
  }
  list.forEach(function (item) { box.appendChild(build(item)); });
}

function renderStats() {
  const orders = store.get('orders', []);
  const revenue = orders.filter(function (o) { return o.status !== 'отменён'; })
    .reduce(function (sum, o) { return sum + o.total; }, 0);
  const open = orders.filter(function (o) { return o.status === 'новый'; }).length;
  const waiting = store.get('bookings', []).filter(function (b) { return b.status !== 'подтверждена' && b.status !== 'отклонена'; }).length;
  const unanswered = store.get('messages', []).filter(function (m) { return !m.reply; }).length;
  const box = $('a-stats');
  box.innerHTML = '';
  [[open, 'новых заказов'], [revenue + ' ₽', 'выручка'], [waiting, 'броней ждут ответа'], [unanswered, 'обращений без ответа']]
    .forEach(function (s) {
      const card = h('div', 'stat');
      card.appendChild(h('b', '', String(s[0])));
      card.appendChild(h('span', '', s[1]));
      box.appendChild(card);
    });
}

function renderStats() {
  const live = store.get('orders', []).filter(function (o) { return o.status !== 'отменён'; });
  const revenue = live.reduce(function (sum, o) { return sum + o.total; }, 0);
  const count = {};
  live.forEach(function (o) {
    o.items.forEach(function (i) { count[i.name] = (count[i.name] || 0) + i.qty; });
  });
  const top = Object.entries(count).sort(function (a, b) { return b[1] - a[1]; })[0];

  const stats = [
    [String(live.length), 'заказов'],
    [revenue + ' ₽', 'выручка'],
    [live.length ? Math.round(revenue / live.length) + ' ₽' : '—', 'средний чек'],
    [top ? top[0] + ' (' + top[1] + ')' : '—', 'любимое блюдо'],
    [String(store.get('users', []).length), 'клиентов']
  ];

  const box = $('a-stats');
  box.innerHTML = '';
  stats.forEach(function (pair) {
    const cell = h('div', 'stat');
    cell.appendChild(h('b', '', pair[0]));
    cell.appendChild(h('span', '', pair[1]));
    box.appendChild(cell);
  });
}

function render() {
  renderStats();
  renderStats();
  const deal = activeDish();
  const dishBox = $('a-dish');
  dishBox.innerHTML = '';
  dishBox.appendChild(h('p', '', deal
    ? deal.name + ' (до ' + new Date(deal.until).toLocaleString('ru-RU') + ')'
    : 'Сейчас блюдо дня не выбрано.'));
  if (deal) {
    const off = h('button', 'link-btn', 'Снять блюдо дня');
    off.dataset.act = 'dish-off';
    dishBox.appendChild(off);
  }

  const counts = {};
  store.get('suggestions', []).forEach(function (s) {
    const key = s.name.toLowerCase();
    counts[key] = counts[key] || { name: s.name, votes: 0 };
    counts[key].votes += 1;
  });
  fill('a-suggest', Object.values(counts).sort(function (a, b) { return b.votes - a.votes; }),
    'Предложений пока нет.', function (s) {
      const card = h('div', 'order');
      card.appendChild(h('strong', '', s.name + ' · предложений: ' + s.votes));
      const pick = h('button', 'link-btn', 'Сделать блюдом дня на 24 часа');
      pick.dataset.act = 'dish-on';
      pick.dataset.name = s.name;
      card.appendChild(pick);
      return card;
    });

  fill('a-orders', store.get('orders', []).slice().reverse(), 'Заказов пока нет.', function (o) {
    const card = h('div', 'order');
    card.appendChild(h('strong', '', o.date + ' · ' + o.total + ' ₽ · ' + o.phone));
    card.appendChild(h('p', '', o.items.map(function (i) { return i.name + ' ×' + i.qty; }).join(', ')));
    card.appendChild(h('p', '', o.way + ': ' + o.place));
    card.appendChild(statusSelect(ORDER_STATUSES, o.status, 'order', o.id));
    return card;
  });

  fill('a-bookings', store.get('bookings', []).slice().reverse(), 'Броней пока нет.', function (b) {
    const card = h('div', 'order');
    card.appendChild(h('strong', '', (b.type === 'full' ? 'Всё кафе' : 'Столик ' + b.table) + ' · ' + b.date.split('-').reverse().join('.') + ' ' + b.time));
    card.appendChild(h('p', '', b.branchName + ' · гостей: ' + b.guests + ' · ' + b.name + ', ' + b.phone));
    if (b.event) {
      card.appendChild(h('p', '', 'Повод: ' + b.event));
    }
    card.appendChild(statusSelect(BOOKING_STATUSES, b.status, 'booking', b.id));
    return card;
  });

  fill('a-messages', store.get('messages', []).slice().reverse(), 'Обращений пока нет.', function (m) {
    const card = h('div', 'order');
    card.appendChild(h('strong', '', m.name + ' · ' + m.date));
    card.appendChild(h('p', '', m.text));
    const field = h('textarea');
    field.rows = 2;
    field.value = m.reply || '';
    field.placeholder = 'Ответ клиенту';
    card.appendChild(field);
    const send = h('button', 'link-btn', 'Ответить');
    send.dataset.act = 'reply';
    send.dataset.id = m.id;
    card.appendChild(send);
    return card;
  });
}

function updateList(key, id, change) {
  const list = store.get(key, []);
  list.forEach(function (item) {
    if (item.id === id) {
      change(item);
    }
  });
  store.set(key, list);
}

document.addEventListener('change', function (event) {
  const select = event.target.closest('select[data-kind]');
  if (!select) {
    return;
  }
  const key = select.dataset.kind === 'order' ? 'orders' : 'bookings';
  updateList(key, Number(select.dataset.id), function (item) { item.status = select.value; });
  toast('Статус обновлён');
});

document.addEventListener('click', function (event) {
  const button = event.target.closest('button[data-act]');
  if (!button) {
    return;
  }
  const act = button.dataset.act;
  if (act === 'dish-on') {
    store.set('dishOfDay', { name: button.dataset.name, until: Date.now() + 24 * 60 * 60 * 1000 });
  } else if (act === 'dish-off') {
    localStorage.removeItem('dishOfDay');
  } else if (act === 'reply') {
    const text = button.previousElementSibling.value.trim();
    updateList('messages', Number(button.dataset.id), function (item) { item.reply = text; });
    toast('Ответ сохранён');
  }
  render();
});

render();
