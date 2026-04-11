document.addEventListener('DOMContentLoaded', () => {
  const video = document.querySelector('.hero-video');
  const hero = document.querySelector('.hero');
  
  // 使用 IntersectionObserver 监听 Hero 区域
  // 当 Hero 区域在视口中可见比例低于 10% 时暂停视频
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        // 如果 Hero 在视口中（进入 10% 以上）
        if (entry.intersectionRatio > 0.1) {
          video.play().catch(e => console.log("播放失败:", e));
        }
      } else {
        // 如果 Hero 完全离开视口
        video.pause();
      }
    });
  }, {
    threshold: [0, 0.1, 0.5, 1.0]
  });

  observer.observe(hero);
});
