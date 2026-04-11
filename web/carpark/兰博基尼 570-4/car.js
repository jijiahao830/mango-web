// 经典使用场景：摆展 / 出行 切换（与 car.html data-scenario="chuxing" 一致）
function initScenarioShowcase570() {
  var scenarioPictureSource = document.getElementById('scenarioPictureSource');
  var scenarioPictureImg = document.getElementById('scenarioPictureImg');
  var scenarioShowcaseDesc = document.getElementById('scenarioShowcaseDesc');
  var scenarioFeatures = document.getElementById('scenarioFeatures');
  var scenarioTabs = document.querySelectorAll('.scenario-tab[data-scenario]');

  if (!scenarioPictureSource || !scenarioPictureImg || !scenarioShowcaseDesc || !scenarioFeatures || !scenarioTabs.length) {
    return;
  }

  var scenarios = {
    baizhan: {
      webp: '/media/photos/carpark/兰博基尼 570-4/场景-摆展.webp',
      jpg: '/media/photos/carpark/兰博基尼 570-4/场景-摆展.jpg',
      alt: '经典使用场景 · 摆展',
      desc: '在高端商场或时尚派对上，这台橙色兰博基尼无疑是瞩目焦点。极具侵略性的赛道外观，能瞬间吸引目光带来流量。',
      features: [
        '✓ 耀眼夺目的橙色涂装',
        '✓ 极具侵略性的赛道外观',
        '✓ 吸引眼球的吸睛神器',
        '✓ 提升活动现场的高级感'
      ]
    },
    chuxing: {
      webp: '/media/photos/carpark/兰博基尼 570-4/场景-出行.webp',
      jpg: '/media/photos/carpark/兰博基尼 570-4/场景-出行.jpg',
      alt: '经典使用场景 · 出行',
      desc: '公路巡航、周末短途或山路驾驶——Huracán 570-4 的中置 V10 与四驱抓地让每一段路程都充满驾驶乐趣。开阔视野与超跑坐姿，让「出行」本身充满仪式感。',
      features: [
        '✓ V10 自吸线性爆发，声浪高亢',
        '✓ 四驱稳健，晴雨路况更安心',
        '✓ 公路巡航与跑山皆宜',
        '✓ 超跑出街，回头率拉满'
      ]
    }
  };

  function applyScenario(key) {
    var data = scenarios[key];
    if (!data) return;

    scenarioPictureSource.srcset = data.webp;
    scenarioPictureImg.src = data.jpg;
    scenarioPictureImg.alt = data.alt;
    scenarioShowcaseDesc.textContent = data.desc;
    scenarioFeatures.innerHTML = data.features.map(function (line) {
      return '<li>' + line + '</li>';
    }).join('');

    scenarioTabs.forEach(function (tab) {
      var active = tab.getAttribute('data-scenario') === key;
      tab.classList.toggle('active', active);
      tab.setAttribute('aria-selected', active ? 'true' : 'false');
    });
  }

  scenarioTabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      var key = tab.getAttribute('data-scenario');
      if (key) applyScenario(key);
    });
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initScenarioShowcase570);
} else {
  initScenarioShowcase570();
}

// Hero Video Control
document.addEventListener('DOMContentLoaded', function() {
  const heroVideo = document.querySelector('.hero-detail video');
  const heroSection = document.querySelector('.hero-detail');
  
  if (heroVideo && heroSection) {
    const videoObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        // 只要有一点被遮挡（可见度小于 99%），就暂停视频
        if (entry.isIntersecting && entry.intersectionRatio >= 0.99) {
          heroVideo.play().catch(e => console.log("Autoplay prevented:", e));
        } else {
          heroVideo.pause();
        }
      });
    }, {
      root: null,
      threshold: [0, 0.1, 0.5, 0.9, 0.99, 1.0]
    });
    
    videoObserver.observe(heroSection);
  }
});

// Gallery interaction
const thumbnails = document.querySelectorAll('.thumbnail-item');
const featuredSource = document.getElementById('featuredSource');
const featuredImage = document.getElementById('featuredImage');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
let currentIndex = 0;

// data-image: jpg/png path; script sets WebP source + fallback <img>
let imageSources = Array.from(thumbnails).map(thumb => thumb.dataset.image);

// Dynamically update the image sources array in case thumbnails were changed
function updateImageSources() {
  const currentThumbnails = document.querySelectorAll('.thumbnail-item');
  imageSources = Array.from(currentThumbnails).map(thumb => thumb.dataset.image);
}
updateImageSources();

function updateGallery(index) {
  const path = imageSources[index];
  let fallback;
  let webp;
  if (/\.webp$/i.test(path)) {
    webp = path;
    fallback = path.replace(/\.webp$/i, '.jpg');
  } else {
    fallback = path;
    webp = path.replace(/\.(jpe?g|png)$/i, '.webp');
  }
  featuredImage.style.opacity = '0';
  setTimeout(() => {
    if (featuredSource) featuredSource.srcset = webp.replace(/ /g, '%20');
    featuredImage.src = fallback;
    featuredImage.style.opacity = '1';
  }, 200);

  // Update active thumbnail
  const currentThumbnails = document.querySelectorAll('.thumbnail-item');
  currentThumbnails.forEach(t => t.classList.remove('active'));
  if (currentThumbnails[index]) {
    currentThumbnails[index].classList.add('active');
  }

  currentIndex = index;
}

// Thumbnail click
const allThumbnails = document.querySelectorAll('.thumbnail-item');
allThumbnails.forEach((thumb, index) => {
  thumb.addEventListener('click', function() {
    updateGallery(index);
  });
});

// Previous / Next（缺省时不绑定，避免整段脚本中断）
if (prevBtn && nextBtn && featuredImage) {
  prevBtn.addEventListener('click', function() {
    const newIndex = (currentIndex - 1 + imageSources.length) % imageSources.length;
    updateGallery(newIndex);
  });

  nextBtn.addEventListener('click', function() {
    const newIndex = (currentIndex + 1) % imageSources.length;
    updateGallery(newIndex);
  });

  document.addEventListener('keydown', function(e) {
    if (e.key === 'ArrowLeft') {
      prevBtn.click();
    } else if (e.key === 'ArrowRight') {
      nextBtn.click();
    }
  });
}

// Smooth scroll for internal links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      target.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
  });
});

// Gallery lightbox effect - removed old code

// Scroll animations
const observerOptions = {
  threshold: 0.1,
  rootMargin: '0px 0px -100px 0px'
};

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.style.opacity = '1';
      entry.target.style.transform = 'translateY(0)';
    }
  });
}, observerOptions);

// Observe elements for animation
document.querySelectorAll('.stat-card, .feature-card, .spec-group, .thumbnail-item').forEach(el => {
  el.style.opacity = '0';
  el.style.transform = 'translateY(30px)';
  el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
  observer.observe(el);
});

// Reserve button actions（含右侧悬浮按钮）
document.querySelectorAll('.btn-reserve, .btn-primary, #detailFabActions .btn-ghost').forEach(btn => {
  btn.addEventListener('click', function() {
    alert('预约功能开发中，请联系客服：400-888-8888');
  });
});

// 右侧悬浮：Hero Section 在视口内时隐藏，滚出 Hero 后在其余区域显示
(function () {
  var heroSection = document.querySelector('.hero-detail');
  var fab = document.getElementById('detailFabActions');
  if (!heroSection || !fab) return;

  function heroIntersectsViewport() {
    var rect = heroSection.getBoundingClientRect();
    var vh = window.innerHeight;
    return rect.bottom > 0 && rect.top < vh;
  }

  function syncFab() {
    if (heroIntersectsViewport()) {
      fab.classList.remove('is-visible');
      fab.setAttribute('aria-hidden', 'true');
    } else {
      fab.classList.add('is-visible');
      fab.setAttribute('aria-hidden', 'false');
    }
  }

  window.addEventListener('scroll', syncFab, { passive: true });
  window.addEventListener('resize', syncFab);
  syncFab();
})();

// 兰博基尼风格一键启动系统
var ignitionCover = document.getElementById('ignitionCover');
var ignitionBtn = document.getElementById('ignitionBtn');
var engineAudio = document.getElementById('engine-audio');
var isPlaying = false;

function stopIgnitionPlaybackImmediate() {
  if (!engineAudio || !ignitionBtn) return;
  engineAudio.pause();
  engineAudio.currentTime = 0;
  ignitionBtn.classList.remove('ignited', 'fading');
  isPlaying = false;
  if (ignitionCover) ignitionCover.classList.remove('open');
}

if (ignitionBtn && engineAudio) {
  // 移动端：点击盖子打开/关闭；播放声浪中再点盖子则立即停播
  if (ignitionCover) {
    ignitionCover.addEventListener('click', function(e) {
      e.stopPropagation();
      if (isPlaying) {
        stopIgnitionPlaybackImmediate();
        return;
      }
      this.classList.toggle('open');
    });
  }

  ignitionBtn.addEventListener('click', function(e) {
    e.stopPropagation();
    if (isPlaying) {
      stopIgnitionPlaybackImmediate();
      return;
    }

    // 确保盖子处于打开状态
    if (ignitionCover) ignitionCover.classList.add('open');

    // 点亮按钮
    isPlaying = true;
    ignitionBtn.classList.add('ignited');

    // 播放声浪
    engineAudio.currentTime = 0;
    var playPromise = engineAudio.play();

    if (playPromise !== undefined) {
      playPromise.catch(function(error) {
        console.log('Audio playback failed:', error);
        ignitionBtn.classList.remove('ignited');
        isPlaying = false;
      });
    }
  });

  // 播放完成后熄灭 + 盖子盖回
  engineAudio.addEventListener('ended', function() {
    isPlaying = false;
    ignitionBtn.classList.add('fading');
    ignitionBtn.classList.remove('ignited');

    setTimeout(function() {
      ignitionBtn.classList.remove('fading');
      // 盖子盖回来
      if (ignitionCover) ignitionCover.classList.remove('open');
    }, 1000);
  });
}
