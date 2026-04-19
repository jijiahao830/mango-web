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
        if (
          n.classList &&
          (n.classList.contains('login-card') || n.classList.contains('officer-photo-stack'))
        ) {
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
      cache: 'no-store',
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
  return String(memberLevel || '').trim() || '普通';
}

function normalizeTierFromLevel(level) {
  var s = String(level || '');
  if (s.indexOf('黑') !== -1) return 'black';
  if (s.indexOf('金') !== -1) return 'gold';
  if (s.indexOf('银') !== -1 || s.indexOf('青') !== -1) return 'silver';
  return 'mango';
}

function highlightMemberBenefitsByLevel(level) {
  var tier = normalizeTierFromLevel(level);
  var roots = document.querySelectorAll('.member-benefits');
  if (!roots.length) return;
  roots.forEach(function (root) {
    root
      .querySelectorAll('.member-benefits__table .is-active-tier')
      .forEach(function (el) {
        el.classList.remove('is-active-tier');
      });
    root
      .querySelectorAll('.member-benefits__table [data-tier="' + tier + '"]')
      .forEach(function (el) {
        el.classList.add('is-active-tier');
      });
  });
}

document.getElementById('loginForm').addEventListener('submit', async function (e) {
  e.preventDefault();
  const nameInput = document.getElementById('driverName').value.trim();

  if (nameInput) {
    const memberLevel = await resolveMemberLevel(nameInput);
    highlightMemberBenefitsByLevel(memberLevel);
    let levelClass = '';

    if (memberLevel.includes('黑')) {
      levelClass = 'level-black';
    } else if (memberLevel.includes('金')) {
      levelClass = 'level-gold';
    } else if (memberLevel.includes('银') || memberLevel.includes('青')) {
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
    if (card2) card2.className = 'welcome-card welcome-card--second';
    card1.className = `welcome-card active-card ${levelClass}`;

    const btn = document.querySelector('.btn-engine-start');
    btn.classList.add('igniting');
    btn.querySelector('.btn-text').textContent = 'IGNITING...';

    const welcomeMessage = `尊贵的${memberLevel}会员：${nameInput}，感谢您选择芒果超跑`;
    document.getElementById('welcomeMessage').innerHTML = `<p>${welcomeMessage}</p>`;

    // --- 新增：为四个网格填充图片图标 ---
    const allIcons = [
      '1、专属会员标签.png', '2、会员价展示.png', '3、违章代办服务费.png', '4、租车折扣.png', '5、专属客服通道.png', 
      '5、基础积分积累.png', '7、生日礼券.png', '13、积分商城进阶区.png', '8、免费接送机(次:年).png', '9、异地还车手续费减免.png', '10、免费取送车.png', 
      '11、事故停运费减免.png', '12、免押金额度.png', '7、优先预订权.png', '15、专属活动邀约.png', '8、升舱体验卷.png'
    ];

    // 会员权益数据映射表
    const benefitsData = [
      {"权益项目":"专属会员标签","芒果派":"✓","青芒果":"✓","金芒果":"✓","黑芒果":"✓"},
      {"权益项目":"会员价展示","芒果派":"✓","青芒果":"✓","金芒果":"✓","黑芒果":"✓"},
      {"权益项目":"违章代办服务费","芒果派":"标准收费","青芒果":"5 折","金芒果":"3 折","黑芒果":"免费"},
      {"权益项目":"租车折扣","芒果派":"95折","青芒果":"92折","金芒果":"88折","黑芒果":"85折"},
      {"权益项目":"基础积分累积","芒果派":"✓","青芒果":"✓","金芒果":"✓","黑芒果":"✓"},
      {"权益项目":"专属客服通道","芒果派":"—","青芒果":"✓","金芒果":"✓","黑芒果":"✓"},
      {"权益项目":"生日礼券","芒果派":"—","青芒果":"✓","金芒果":"✓","黑芒果":"✓"},
      {"权益项目":"积分商城进阶区","芒果派":"—","青芒果":"✓","金芒果":"✓","黑芒果":"✓"},
      {"权益项目":"免费接送机(次/年)","芒果派":"—","青芒果":1,"金芒果":2,"黑芒果":4},
      {"权益项目":"异地还车手续费减免","芒果派":"—","青芒果":"8.8 折","金芒果":"8.5 折","黑芒果":"8 折"},
      {"权益项目":"免费取送车","芒果派":"—","青芒果":"7 天以上订单","金芒果":"3 天以上订单","黑芒果":"所有订单"},
      {"权益项目":"事故停运费减免","芒果派":"—","青芒果":"减免 10%","金芒果":"减免 20%","黑芒果":"减免 30%"},
      {"权益项目":"免押金额度","芒果派":"—","青芒果":"5千","金芒果":"1万","黑芒果":"2万"},
      {"权益项目":"优先预订权","芒果派":"—","青芒果":"—","金芒果":"✓","黑芒果":"✓"},
      {"权益项目":"专属活动邀约","芒果派":"—","青芒果":"—","金芒果":"试驾/品鉴","黑芒果":"晚宴/赛道日"},
      {"权益项目":"升舱体验券","芒果派":"—","青芒果":"—","金芒果":"✓","黑芒果":"✓"}
    ];

    const generateGridImagesHtml = (levelName) => {
      return allIcons.map((iconName, index) => {
        // 去掉前面的数字和中文顿号（例如 "1、专属会员标签.png" -> "专属会员标签"）
        const displayName = iconName.replace(/^\d+、/, '').replace('.png', '');
        
        // 获取对应权益的内容
        const benefitItem = benefitsData[index];
        const benefitValue = benefitItem ? String(benefitItem[levelName] || '').trim() : '';
        
        // 判断是否为 "—" 锁住状态
        const isLocked = benefitValue === '—';
        
        // 右下角的锁图标
        const lockIconHtml = isLocked 
          ? `<img class="welcome-grid-icon-lock" src="media-webp/photos/vip/锁.png" alt="锁定">` 
          : '';
          
        // 如果有权益（非锁定状态），给主图加一个特有的 class 以便应用淡橙色滤镜
        const imgClass = !isLocked ? 'welcome-grid-main-icon has-benefit-icon' : 'welcome-grid-main-icon';
          
        // 权益描述文字（只要没有被锁住就显示对应文案，包括 '✓'）
        const descHtml = (!isLocked) 
          ? `<div class="welcome-grid-icon-desc">${benefitValue}</div>` 
          : '<div class="welcome-grid-icon-desc" style="opacity:0;user-select:none;">-</div>';
        
        return `
          <div class="welcome-grid-icon-wrap">
            <div class="welcome-grid-img-container">
              <img class="${imgClass}" src="media-webp/photos/vip/${iconName}" alt="${displayName}" loading="lazy">
              ${lockIconHtml}
            </div>
            <div class="welcome-grid-icon-name">${displayName}</div>
            ${descHtml}
          </div>
        `;
      }).join('');
    };

    // 仅在存在权益网格容器时填充，避免缺少 DOM 时抛错中断登录流程
    var gridPai = document.getElementById('grid-mango-pai');
    var gridQing = document.getElementById('grid-mango-qing');
    var gridJin = document.getElementById('grid-mango-jin');
    var gridHei = document.getElementById('grid-mango-hei');
    if (gridPai) gridPai.innerHTML = generateGridImagesHtml('芒果派');
    if (gridQing) gridQing.innerHTML = generateGridImagesHtml('青芒果');
    if (gridJin) gridJin.innerHTML = generateGridImagesHtml('金芒果');
    if (gridHei) gridHei.innerHTML = generateGridImagesHtml('黑芒果');
    // ----------------------------------

    setTimeout(() => {
      document.querySelector('.login-card').style.display = 'none';
      const cardsContainer = document.getElementById('welcomeCards');
      cardsContainer.style.display = 'block';
      cardsContainer.classList.add('animate-in');
    }, 800);
  }
});

// 每次进入 login 页都尝试同步一次数据库中的会员等级（若已有登录态姓名）
(function syncMemberLevelOnLoginEnter() {
  var savedName = '';
  try {
    savedName = (sessionStorage.getItem('mango_driver_name') || '').trim();
  } catch (e) {
    savedName = '';
  }
  if (!savedName) {
    try {
      var savedLevel = sessionStorage.getItem('mango_driver_level');
      if (savedLevel) highlightMemberBenefitsByLevel(savedLevel);
    } catch (e2) {}
    return;
  }
  resolveMemberLevel(savedName)
    .then(function (latestLevel) {
      if (!latestLevel) return;
      try {
        sessionStorage.setItem('mango_driver_level', latestLevel);
      } catch (e3) {}
      highlightMemberBenefitsByLevel(latestLevel);
    })
    .catch(function () {
      try {
        var fallbackLevel = sessionStorage.getItem('mango_driver_level');
        if (fallbackLevel) highlightMemberBenefitsByLevel(fallbackLevel);
      } catch (e4) {}
    });
})();

function showSecondWelcomeCard() {
  /* 屏蔽“请选择一位交付官”页面：第一张欢迎卡后直接走下一步 */
  enterDeliveryGachaFromWelcome();
}

var nextCardBtnEl = document.getElementById('nextCardBtn');
if (nextCardBtnEl) {
  nextCardBtnEl.addEventListener('click', showSecondWelcomeCard);
  nextCardBtnEl.addEventListener(
    'touchend',
    function (e) {
      e.preventDefault();
      showSecondWelcomeCard();
    },
    { passive: false }
  );
}

/** 欢迎第二张卡片 → 进入交付官抽卡层 */
function enterDeliveryGachaFromWelcome() {
  const deck = document.getElementById('welcomeCards');
  if (!deck || deck.classList.contains('welcome-cards--to-gacha')) return;
  deck.classList.add('welcome-cards--to-gacha');
  window.setTimeout(function () {
    deck.style.display = 'none';
    /* 屏蔽交付官选择：从欢迎页直接进入车库 */
    try {
      sessionStorage.removeItem('mango_delivery_officer');
      sessionStorage.removeItem('mango_delivery_officer_id');
    } catch (e) {}
    window.location.href = 'car.html#carSection';
  }, 420);
}

var openGachaBtnEl = document.getElementById('openGachaBtn');
if (openGachaBtnEl) {
  openGachaBtnEl.addEventListener('click', enterDeliveryGachaFromWelcome);
  openGachaBtnEl.addEventListener(
    'touchend',
    function (e) {
      e.preventDefault();
      enterDeliveryGachaFromWelcome();
    },
    { passive: false }
  );
}

(function initDeliveryGacha() {
  const gacha = document.getElementById('deliveryGacha');
  const deck = document.getElementById('gachaDeck');
  const confirmBtn = document.getElementById('confirmDeliveryBtn');
  const enterBtn = document.getElementById('enterGarageBtn');
  const backBtn = document.getElementById('gachaBackBtn');
  const actionsEl = document.getElementById('deliveryGachaActions');
  if (!deck || !confirmBtn) return;

  (function bindOfficerPhotoFallbacks() {
    deck.querySelectorAll('.gacha-card--has-photo .gacha-card__photo-img').forEach(function (img) {
      var base = (img.getAttribute('data-officer-photo-base') || '').replace(/\/$/, '');
      if (!base) return;
      var candidates = [
        base + '/4-2.webp',
        base + '/4-1.webp',
        base + '/2-1.webp',
        base + '/2-2.webp',
        base + '/2-3.webp',
      ];
      var i = Math.max(
        0,
        candidates.findIndex(function (p) {
          return (img.getAttribute('src') || '') === p;
        })
      );
      img.addEventListener('error', function onErr() {
        i += 1;
        if (i < candidates.length) {
          img.src = candidates[i];
        } else {
          img.removeEventListener('error', onErr);
        }
      });
    });
  })();

  const officerDetailStack = document.getElementById('officerDetailStack');
  var officerPhotoWallSyncRaf = null;
  var officerCopyResizeObserver = null;

  /** 宽屏：左栏影像区总高度 = 右侧文案区高度 + 50px（对齐「芒果租车｜体验顾问…」底边以下 50px） */
  function clearOfficerPhotoWallHeightSync() {
    ['1', '2', '3'].forEach(function (oid) {
      var root = document.querySelector('.officer-detail--rich[data-officer-detail="' + oid + '"]');
      if (!root) return;
      var wall = root.querySelector('.officer-photo-wall--stack');
      var stack = root.querySelector('.officer-photo-stack');
      if (wall) wall.style.removeProperty('min-height');
      if (stack) stack.style.removeProperty('max-height');
    });
  }

  function syncOfficerPhotoWallHeightToCopy() {
    if (typeof window.matchMedia === 'function' && !window.matchMedia('(min-width: 860px)').matches) {
      clearOfficerPhotoWallHeightSync();
      return;
    }
    var root = document.querySelector('.officer-detail--rich:not([hidden])');
    if (!root || root.classList.contains('officer-detail--placeholder')) return;
    var copy = root.querySelector('.officer-detail__copy');
    var wall = root.querySelector('.officer-photo-wall--stack');
    var stack = root.querySelector('.officer-photo-stack');
    if (!copy || !wall || !stack) return;
    var h = copy.offsetHeight + 50;
    wall.style.minHeight = h + 'px';
    stack.style.maxHeight = h + 'px';
  }

  function scheduleSyncOfficerPhotoWallHeight() {
    if (officerPhotoWallSyncRaf !== null) window.cancelAnimationFrame(officerPhotoWallSyncRaf);
    officerPhotoWallSyncRaf = window.requestAnimationFrame(function () {
      officerPhotoWallSyncRaf = null;
      syncOfficerPhotoWallHeightToCopy();
    });
  }

  function detachOfficerCopyResizeObserver() {
    if (officerCopyResizeObserver) {
      officerCopyResizeObserver.disconnect();
      officerCopyResizeObserver = null;
    }
  }

  function attachOfficerCopyResizeObserver(copyEl) {
    detachOfficerCopyResizeObserver();
    if (!copyEl || typeof ResizeObserver === 'undefined') return;
    officerCopyResizeObserver = new ResizeObserver(function () {
      scheduleSyncOfficerPhotoWallHeight();
    });
    officerCopyResizeObserver.observe(copyEl);
  }

  const pickerConfirmWrap = document.getElementById('gachaPickerConfirmWrap');
  const pickerConfirmBtn = document.getElementById('gachaPickerConfirmBtn');
  const gachaPickerEl = document.getElementById('gachaPicker');

  var pendingCardForDetail = null;
  var spinSequenceFinished = false;
  var gachaSpinFallbackTimer = null;
  /** 为 true：整块「确定」隐藏，直至本次旋转结束 */
  var gachaConfirmHiddenUntilSpinDone = true;
  /** 首次旋转结束并显示「确定」后为 true，之后始终保留按钮与条带（换卡、进详情返回也不再隐藏） */
  var gachaPickerConfirmStayVisible = false;

  function hidePickerConfirm() {
    if (gachaPickerConfirmStayVisible) return;
    if (pickerConfirmWrap) pickerConfirmWrap.hidden = true;
    if (pickerConfirmBtn) pickerConfirmBtn.disabled = true;
  }

  function showPickerConfirm() {
    if (pickerConfirmWrap) pickerConfirmWrap.hidden = false;
    if (pickerConfirmBtn) pickerConfirmBtn.disabled = false;
  }

  function disablePickerConfirmOnly() {
    if (pickerConfirmBtn) pickerConfirmBtn.disabled = true;
  }

  hidePickerConfirm();

  function showGachaPicker() {
    if (gacha) {
      gacha.classList.remove('delivery-gacha--showing-detail');
      gacha.scrollTop = 0;
    }
    if (gachaSpinFallbackTimer !== null) {
      window.clearTimeout(gachaSpinFallbackTimer);
      gachaSpinFallbackTimer = null;
    }
    pendingCardForDetail = null;
    spinSequenceFinished = false;
    if (!gachaPickerConfirmStayVisible) {
      gachaConfirmHiddenUntilSpinDone = true;
      if (gachaPickerEl) gachaPickerEl.classList.remove('gacha-picker--confirm-strip');
      hidePickerConfirm();
    }
    deck.classList.remove('gacha-deck--busy');
    detachOfficerCopyResizeObserver();
    clearOfficerPhotoWallHeightSync();
    if (officerDetailStack) {
      officerDetailStack.querySelectorAll('.officer-photo-stack').forEach(function (el) {
        el.scrollTop = 0;
      });
    }
    if (officerDetailStack) officerDetailStack.hidden = true;
    if (backBtn) backBtn.hidden = true;
    if (actionsEl) actionsEl.hidden = true;
    confirmBtn.disabled = true;
    confirmBtn.style.display = '';
    enterBtn.style.display = 'none';
    /* 从详情返回抽卡区：保留已翻开的卡片状态与当前选中记录 */
    deck.querySelectorAll('.gacha-card').forEach(function (c) {
      c.classList.remove('is-spinning');
      c.style.removeProperty('transition');
    });
  }

  function revealOfficerDetailAfterCard(card) {
    confirmBtn.disabled = false;

    if (gacha) {
      gacha.classList.add('delivery-gacha--showing-detail');
      gacha.scrollTop = 0;
    }
    if (backBtn) backBtn.hidden = false;
    if (actionsEl) actionsEl.hidden = false;

    var oid = card.getAttribute('data-officer-id') || '';
    if (officerDetailStack) {
      officerDetailStack.hidden = false;
      officerDetailStack.querySelectorAll('.officer-detail').forEach(function (el) {
        var match = el.getAttribute('data-officer-detail') === oid;
        el.hidden = !match;
      });
    }

    var detailRoot = document.querySelector('.officer-detail--rich[data-officer-detail="' + oid + '"]');
    var stackEl = detailRoot ? detailRoot.querySelector('.officer-photo-stack') : null;
    var copyEl = detailRoot ? detailRoot.querySelector('.officer-detail__copy') : null;
    if (stackEl && copyEl) {
      window.requestAnimationFrame(function () {
        stackEl.scrollTop = 0;
        window.requestAnimationFrame(function () {
          syncOfficerPhotoWallHeightToCopy();
          attachOfficerCopyResizeObserver(copyEl);
        });
      });
    } else {
      detachOfficerCopyResizeObserver();
      clearOfficerPhotoWallHeightSync();
    }

    deck.classList.remove('gacha-deck--busy');
  }

  function setPicked(card) {
    if (deck.classList.contains('gacha-deck--busy')) return;

    if (gachaSpinFallbackTimer !== null) {
      window.clearTimeout(gachaSpinFallbackTimer);
      gachaSpinFallbackTimer = null;
    }

    /* 「确定」已出现后，点击已翻开的牌：只切换选中样式，不重新旋转 */
    if (
      gachaPickerConfirmStayVisible &&
      card.classList.contains('is-flipped') &&
      !card.classList.contains('is-spinning')
    ) {
      deck.querySelectorAll('.gacha-card').forEach(function (c) {
        c.classList.remove('gacha-card--selected', 'is-picked');
        c.setAttribute('aria-pressed', 'false');
      });
      card.classList.add('gacha-card--selected', 'is-picked');
      card.setAttribute('aria-pressed', 'true');
      pendingCardForDetail = card;
      return;
    }

    spinSequenceFinished = false;
    pendingCardForDetail = null;
    if (gachaConfirmHiddenUntilSpinDone) {
      hidePickerConfirm();
    } else if (!gachaPickerConfirmStayVisible) {
      /* 首次翻卡后「确定」常驻：再点其他牌开转时不再禁用按钮，避免样式变灰 */
      disablePickerConfirmOnly();
    }

    deck.classList.add('gacha-deck--busy');
    deck.querySelectorAll('.gacha-card').forEach(function (c) {
      c.classList.remove('is-picked', 'is-spinning', 'gacha-card--selected');
      c.style.removeProperty('transition');
      c.setAttribute('aria-pressed', 'false');
      /* 仅重置本次点击的牌，其它已翻开的牌保持正面朝上，不再翻回背面 */
      if (c === card) {
        c.classList.remove('is-flipped');
      }
    });

    var reduced =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function finishSpinSequence() {
      if (spinSequenceFinished) return;
      if (gachaSpinFallbackTimer !== null) {
        window.clearTimeout(gachaSpinFallbackTimer);
        gachaSpinFallbackTimer = null;
      }
      spinSequenceFinished = true;
      card.classList.remove('is-spinning');
      card.style.removeProperty('transition');
      deck.querySelectorAll('.gacha-card').forEach(function (x) {
        x.classList.remove('gacha-card--selected');
      });
      card.classList.add('gacha-card--selected');
      pendingCardForDetail = card;
      if (gachaPickerEl) gachaPickerEl.classList.add('gacha-picker--confirm-strip');
      gachaConfirmHiddenUntilSpinDone = false;
      gachaPickerConfirmStayVisible = true;
      showPickerConfirm();
      deck.classList.remove('gacha-deck--busy');
    }

    if (reduced) {
      card.style.setProperty('transition', 'none');
      card.classList.add('is-flipped', 'is-picked');
      card.setAttribute('aria-pressed', 'true');
      window.requestAnimationFrame(finishSpinSequence);
      return;
    }

    var spinStarted = false;

    function startSpin() {
      if (spinStarted) return;
      spinStarted = true;
      card.addEventListener(
        'animationend',
        function onSpinEnd(e) {
          var name = e.animationName || '';
          if (name.indexOf('gacha-card-spin-reveal') === -1) return;
          if (gachaSpinFallbackTimer !== null) {
            window.clearTimeout(gachaSpinFallbackTimer);
            gachaSpinFallbackTimer = null;
          }
          finishSpinSequence();
        },
        { once: true }
      );
      card.classList.add('is-spinning');
      gachaSpinFallbackTimer = window.setTimeout(finishSpinSequence, 3200);
    }

    /* 无翻面过渡：瞬间到正面后立即 Y 轴旋转 */
    card.style.setProperty('transition', 'none');
    card.classList.add('is-flipped', 'is-picked');
    card.setAttribute('aria-pressed', 'true');
    void card.offsetHeight;
    window.requestAnimationFrame(function () {
      window.requestAnimationFrame(startSpin);
    });
  }

  if (backBtn) {
    backBtn.addEventListener('click', function () {
      showGachaPicker();
    });
  }

  if (pickerConfirmBtn) {
    pickerConfirmBtn.addEventListener('click', function () {
      if (deck.classList.contains('gacha-deck--busy')) return;
      var c = deck.querySelector('.gacha-card.gacha-card--selected');
      if (!c) c = pendingCardForDetail;
      if (!c) return;
      pendingCardForDetail = null;
      spinSequenceFinished = false;
      hidePickerConfirm();
      revealOfficerDetailAfterCard(c);
    });
  }

  deck.querySelectorAll('.gacha-card').forEach(function (card) {
    card.addEventListener('click', function () {
      setPicked(card);
    });
  });

  confirmBtn.addEventListener('click', function () {
    const picked =
      deck.querySelector('.gacha-card.gacha-card--selected') ||
      deck.querySelector('.gacha-card.is-picked');
    if (!picked) return;
    var name = picked.getAttribute('data-name') || '';
    var id = picked.getAttribute('data-officer-id') || '';
    try {
      sessionStorage.setItem('mango_delivery_officer', name);
      sessionStorage.setItem('mango_delivery_officer_id', id);
    } catch (e) {}
    confirmBtn.style.display = 'none';
    enterBtn.style.display = 'inline-flex';
  });

  enterBtn.addEventListener('click', function () {
    window.location.href = 'car.html#carSection';
  });
})();
