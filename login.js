/* Вход и регистрация. После успеха — переход в аккаунт (profile.html). */

if (currentUser()) {
  location.replace('profile.html');
}

const $ = function (id) { return document.getElementById(id); };
let registerMode = false;

// +7 999 123-45-67, 8 999..., 7999... -> +79991234567
function normPhone(text) {
  let d = String(text).replace(/\D/g, '');
  if (d.length === 11 && d[0] === '8') {
    d = '7' + d.slice(1);
  }
  return d.length === 11 && d[0] === '7' ? '+' + d : null;
}

function setMode(reg) {
  registerMode = reg;
  $('tab-login').classList.toggle('active', !reg);
  $('tab-reg').classList.toggle('active', reg);
  $('name-box').classList.toggle('hidden', !reg);
  $('a-submit').textContent = reg ? 'Зарегистрироваться' : 'Войти';
  $('a-pass').autocomplete = reg ? 'new-password' : 'current-password';
  $('a-msg').textContent = '';
}

$('tab-login').addEventListener('click', function () { setMode(false); });
$('tab-reg').addEventListener('click', function () { setMode(true); });

$('auth-form').addEventListener('submit', async function (event) {
  event.preventDefault();
  const msg = $('a-msg');
  const phone = normPhone($('a-phone').value);
  const pass = $('a-pass').value;
  const name = $('a-name').value.trim();

  if (!phone) { msg.textContent = 'Введите телефон: 11 цифр, например +7 999 123-45-67.'; return; }
  if (registerMode && name.length < 2) { msg.textContent = 'Введите имя.'; return; }
  if (pass.length < 6) { msg.textContent = 'Пароль должен быть не короче 6 символов.'; return; }

  let hash;
  try {
    hash = await hashPassword(pass);
  } catch (error) {
    msg.textContent = 'Браузер не смог обработать пароль. Откройте сайт через localhost или https.';
    return;
  }

  const users = store.get('users', []);
  const found = users.find(function (u) { return u.phone === phone; });

  if (registerMode) {
    if (found) { msg.textContent = 'Этот номер уже зарегистрирован. Перейдите на вкладку «Вход».'; return; }
    users.push({ name: name, phone: phone, hash: hash });
    store.set('users', users);
  } else if (!found) {
    msg.textContent = 'Такого номера нет. Зарегистрируйтесь на соседней вкладке.';
    return;
  } else if (found.hash !== hash) {
    msg.textContent = 'Неверный пароль.';
    return;
  }

  store.set('session', phone);
  location.href = 'profile.html';
});
