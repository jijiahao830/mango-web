document.addEventListener('DOMContentLoaded', function () {
  document.querySelectorAll('.package-live-video__box').forEach(function (box) {
    var video = box.querySelector('video');
    var playBtn = box.querySelector('.package-live-video__overlay-play');
    if (!video || !playBtn) return;

    function syncState() {
      var paused = video.paused || video.ended;
      playBtn.classList.toggle('is-hidden', !paused);
    }

    playBtn.addEventListener('click', function () {
      video.play().catch(function () {});
    });

    video.addEventListener('play', syncState);
    video.addEventListener('pause', syncState);
    video.addEventListener('ended', syncState);
    syncState();
  });
});
