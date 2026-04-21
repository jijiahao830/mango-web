document.addEventListener('DOMContentLoaded', function () {
  var trigger = document.querySelector('.package-order-trigger');
  if (!trigger) return;

  var scenarioMap = {
    'page-package-business': '商务',
    'page-package-wedding': '婚庆',
    'page-package-event': '摆展',
  };

  var scenario = '未知场景';
  Object.keys(scenarioMap).forEach(function (cls) {
    if (document.body.classList.contains(cls)) scenario = scenarioMap[cls];
  });

  function apiBase() {
    var o =
      typeof window.MANGO_API_ORIGIN !== 'undefined'
        ? String(window.MANGO_API_ORIGIN || '').replace(/\/$/, '')
        : '';
    return o || String(location.origin || '').replace(/\/$/, '');
  }

  function ensureOrderModals() {
    if (!document.getElementById('packageSelectModal')) {
      document.body.insertAdjacentHTML(
        'beforeend',
        '<div id="packageSelectModal" class="days-select-modal" hidden>' +
          '<div class="days-select-content">' +
            '<div class="days-select-header">请选择套餐</div>' +
            '<div class="days-select-options" id="packageSelectOptions"></div>' +
            '<div class="days-select-footer">确认后进入与选车清单一致的提交流程</div>' +
            '<button class="days-select-close" id="packageSelectCloseBtn">×</button>' +
          '</div>' +
        '</div>'
      );
    }

    if (!document.getElementById('wecomPhoneModal')) {
      document.body.insertAdjacentHTML(
        'beforeend',
        '<section class="phone-modal" id="wecomPhoneModal" hidden>' +
          '<div class="phone-modal__backdrop" data-phone-cancel="1"></div>' +
          '<div class="phone-modal__card" role="dialog" aria-modal="true" aria-labelledby="wecomPhoneTitle">' +
            '<h3 class="phone-modal__title" id="wecomPhoneTitle">请输入您的手机号，稍后客服会联系您</h3>' +
            '<input type="tel" inputmode="numeric" maxlength="11" class="phone-modal__input" id="wecomPhoneInput" placeholder="请输入手机号" />' +
            '<p class="phone-modal__error" id="wecomPhoneError" hidden>请输入正确的11位手机号</p>' +
            '<div class="phone-modal__actions">' +
              '<button type="button" class="phone-modal__btn phone-modal__btn--ghost" id="wecomPhoneCancelBtn">取消</button>' +
              '<button type="button" class="phone-modal__btn phone-modal__btn--primary" id="wecomPhoneSubmitBtn">发送</button>' +
            '</div>' +
          '</div>' +
        '</section>' +
        '<section class="phone-modal" id="wecomSuccessModal" hidden>' +
          '<div class="phone-modal__backdrop"></div>' +
          '<div class="phone-modal__card phone-modal__card--success" role="dialog" aria-modal="true" aria-labelledby="wecomSuccessTitle">' +
            '<h3 class="phone-modal__title" id="wecomSuccessTitle">客服已收到您的信息，请稍等</h3>' +
            '<div class="phone-modal__actions phone-modal__actions--center">' +
              '<button type="button" class="phone-modal__btn phone-modal__btn--primary" id="wecomSuccessOkBtn">确定</button>' +
            '</div>' +
          '</div>' +
        '</section>' +
        '<section class="phone-modal" id="wecomFailModal" hidden>' +
          '<div class="phone-modal__backdrop"></div>' +
          '<div class="phone-modal__card phone-modal__card--success" role="dialog" aria-modal="true" aria-labelledby="wecomFailTitle">' +
            '<h3 class="phone-modal__title" id="wecomFailTitle">发送失败，请稍后重试</h3>' +
            '<div class="phone-modal__actions phone-modal__actions--center">' +
              '<button type="button" class="phone-modal__btn phone-modal__btn--primary" id="wecomFailOkBtn">确定</button>' +
            '</div>' +
          '</div>' +
        '</section>'
      );
    }
  }

  function parseCarCount(text) {
    var s = String(text || '');
    var reg = /[×xX]\s*(\d+)/g;
    var m;
    var total = 0;
    while ((m = reg.exec(s))) {
      total += parseInt(m[1], 10) || 0;
    }
    return total;
  }

  function parsePriceNumber(priceText) {
    var s = String(priceText || '').trim().replace(/,/g, '');
    var m = s.match(/(\d+(?:\.\d+)?)/);
    if (!m) return null;
    var n = Number(m[1]);
    return isFinite(n) ? n : null;
  }

  function escHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function formatCarLineForWrap(text) {
    // 关键分隔符插入可换行断点，保证括号内容和组合车型能自然换行。
    return escHtml(text)
      .replace(/（/g, '（<wbr>')
      .replace(/）/g, '<wbr>）')
      .replace(/\//g, '/<wbr>')
      .replace(/\+/g, '+<wbr>')
      .replace(/×/g, '<wbr>×<wbr>');
  }

  function parsePackageFromDom() {
    var steps = Array.prototype.slice.call(document.querySelectorAll('.package-steps .package-step'));
    return steps.map(function (step, idx) {
      var name = (step.querySelector('.package-step__num') || {}).textContent || ('套餐 ' + (idx + 1));
      name = String(name).trim();
      var rows = Array.prototype.slice.call(step.querySelectorAll('.package-plan-row')).map(function (row) {
        return {
          car: String((row.querySelector('.package-plan-car') || {}).textContent || '').trim(),
          price: String((row.querySelector('.package-plan-price') || {}).textContent || '').trim(),
        };
      }).filter(function (r) {
        return r.car;
      });
      var totalText = String((step.querySelector('.package-plan-total-price') || {}).textContent || '').trim();
      if (!totalText) {
        var nums = rows.map(function (r) {
          return parsePriceNumber(r.price);
        });
        var allKnown = nums.length > 0 && nums.every(function (n) { return n != null; });
        if (allKnown) {
          var sum = nums.reduce(function (a, b) { return a + b; }, 0);
          totalText = '¥' + Math.round(sum).toLocaleString('zh-CN');
        } else {
          totalText = rows.length === 1 && rows[0].price ? rows[0].price : '按需核算';
        }
      }
      var count = rows.reduce(function (sum, r) {
        return sum + parseCarCount(r.car);
      }, 0);
      var hasCustom = rows.some(function (r) {
        return r.car.indexOf('自由组合') !== -1;
      });
      return {
        name: name,
        rows: rows,
        totalText: totalText,
        countText: hasCustom ? '按需配置' : (count > 0 ? (count + '台') : (rows.length + '台')),
      };
    });
  }

  ensureOrderModals();

  var packageSelectModal = document.getElementById('packageSelectModal');
  var packageSelectOptions = document.getElementById('packageSelectOptions');
  var packageSelectCloseBtn = document.getElementById('packageSelectCloseBtn');
  var phoneModal = document.getElementById('wecomPhoneModal');
  var phoneInput = document.getElementById('wecomPhoneInput');
  var phoneError = document.getElementById('wecomPhoneError');
  var phoneCancelBtn = document.getElementById('wecomPhoneCancelBtn');
  var phoneSubmitBtn = document.getElementById('wecomPhoneSubmitBtn');
  var successModal = document.getElementById('wecomSuccessModal');
  var successOkBtn = document.getElementById('wecomSuccessOkBtn');
  var failModal = document.getElementById('wecomFailModal');
  var failOkBtn = document.getElementById('wecomFailOkBtn');

  var packages = parsePackageFromDom();
  var selectedPackage = null;

  function openPackageModal() {
    if (!packageSelectModal || !packageSelectOptions) return;
    packageSelectOptions.innerHTML = packages
      .map(function (p, idx) {
        var linesHtml = p.rows
          .map(function (r) {
            return (
              '<div class="package-option-line">' +
                '<span class="package-option-car">' + formatCarLineForWrap(r.car) + '</span>' +
              '</div>'
            );
          })
          .join('');
        return (
          '<div class="days-option-row package-option-row">' +
            '<div class="package-option-main">' +
              '<div class="days-label">' + escHtml(p.name) + '</div>' +
              '<div class="package-option-lines">' + linesHtml + '</div>' +
            '</div>' +
            '<span class="package-option-total">价格：' + escHtml(p.totalText) + '</span>' +
            '<button class="days-confirm-btn" data-package-index="' + idx + '">确认</button>' +
          '</div>'
        );
      })
      .join('');
    packageSelectModal.hidden = false;
  }

  function closePackageModal() {
    if (packageSelectModal) packageSelectModal.hidden = true;
  }

  function buildChecklistLines(pkg) {
    var lines = [];
    lines.push('使用场景：' + scenario);
    lines.push('已选套餐：' + pkg.name);
    lines.push('套餐车辆：' + pkg.countText);
    pkg.rows.forEach(function (r) {
      lines.push(r.car + ' ' + r.price);
    });
    lines.push('合计：' + pkg.totalText);
    return lines;
  }

  function sendOrder(phone) {
    if (!selectedPackage) return;
    var payload = {
      user: String(sessionStorage.getItem('mango_driver_name') || '未登录用户'),
      phone: String(phone || '').trim(),
      lines: buildChecklistLines(selectedPackage),
    };

    fetch(apiBase() + '/api/wecom/checklist-send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      credentials: 'omit',
    })
      .then(function (res) {
        return res.json().catch(function () { return {}; }).then(function (j) {
          return { ok: res.ok, j: j || {} };
        });
      })
      .then(function (o) {
        if (o.ok && o.j && o.j.ok) {
          if (successModal) successModal.hidden = false;
        } else {
          if (failModal) failModal.hidden = false;
        }
      })
      .catch(function () {
        if (failModal) failModal.hidden = false;
      });
  }

  trigger.addEventListener('click', function () {
    openPackageModal();
  });

  if (packageSelectCloseBtn) {
    packageSelectCloseBtn.addEventListener('click', closePackageModal);
  }

  if (packageSelectOptions) {
    packageSelectOptions.addEventListener('click', function (e) {
      var btn = e.target && e.target.closest ? e.target.closest('[data-package-index]') : null;
      if (!btn) return;
      var idx = parseInt(btn.getAttribute('data-package-index'), 10);
      if (!isFinite(idx) || !packages[idx]) return;
      selectedPackage = packages[idx];
      closePackageModal();
      if (phoneModal) {
        phoneModal.hidden = false;
        if (phoneInput) {
          phoneInput.value = '';
          phoneInput.focus();
        }
        if (phoneError) phoneError.hidden = true;
      }
    });
  }

  if (phoneCancelBtn && phoneModal) {
    phoneCancelBtn.addEventListener('click', function () {
      phoneModal.hidden = true;
    });
  }

  if (phoneSubmitBtn && phoneModal) {
    phoneSubmitBtn.addEventListener('click', function () {
      var phone = phoneInput ? String(phoneInput.value || '').replace(/\s+/g, '') : '';
      if (!/^1\d{10}$/.test(phone)) {
        if (phoneError) phoneError.hidden = false;
        return;
      }
      if (phoneError) phoneError.hidden = true;
      phoneModal.hidden = true;
      sendOrder(phone);
    });
  }

  if (successOkBtn && successModal) {
    successOkBtn.addEventListener('click', function () {
      successModal.hidden = true;
    });
  }
  if (failOkBtn && failModal) {
    failOkBtn.addEventListener('click', function () {
      failModal.hidden = true;
    });
  }

  document.addEventListener('click', function (e) {
    var cancelBackdrop = e.target && e.target.getAttribute && e.target.getAttribute('data-phone-cancel');
    if (cancelBackdrop === '1' && phoneModal && !phoneModal.hidden) {
      phoneModal.hidden = true;
    }
    if (packageSelectModal && !packageSelectModal.hidden) {
      var content = e.target && e.target.closest ? e.target.closest('.days-select-content') : null;
      if (!content && e.target === packageSelectModal) {
        closePackageModal();
      }
    }
  });
});
