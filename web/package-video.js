document.addEventListener('DOMContentLoaded', function () {
  document.querySelectorAll('.package-live-video__box').forEach(function (box) {
    var playBtn = box.querySelector('.package-live-video__overlay-play');
    if (playBtn && playBtn.parentNode) playBtn.parentNode.removeChild(playBtn);
  });
});
