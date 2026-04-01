// Gallery interaction
const thumbnails = document.querySelectorAll('.thumbnail-item');
const featuredSource = document.getElementById('featuredSource');
const featuredImage = document.getElementById('featuredImage');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
let currentIndex = 0;

// data-image: jpg/png path; script sets WebP source + fallback <img>
const imageSources = Array.from(thumbnails).map(thumb => thumb.dataset.image);

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
  thumbnails.forEach(t => t.classList.remove('active'));
  thumbnails[index].classList.add('active');

  currentIndex = index;
}

// Thumbnail click
thumbnails.forEach((thumb, index) => {
  thumb.addEventListener('click', function() {
    updateGallery(index);
  });
});

// Previous button
prevBtn.addEventListener('click', function() {
  const newIndex = (currentIndex - 1 + imageSources.length) % imageSources.length;
  updateGallery(newIndex);
});

// Next button
nextBtn.addEventListener('click', function() {
  const newIndex = (currentIndex + 1) % imageSources.length;
  updateGallery(newIndex);
});

// Keyboard navigation
document.addEventListener('keydown', function(e) {
  if (e.key === 'ArrowLeft') {
    prevBtn.click();
  } else if (e.key === 'ArrowRight') {
    nextBtn.click();
  }
});

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

// Reserve button actions
document.querySelectorAll('.btn-reserve, .btn-primary').forEach(btn => {
  btn.addEventListener('click', function() {
    alert('预约功能开发中，请联系客服：400-888-8888');
  });
});

// 兰博基尼风格一键启动系统
var ignitionCover = document.getElementById('ignitionCover');
var ignitionBtn = document.getElementById('ignitionBtn');
var engineAudio = document.getElementById('engine-audio');
var isPlaying = false;

if (ignitionBtn && engineAudio) {
  // 移动端：点击盖子打开/关闭
  if (ignitionCover) {
    ignitionCover.addEventListener('click', function(e) {
      e.stopPropagation();
      this.classList.toggle('open');
    });
  }

  ignitionBtn.addEventListener('click', function() {
    if (isPlaying) return;

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
    ignitionBtn.classList.add('fading');
    ignitionBtn.classList.remove('ignited');

    setTimeout(function() {
      ignitionBtn.classList.remove('fading');
      isPlaying = false;
      // 盖子盖回来
      if (ignitionCover) ignitionCover.classList.remove('open');
    }, 1000);
  });
}
