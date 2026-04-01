document.addEventListener('DOMContentLoaded', () => {
  const reveals = document.querySelectorAll('.reveal')
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) e.target.classList.add('show')
    })
  }, { threshold: 0.12 })
  reveals.forEach(el => io.observe(el))

  const heroImg = document.querySelector('.hero-image')
  function parallax() {
    if (!heroImg) return
    const r = heroImg.getBoundingClientRect()
    const offset = (window.scrollY + r.top) * -0.02
    heroImg.style.transform = `translateY(${offset}px)`
  }
  window.addEventListener('scroll', parallax, { passive: true })
  parallax()

  const titles = document.querySelectorAll('.metric-title[data-counter]')
  titles.forEach(el => {
    const target = parseFloat(el.dataset.counter || '0')
    const decimals = parseInt(el.dataset.decimals || '0', 10)
    const duration = parseInt(el.dataset.duration || '1200', 10)
    const prefix = el.dataset.prefix || ''
    const suffix = el.dataset.suffix || ''
    const startTime = performance.now()
    function step(ts) {
      const p = Math.min((ts - startTime) / duration, 1)
      const eased = 1 - Math.pow(1 - p, 3)
      const val = target * eased
      el.textContent = prefix + val.toFixed(decimals) + suffix
      if (p < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  })
})
