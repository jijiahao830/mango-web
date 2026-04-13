/**
 * login.html — 会员登录、欢迎卡片与进入车库
 * 依赖 head：./members.js（可选 membersData）、window.MANGO_API_ORIGIN
 */

/** 移动端：禁止整页跟手滚动（含欢迎界面；仅登录卡片内因键盘可能需内部滚动） */
(function () {
  document.addEventListener(
    'touchmove',
    function (e) {
      var n = e.target;
      while (n && n.nodeType === 1) {
        if (n.classList && n.classList.contains('login-card')) {
          return;
        }
        n = n.parentElement;
      }
      e.preventDefault();
    },
    { passive: false }
  );
})();

async function resolveMemberLevel(nameInput) {
  let memberLevel = '普通';
  var origin = (typeof window.MANGO_API_ORIGIN !== 'undefined' && window.MANGO_API_ORIGIN)
    ? String(window.MANGO_API_ORIGIN).replace(/\/$/, '')
    : '';
  var url = origin + '/api/member/lookup';
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: nameInput }),
    });
    const data = await res.json().catch(function () { return {}; });
    if (res.ok && data.ok && Object.prototype.hasOwnProperty.call(data, 'level')) {
      memberLevel = String(data.level);
    } else if (typeof membersData !== 'undefined' && membersData[nameInput]) {
      memberLevel = membersData[nameInput];
    }
  } catch (err) {
    if (typeof membersData !== 'undefined' && membersData[nameInput]) {
      memberLevel = membersData[nameInput];
    }
  }
  return memberLevel;
}

document.getElementById('loginForm').addEventListener('submit', async function (e) {
  e.preventDefault();
  const nameInput = document.getElementById('driverName').value.trim();

  if (nameInput) {
    const memberLevel = await resolveMemberLevel(nameInput);
    let levelClass = '';

    if (memberLevel.includes('黑')) {
      levelClass = 'level-black';
    } else if (memberLevel.includes('金')) {
      levelClass = 'level-gold';
    } else if (memberLevel.includes('银')) {
      levelClass = 'level-silver';
    } else if (memberLevel.includes('芒果')) {
      levelClass = 'level-mango';
    }

    sessionStorage.setItem('mango_driver_name', nameInput);
    sessionStorage.setItem('mango_driver_level', memberLevel);
    sessionStorage.removeItem('mangoCarFilterState');
    sessionStorage.removeItem('mango_filter_saved_for_driver');
    try {
      localStorage.removeItem('mangoCarFilterState');
      localStorage.removeItem('mango_filter_saved_for_driver');
    } catch (e) {}

    const card1 = document.getElementById('card1');
    const card2 = document.getElementById('card2');
    card1.className = `welcome-card active-card ${levelClass}`;

    const btn = document.querySelector('.btn-engine-start');
    btn.classList.add('igniting');
    btn.querySelector('.btn-text').textContent = 'IGNITING...';

    const welcomeMessage = `尊贵的${memberLevel}会员，${nameInput}<br>感谢您选择芒果超跑<br>即将为您开启您的专属车库`;
    document.getElementById('welcomeMessage').innerHTML = `<p>${welcomeMessage}</p>`;

    setTimeout(() => {
      document.querySelector('.login-card').style.display = 'none';
      const cardsContainer = document.getElementById('welcomeCards');
      cardsContainer.style.display = 'block';
      cardsContainer.classList.add('animate-in');
    }, 800);
  }
});

document.getElementById('nextCardBtn').addEventListener('click', function () {
  const card1 = document.getElementById('card1');
  const card2 = document.getElementById('card2');
  const enterBtn = document.getElementById('enterGarageBtn');
  const deck = document.getElementById('welcomeCards');
  if (deck.classList.contains('welcome-cards--swap') || deck.classList.contains('welcome-cards--on-second')) {
    return;
  }
  const levelMatch = card1.className.match(/level-[a-z-]+/);
  const levelClass = levelMatch ? levelMatch[0] : '';

  enterBtn.style.display = 'block';

  card2.className = 'welcome-card welcome-card--second active-card ' + levelClass;

  requestAnimationFrame(function () {
    requestAnimationFrame(function () {
      deck.classList.add('welcome-cards--swap');
    });
  });

  var finished = false;
  function finish() {
    if (finished) return;
    finished = true;
    card1.setAttribute('hidden', '');
    card1.classList.remove('active-card');
    card2.classList.remove('welcome-card--second');
    deck.classList.remove('welcome-cards--swap');
    deck.classList.add('welcome-cards--on-second');
  }

  /* 与 CSS transition 时长一致；避免 transitionend 多属性多次触发导致提前收尾 */
  window.setTimeout(finish, 580);
});

document.getElementById('enterGarageBtn').addEventListener('click', function () {
  window.location.href = 'car.html#carSection';
});
