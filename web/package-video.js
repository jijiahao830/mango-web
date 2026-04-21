document.addEventListener('DOMContentLoaded', function () {
  document.querySelectorAll('.package-live-video__box').forEach(function (box) {
    var playBtn = box.querySelector('.package-live-video__overlay-play');
    if (playBtn && playBtn.parentNode) playBtn.parentNode.removeChild(playBtn);

    var video = box.querySelector('video');
    if (!video) return;

    var loaded = false;
    function loadVideoIfNeeded() {
      if (loaded) return;
      var src = String(video.getAttribute('data-video-src') || '').trim();
      if (!src) return;
      var source = document.createElement('source');
      source.src = src;
      source.type = 'video/webm';
      video.appendChild(source);
      // 不主动 load，让浏览器在用户点击播放后再发起请求，避免提前整段下载。
      loaded = true;
    }

    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              loadVideoIfNeeded();
              io.disconnect();
            }
          });
        },
        { root: null, threshold: 0.1, rootMargin: '120px 0px' }
      );
      io.observe(box);
    } else {
      // 兼容旧环境：无 IO 时直接加载，避免视频不可用。
      loadVideoIfNeeded();
    }
  });
});
