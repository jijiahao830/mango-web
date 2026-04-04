/**
 * login.html — 会员登录、欢迎卡片与进入车库
 * 依赖 head：./members.js（可选 membersData）、window.MANGO_API_ORIGIN
 */
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

  card1.style.transform = 'translateX(-120%) rotateY(-20deg)';
  card1.style.opacity = '0';

  setTimeout(() => {
    const currentLevelClass = card1.className.match(/level-[a-z]+/);
    card2.className = `welcome-card active-card ${currentLevelClass ? currentLevelClass[0] : ''}`;
    enterBtn.style.display = 'block';
  }, 300);
});

document.getElementById('enterGarageBtn').addEventListener('click', function () {
  window.location.href = 'car.html#carSection';
});
