document.querySelectorAll('.dishes .card').forEach(function (card) {
  const name = card.querySelector('h3').textContent.trim();

  // Удаляем ВСЕ старые кнопки, чтобы не было дублей
  card.querySelectorAll('button').forEach(function (old) {
    old.remove();
  });

  card.dataset.name = name;
  const heart = document.createElement('button');
  heart.type = 'button';
  heart.className = 'fav-btn';
  function paintHeart() {
    const isFav = store.get('favorites', []).includes(name);
    heart.textContent = isFav ? '♥' : '♡';
    heart.classList.toggle('on', isFav);
    heart.setAttribute('aria-label', (isFav ? 'Убрать из избранного: ' : 'В избранное: ') + name);
  }
  heart.addEventListener('click', function () {
    const favs = store.get('favorites', []);
    store.set('favorites', favs.includes(name) ? favs.filter(function (n) { return n !== name; }) : favs.concat(name));
    paintHeart();
    document.dispatchEvent(new Event('favchange'));
  });
  paintHeart();
  card.appendChild(heart);

  card.querySelectorAll('.price').forEach(function (priceTag) {
    const match = priceTag.textContent.match(/(\d+)\s*₽/);
    if (!match) {
      return;
    }
    const basePrice = Number(match[1]);
    const deal = activeDish();
    const discounted = deal && deal.name.toLowerCase() === name.toLowerCase();
    const price = discounted ? Math.round(basePrice * 0.8) : basePrice;
    
    if (discounted) {
      priceTag.textContent += ' → ' + price + ' ₽ (блюдо дня, −20%)';
    }
    
    const label = priceTag.textContent.split(':')[0].replace('Цена', '').replace('за', '').trim();
    const fullName = label && card.querySelectorAll('.price').length > 1 ? name + ' (' + label + ')' : name;

    // Создаем кнопку
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'add-btn';
    button.textContent = '+';
    button.setAttribute('aria-label', 'Добавить в корзину: ' + fullName);

    // Привязываем событие
    button.addEventListener('click', function (e) {
      e.preventDefault(); // Чтобы не было перезагрузки
      addToCart(fullName, price);
      toast('Добавлено: ' + fullName);
    });

    // Вставляем кнопку ПОСЛЕ цены
    priceTag.after(button);
  });
});

/* ---------- поиск и категории ---------- */

(function () {
  const wrap = document.querySelector('.menu .wrap');
  const title = wrap && wrap.querySelector('h1');
  if (!title) {
    return;
  }

  const groups = Array.from(document.querySelectorAll('.dishes')).map(function (grid) {
    const heading = grid.previousElementSibling;
    const hasHeading = heading && heading.tagName === 'H2';
    return {
      grid: grid,
      heading: hasHeading ? heading : null,
      name: hasHeading ? heading.textContent.replace(':', '').trim() : 'Меню'
    };
  });

  let category = 'Все';
  let query = '';

  const tools = document.createElement('div');
  tools.className = 'menu-tools';

  const search = document.createElement('input');
  search.type = 'search';
  search.placeholder = 'Найти блюдо или ингредиент';
  search.setAttribute('aria-label', 'Поиск по меню');
  tools.appendChild(search);

  const chips = document.createElement('div');
  chips.className = 'chips';
  ['Все', 'Избранное'].concat(groups.map(function (g) { return g.name; })).forEach(function (name) {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'chip' + (name === 'Все' ? ' active' : '');
    chip.textContent = name;
    chip.addEventListener('click', function () {
      category = name;
      chips.querySelectorAll('.chip').forEach(function (c) { c.classList.toggle('active', c === chip); });
      apply();
    });
    chips.appendChild(chip);
  });
  tools.appendChild(chips);

  const empty = document.createElement('p');
  empty.className = 'hint hidden';
  empty.textContent = 'Ничего не найдено. Попробуйте другое слово.';

  title.after(tools);
  tools.after(empty);
  document.addEventListener('favchange', function () { apply(); });

  function apply() {
    let total = 0;
    groups.forEach(function (group) {
      const inCategory = category === 'Все' || category === 'Избранное' || category === group.name;
      let visible = 0;
      group.grid.querySelectorAll('.card').forEach(function (card) {
        const matches = card.textContent.toLowerCase().includes(query);
        const favOk = category !== 'Избранное' || store.get('favorites', []).includes(card.dataset.name);
        card.classList.toggle('hidden', !(inCategory && matches && favOk));
        if (inCategory && matches && favOk) {
          visible += 1;
        }
      });
      group.grid.classList.toggle('hidden', visible === 0);
      if (group.heading) {
        group.heading.classList.toggle('hidden', visible === 0);
      }
      total += visible;
    });
    empty.classList.toggle('hidden', total > 0);
  }

  search.addEventListener('input', function () {
    query = search.value.trim().toLowerCase();
    apply();
  });
})();
