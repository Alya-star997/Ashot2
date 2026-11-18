const dost = document.getElementById('dost');
const sam = document.getElementById('sam');
const radios = document.querySelectorAll('input[name="dos"]');

radios.forEach(function (radio) {
  radio.addEventListener('change', function () {
    if(radio.value === 'dost') {
      dost.classList.remove('hidden');
      sam.classList.add('hidden');
    }
    else if(radio.value === 'sam') {
      sam.classList.remove('hidden');
      dost.classList.add('hidden');
    }
  });
});

/* бронь столика*/

const form = document.getElementById('booking-form');
const branchSelect = document.getElementById('booking-branch');
const dateInput = document.getElementById('booking-date');
const timeSelect = document.getElementById('booking-time');
const guestsInput = document.getElementById('booking-guests');
const typeRadios = document.querySelectorAll('input[name="type"]');
const tables = document.querySelectorAll('input[name="table"]');
const tableBlock = document.getElementById('table-block');
const fullBlock = document.getElementById('full-block');
const tablesNote = document.getElementById('tables-note');
const message = document.getElementById('booking-message');

const MAX_DAYS_AHEAD = 60;

/* ---------- хранилище броней (пока вместо базы данных) ---------- */

function getBookings() {
  try {
    return JSON.parse(localStorage.getItem('bookings')) || [];
  } catch (error) {
    return [];
  }
}

function saveBookings(bookings) {
  localStorage.setItem('bookings', JSON.stringify(bookings));
}

/* ---------- вспомогательные функции ---------- */

function toISO(date) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return date.getFullYear() + '-' + month + '-' + day;
}

function isFullMode() {
  return document.querySelector('input[name="type"]:checked').value === 'full';
}

function showMessage(text, kind) {
  message.textContent = text;
  message.className = 'message ' + kind;
}

function clearMessage() {
  message.textContent = '';
  message.className = 'message';
}

/* ---------- допустимые даты ---------- */

const today = new Date();
const lastDay = new Date();
lastDay.setDate(today.getDate() + MAX_DAYS_AHEAD);
dateInput.min = toISO(today);
dateInput.max = toISO(lastDay);

/* ---------- время: в сегодняшний день нельзя выбрать прошедшие часы ---------- */

function updateTimes() {
  const nowHour = new Date().getHours();
  const isToday = dateInput.value === toISO(new Date());

  Array.from(timeSelect.options).forEach(function (option) {
    if (!option.value) {
      return;
    }
    const hour = Number(option.value.split(':')[0]);
    option.disabled = isToday && hour <= nowHour;
  });

  if (timeSelect.selectedOptions[0] && timeSelect.selectedOptions[0].disabled) {
    timeSelect.value = '';
  }
}

/* ---------- гости: предел зависит от типа брони ---------- */

function setGuests(max, value) {
  guestsInput.max = max;
  guestsInput.value = value;
}

/* ---------- столики: мест хватает и столик не занят ---------- */

function isTableBusy(tableValue) {
  return getBookings().some(function (booking) {
    if (booking.branch !== branchSelect.value || booking.date !== dateInput.value) {
      return false;
    }
    if (booking.type === 'full') {
      return true;
    }
    return booking.time === timeSelect.value && booking.table === tableValue;
  });
}

function updateTables() {
  const guests = Number(guestsInput.value);
  const ready = dateInput.value && timeSelect.value;
  let freeCount = 0;

  tables.forEach(function (table) {
    const enoughSeats = Number(table.dataset.seats) >= guests;
    const busy = ready ? isTableBusy(table.value) : false;
    table.disabled = !enoughSeats || busy;

    if (table.disabled) {
      table.checked = false;
    } else {
      freeCount++;
    }
  });

  if (guests > Number(guestsInput.max)) {
    tablesNote.textContent = 'За один столик помещается не больше ' + guestsInput.max + ' гостей. Для большой компании выберите «Всё кафе целиком».';
  } else if (!ready) {
    tablesNote.textContent = 'Выберите дату и время, чтобы увидеть свободные столики.';
  } else if (freeCount === 0) {
    tablesNote.textContent = 'На это время свободных столиков нет. Попробуйте другое время, дату или кафе.';
  } else {
    tablesNote.textContent = '';
  }
}

/* ---------- переключатель «столик / всё кафе» ---------- */

function updateType() {
  const full = isFullMode();
  tableBlock.classList.toggle('hidden', full);
  fullBlock.classList.toggle('hidden', !full);

  if (full) {
    setGuests(60, 20);
    tables.forEach(function (table) {
      table.checked = false;
    });
  } else {
    setGuests(6, 2);
    updateTables();
  }
  clearMessage();
}

/* ---------- проверка формы перед отправкой ---------- */

function markInvalid(field, isInvalid) {
  field.classList.toggle('invalid', isInvalid);
}

function validate() {
  const nameField = document.getElementById('booking-name');
  const phoneField = document.getElementById('booking-phone');
  const full = isFullMode();
  const guests = Number(guestsInput.value);

  const checks = [
   { field: phoneField, ok: phoneField.value.replace(/\D/g, '').length === 11, text: 'Введите телефон полностью, например +7 900 000-00-00.' }
  ];

  let firstError = null;
  checks.forEach(function (check) {
    markInvalid(check.field, !check.ok);
    if (!check.ok && !firstError) {
      firstError = check.text;
    }
  });

  if (firstError) {
    return firstError;
  }

  if (!full && !form.querySelector('input[name="table"]:checked')) {
    return 'Выберите столик.';
  }

  if (full) {
    const alreadyFull = getBookings().some(function (booking) {
      return booking.type === 'full' && booking.branch === branchSelect.value && booking.date === dateInput.value;
    });
    if (alreadyFull) {
      return 'На эту дату это кафе уже забронировано целиком. Выберите другую дату или другое кафе.';
    }
  }

  return '';
}

/* ---------- отправка ---------- */

form.addEventListener('submit', function (event) {
  event.preventDefault();

  const error = validate();
  if (error) {
    showMessage(error, 'error');
    return;
  }

  const full = isFullMode();
  const checkedTable = form.querySelector('input[name="table"]:checked');

  const booking = {
    id: Date.now(),
    type: full ? 'full' : 'table',
    branch: branchSelect.value,
    branchName: branchSelect.options[branchSelect.selectedIndex].textContent,
    date: dateInput.value,
    time: timeSelect.value,
    guests: Number(guestsInput.value),
    table: full ? null : checkedTable.value,
    event: document.getElementById('booking-event').value.trim(),
    name: document.getElementById('booking-name').value.trim(),
    phone: document.getElementById('booking-phone').value.trim(),
    comment: document.getElementById('booking-comment').value.trim(),
    status: full ? 'ждёт подтверждения администратора' : 'ждёт звонка'
  };

  const bookings = getBookings();
  bookings.push(booking);
  saveBookings(bookings);

  const dateText = booking.date.split('-').reverse().join('.');
  const summary = full
    ? 'Заявка на бронь всего кафе (' + booking.branchName + ') на ' + dateText + ' в ' + booking.time + ' отправлена. Администратор свяжется с вами.'
    : 'Столик ' + booking.table + ' (' + booking.branchName + ') на ' + dateText + ' в ' + booking.time + ' забронирован. С вами свяжутся в течение одного дня.';

  form.reset();
  document.querySelectorAll('.invalid').forEach(function (field) {
    field.classList.remove('invalid');
  });
  updateType();
  updateTimes();
  updateTables();
  showMessage(summary, 'ok');
  renderMyBookings();
});

/* ---------- подписка на изменения ---------- */

typeRadios.forEach(function (radio) {
  radio.addEventListener('change', updateType);
});
guestsInput.addEventListener('input', updateTables);
branchSelect.addEventListener('change', updateTables);
timeSelect.addEventListener('change', updateTables);
dateInput.addEventListener('change', function () {
  updateTimes();
  updateTables();
});

updateType();
updateTimes();
updateTables();

/* ---------- мои брони ---------- */

const myBookings = document.getElementById('my-bookings');

function renderMyBookings() {
  const bookings = getBookings().sort(function (a, b) {
    return (a.date + a.time).localeCompare(b.date + b.time);
  });
  const todayISO = toISO(new Date());

  myBookings.innerHTML = '';

  if (bookings.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'hint';
    empty.textContent = 'У вас пока нет броней.';
    myBookings.appendChild(empty);
    return;
  }

  bookings.forEach(function (booking) {
    const isPast = booking.date < todayISO;

    const item = document.createElement('div');
    item.className = 'my-booking' + (isPast ? ' past' : '');

    const info = document.createElement('div');

    const title = document.createElement('strong');
    title.textContent = booking.type === 'full' ? 'Всё кафе целиком' : 'Столик ' + booking.table;

    const details = document.createElement('p');
    details.textContent = booking.date.split('-').reverse().join('.') + ' в ' + booking.time + ', ' + booking.branchName + ', гостей: ' + booking.guests;

    const status = document.createElement('p');
    status.className = 'status';
    status.textContent = isPast ? 'прошла' : booking.status;

    info.appendChild(title);
    info.appendChild(details);
    info.appendChild(status);
    item.appendChild(info);

    if (!isPast) {
      const cancel = document.createElement('button');
      cancel.type = 'button';
      cancel.className = 'cancel-btn';
      cancel.dataset.id = booking.id;
      cancel.textContent = 'Отменить';
      item.appendChild(cancel);
    }

    myBookings.appendChild(item);
  });
}

myBookings.addEventListener('click', function (event) {
  const button = event.target.closest('.cancel-btn');
  if (!button) {
    return;
  }
  if (!confirm('Отменить эту бронь?')) {
    return;
  }

  const id = Number(button.dataset.id);
  saveBookings(getBookings().filter(function (booking) {
    return booking.id !== id;
  }));

  renderMyBookings();
  updateTables();
});

renderMyBookings();

/* ---------- маска телефона ---------- */

const phoneInput = document.getElementById('booking-phone');

function formatPhone(value) {
  let digits = value.replace(/\D/g, '');

  if (digits.startsWith('8')) {
    digits = '7' + digits.slice(1);
  }
  if (digits && !digits.startsWith('7')) {
    digits = '7' + digits;
  }
  digits = digits.slice(0, 11);

  let result = '';
  if (digits.length > 0) {
    result = '+7';
  }
  if (digits.length > 1) {
    result += ' ' + digits.slice(1, 4);
  }
  if (digits.length > 4) {
    result += ' ' + digits.slice(4, 7);
  }
  if (digits.length > 7) {
    result += '-' + digits.slice(7, 9);
  }
  if (digits.length > 9) {
    result += '-' + digits.slice(9, 11);
  }
  return result;
}

phoneInput.addEventListener('input', function () {
  phoneInput.value = formatPhone(phoneInput.value);
});