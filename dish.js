/* Блюдо дня: таймер на 24 часа и предложения посетителей. */

const dod = document.getElementById('dod');
const dishForm = document.getElementById('dish-form');
const dishName = document.getElementById('dish-name');
const dishMsg = document.getElementById('dish-msg');

function two(n) {
  return String(n).padStart(2, '0');
}

function tick() {
  const deal = activeDish();
  if (!deal) {
    dod.textContent = 'Сегодня блюдо дня ещё не выбрано. Предложите своё!';
    return;
  }
  const left = Math.floor((deal.until - Date.now()) / 1000);
  dod.textContent = 'Блюдо дня: ' + deal.name + ', скидка 20%. Осталось ' +
    two(Math.floor(left / 3600)) + ':' + two(Math.floor(left % 3600 / 60)) + ':' + two(left % 60);
}

setInterval(tick, 1000);
tick();

dishForm.addEventListener('submit', function (event) {
  event.preventDefault();
  const user = currentUser();
  const name = dishName.value.trim();

  if (!user) {
    dishMsg.className = 'message error';
    dishMsg.textContent = 'Чтобы предложить блюдо, войдите в аккаунт.';
    return;
  }
  if (name.length < 2) {
    dishMsg.className = 'message error';
    dishMsg.textContent = 'Введите название блюда.';
    return;
  }

  const day = todayISO();
  const list = store.get('suggestions', []);
  if (list.some(function (s) { return s.phone === user.phone && s.day === day; })) {
    dishMsg.className = 'message error';
    dishMsg.textContent = 'Сегодня вы уже предлагали блюдо. Приходите завтра.';
    return;
  }

  list.push({ id: Date.now(), phone: user.phone, name: name, day: day });
  store.set('suggestions', list);
  dishForm.reset();
  dishMsg.className = 'message ok';
  dishMsg.textContent = 'Спасибо! Предложение отправлено администратору.';
});
