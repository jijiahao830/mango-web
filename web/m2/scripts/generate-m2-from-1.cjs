/* Generate m2/carpark detail pages from carpark v1 car.html; copy Audi R8 car.css + car.js */
'use strict';

var fs = require('fs');
var path = require('path');

var WEB = path.resolve(__dirname, '../..');
var SRC_CARPARK = path.join(WEB, 'carpark');
var DST_M2 = path.join(WEB, 'm2', 'carpark');
var R8_DIR = path.join(DST_M2, '奥迪 R8');
var TPL_CSS = path.join(R8_DIR, 'car.css');
var TPL_JS = path.join(R8_DIR, 'car.js');

function stripHtml(s) {
  return String(s || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function toM2MediaPath(p) {
  if (!p) return p;
  return String(p).replace(/\.\.\/\.\.\/media-webp/g, '../../../media-webp');
}

function pricingFallback(day) {
  var p = parseInt(String(day), 10);
  if (!isFinite(p) || p <= 0) p = 888;
  var w = Math.floor((p * 6.5) / 7);
  var h = Math.floor((p * 13) / 15);
  var m = Math.floor((p * 23) / 30);
  function fmt(n) {
    return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }
  return { day: p, w: w, h: h, m: m, fmt: fmt };
}

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function extractBodyAttr(html, name) {
  var re = new RegExp('<body[^>]*\\s' + name + '="([^"]*)"', 'i');
  var m = html.match(re);
  return m ? m[1].trim() : '';
}

function extractTitle(html) {
  var m = html.match(/<title>([^<]+)<\/title>/i);
  return m ? m[1].trim() : '';
}

function extractKnockout(html) {
  var m = html.match(/class="hero-title-highlight"[^>]*>([^<]+)</);
  return m ? m[1].trim() : '';
}

function extractCover(html) {
  var m = html.match(/hero-image-main[\s\S]*?<img[^>]+src="([^"]+)"/);
  return m ? toM2MediaPath(m[1]) : '';
}

function extractFeatures(html) {
  var secIdx = html.indexOf('features-section');
  if (secIdx === -1) return [];
  var pos = html.indexOf('class="feature-card', secIdx);
  var out = [];
  while (pos !== -1) {
    var nextSection = html.indexOf('</section>', pos);
    var nextCard = html.indexOf('class="feature-card', pos + 20);
    var end = nextSection;
    if (nextCard !== -1 && nextCard < nextSection) end = nextCard;
    var block = html.slice(pos, end);
    var imgM = block.match(/<img[^>]+src="([^"]+)"/);
    var titleM = block.match(/class="feature-title">([^<]+)</);
    var descM = block.match(/class="feature-desc">([\s\S]*?)<\/p>/);
    if (imgM && titleM) {
      out.push({
        src: toM2MediaPath(imgM[1]),
        title: titleM[1].trim(),
        desc: stripHtml(descM ? descM[1] : ''),
      });
    }
    pos = nextCard === -1 || nextCard >= nextSection ? -1 : nextCard;
  }
  return out;
}

function extractComingSoon(html) {
  var idx = html.indexOf('即将上新');
  if (idx === -1) return '';
  var chunk = html.slice(idx, idx + 1200);
  var p = chunk.match(/<p[^>]*>([\s\S]*?)<\/p>/);
  return p ? stripHtml(p[1]) : '';
}

function extractScenario(html) {
  var idx = html.indexOf('scenario-showcase-section');
  if (idx === -1) return null;
  var chunk = html.slice(idx, idx + 12000);
  var title = chunk.match(/class="scenario-showcase-title">([^<]+)</);
  var desc = chunk.match(/class="scenario-showcase-desc">([\s\S]*?)<\/p>/);
  var img = chunk.match(/scenario-showcase-image[\s\S]*?<img[^>]+src="([^"]+)"/);
  var ul = chunk.match(/class="scenario-features"[^>]*>([\s\S]*?)<\/ul>/);
  var lis = [];
  if (ul) {
    var liRe = /<li>([^<]+)<\/li>/g;
    var m;
    while ((m = liRe.exec(ul[1])) !== null) lis.push(m[1].trim());
  }
  if (!title) return null;
  return {
    title: title[1].trim(),
    desc: stripHtml(desc ? desc[1] : ''),
    img: img ? toM2MediaPath(img[1]) : '',
    list: lis,
  };
}

function extractGallery(html) {
  var gIdx = html.indexOf('class="gallery-section"');
  if (gIdx === -1) return [];
  var chunk = html.slice(gIdx, gIdx + 200000);
  var thumbs = [];
  var re = /data-image="([^"]+)"/g;
  var m;
  while ((m = re.exec(chunk)) !== null) {
    thumbs.push(toM2MediaPath(m[1]));
  }
  return thumbs;
}

function padFeatures(features, cover, displayName, comingText) {
  if (features.length >= 3) return features.slice(0, 3);
  if (features.length === 0) {
    var desc =
      comingText ||
      displayName + ' 详情页内容即将完善，正式开放后可在芒果车库查看完整参数与价格。';
    features = [{ src: cover, title: '即将上新', desc: desc }];
  }
  while (features.length < 3) {
    features.push(features[features.length - 1]);
  }
  return features.slice(0, 3);
}

function buildCarHtml(ctx) {
  var displayName = ctx.displayName;
  var title = ctx.pageTitle || displayName + ' · 芒果超跑';
  var knockout = ctx.knockout || displayName;
  var cover = ctx.cover;
  var pr = ctx.pricing;
  var feats = ctx.features;
  var scen = ctx.scenario;
  var gallery = ctx.gallery;

  var featSlides = feats
    .map(function (f, i) {
      return (
        '        <div class="m2-features__slide">\n' +
        '          <div class="m2-features__card">\n' +
        '            <img class="m2-features__img" src="' +
        esc(f.src) +
        '" alt="' +
        esc(f.title) +
        '">\n' +
        '            <div class="m2-features__text">\n' +
        '              <h3 class="m2-features__title">' +
        esc(f.title) +
        '</h3>\n' +
        '              <p  class="m2-features__desc">' +
        esc(f.desc) +
        '</p>\n' +
        '            </div>\n' +
        '          </div>\n' +
        '        </div>\n'
      );
    })
    .join('\n');

  var scenList = (scen.list || [])
    .map(function (li) {
      return '          <li>' + esc(li) + '</li>\n';
    })
    .join('');

  var gallerySlides = gallery
    .map(function (src, i) {
      return (
        '        <div class="m2-gallery__slide">\n' +
        '          <img class="m2-gallery__img" src="' +
        esc(src) +
        '" alt="' +
        esc(displayName + ' 图赏 ' + (i + 1)) +
        '">\n' +
        '        </div>\n'
      );
    })
    .join('');

  return (
    '<!doctype html>\n' +
    '<html lang="zh-CN">\n' +
    '<head>\n' +
    '  <meta charset="utf-8">\n' +
    '  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n' +
    '  <title>' +
    esc(title) +
    '</title>\n' +
    '  <link rel="stylesheet" href="./car.css">\n' +
    '  <link rel="stylesheet" href="../../m2-legal-foot.css">\n' +
    '</head>\n' +
    '<body data-car-display-name="' +
    esc(displayName) +
    '">\n' +
    '\n' +
    '  <div class="m2-cover-wrapper">\n' +
    '    <div class="m2-cover-sticky">\n' +
    '      <img class="m2-car__bg" src="' +
    esc(cover) +
    '" alt="' +
    esc(displayName) +
    '">\n' +
    '      <div class="m2-car__knockout" id="m2Knockout">\n' +
    '        <span class="m2-car__knockout-text" id="m2KnockoutText">' +
    esc(knockout) +
    '</span>\n' +
    '      </div>\n' +
    '    </div>\n' +
    '  </div>\n' +
    '\n' +
    '  <div class="m2-pricing-wrapper">\n' +
    '    <section class="m2-car__pricing" id="m2Pricing">\n' +
    '      <div class="m2-car__pricing-card">\n' +
    '        <p class="m2-car__pricing-title" data-pricing-line="0">月租超低价</p>\n' +
    '        <div class="m2-car__pricing-row" data-pricing-line="1">\n' +
    '          <span class="m2-car__pricing-label">日租（24小时）</span>\n' +
    '          <span class="m2-car__pricing-value"><em class="m2-car__pricing-num">' +
    pr.fmt(pr.day) +
    '</em>元/天</span>\n' +
    '        </div>\n' +
    '        <div class="m2-car__pricing-row" data-pricing-line="2">\n' +
    '          <span class="m2-car__pricing-label">周（7天）</span>\n' +
    '          <span class="m2-car__pricing-value"><em class="m2-car__pricing-num">' +
    pr.fmt(pr.w) +
    '</em>元/天</span>\n' +
    '        </div>\n' +
    '        <div class="m2-car__pricing-row" data-pricing-line="3">\n' +
    '          <span class="m2-car__pricing-label">半月（15天）</span>\n' +
    '          <span class="m2-car__pricing-value"><em class="m2-car__pricing-num">' +
    pr.fmt(pr.h) +
    '</em>元/天</span>\n' +
    '        </div>\n' +
    '        <div class="m2-car__pricing-row" data-pricing-line="4">\n' +
    '          <span class="m2-car__pricing-label">月租（30天）</span>\n' +
    '          <span class="m2-car__pricing-value"><em class="m2-car__pricing-num">' +
    pr.fmt(pr.m) +
    '</em>元/天</span>\n' +
    '        </div>\n' +
    '      </div>\n' +
    '    </section>\n' +
    '  </div>\n' +
    '\n' +
    '  <section class="m2-car__features" id="m2Features">\n' +
    '    <div class="m2-features__viewport">\n' +
    '      <div class="m2-features__track" id="m2FeatTrack">\n' +
    featSlides +
    '      </div>\n' +
    '    </div>\n' +
    '    <div class="m2-features__nav">\n' +
    '      <button class="m2-features__hex" id="m2FeatPrev" aria-label="上一张">\n' +
    '        <svg viewBox="0 0 52 60" fill="none" xmlns="http://www.w3.org/2000/svg">\n' +
    '          <polygon points="26,2 50,15 50,45 26,58 2,45 2,15" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.3)" stroke-width="1.5"/>\n' +
    '          <polyline points="30,22 22,30 30,38" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>\n' +
    '        </svg>\n' +
    '      </button>\n' +
    '      <button class="m2-features__hex" id="m2FeatNext" aria-label="下一张">\n' +
    '        <svg viewBox="0 0 52 60" fill="none" xmlns="http://www.w3.org/2000/svg">\n' +
    '          <polygon points="26,2 50,15 50,45 26,58 2,45 2,15" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.3)" stroke-width="1.5"/>\n' +
    '          <polyline points="22,22 30,30 22,38" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>\n' +
    '        </svg>\n' +
    '      </button>\n' +
    '    </div>\n' +
    '  </section>\n' +
    '\n' +
    '  <section class="m2-car__scenario-section" id="m2Scenario">\n' +
    '    <div class="m2-scenario-card">\n' +
    '      <div class="m2-scenario-card__text">\n' +
    '        <h3 class="m2-scenario-card__title">' +
    esc(scen.title) +
    '</h3>\n' +
    '        <p class="m2-scenario-card__desc">' +
    esc(scen.desc) +
    '</p>\n' +
    '        <ul class="m2-scenario-card__list">\n' +
    scenList +
    '        </ul>\n' +
    '      </div>\n' +
    '      <div class="m2-scenario-card__image-wrap">\n' +
    '        <img class="m2-scenario-card__image" src="' +
    esc(scen.img) +
    '" alt="' +
    esc(scen.title) +
    '场景">\n' +
    '      </div>\n' +
    '    </div>\n' +
    '  </section>\n' +
    '\n' +
    '  <section class="m2-car__gallery" id="m2Gallery">\n' +
    '    <div class="m2-gallery__viewport">\n' +
    '      <div class="m2-gallery__track" id="m2GalleryTrack">\n' +
    gallerySlides +
    '      </div>\n' +
    '    </div>\n' +
    '    <div class="m2-gallery__nav">\n' +
    '      <button class="m2-features__hex" id="m2GalleryPrev" aria-label="上一张">\n' +
    '        <svg viewBox="0 0 52 60" fill="none" xmlns="http://www.w3.org/2000/svg">\n' +
    '          <polygon points="26,2 50,15 50,45 26,58 2,45 2,15" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.3)" stroke-width="1.5"/>\n' +
    '          <polyline points="30,22 22,30 30,38" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>\n' +
    '        </svg>\n' +
    '      </button>\n' +
    '      <button class="m2-features__hex" id="m2GalleryNext" aria-label="下一张">\n' +
    '        <svg viewBox="0 0 52 60" fill="none" xmlns="http://www.w3.org/2000/svg">\n' +
    '          <polygon points="26,2 50,15 50,45 26,58 2,45 2,15" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.3)" stroke-width="1.5"/>\n' +
    '          <polyline points="22,22 30,30 22,38" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>\n' +
    '        </svg>\n' +
    '      </button>\n' +
    '    </div>\n' +
    '  </section>\n' +
    '\n' +
    '  <section class="m2-car__same-price" id="m2SamePriceSection">\n' +
    '    <div class="m2-same-price__vehicle-zone">\n' +
    '      <div class="m2-same-price__empty" id="m2SamePriceEmpty" hidden>\n' +
    '        <img class="m2-same-price__empty-image" src="../../../media-webp/photos/index/m2/车辆搜索.webp" alt="暂无同价位车型">\n' +
    '        <p class="m2-same-price__empty-title">暂无同价位其他车型</p>\n' +
    '        <p class="m2-same-price__empty-desc">如需更多选择，<br>可联系客服为您推荐相近预算车型</p>\n' +
    '        <a class="m2-same-price__contact-btn" href="tel:13033333370">联系客服</a>\n' +
    '      </div>\n' +
    '      <div class="m2-same-price__has" id="m2SamePriceHas" hidden>\n' +
    '        <a class="m2-same-price__car-link" id="m2SamePriceCarLink" href="#">\n' +
    '          <div class="m2-same-price__car-name" id="m2SamePriceCarName"></div>\n' +
    '          <img class="m2-same-price__car-image" id="m2SamePriceCarImage" src="" alt="同价位车型">\n' +
    '        </a>\n' +
    '        <div class="m2-same-price__switch-nav">\n' +
    '          <button class="m2-features__hex" id="m2SamePricePrev" aria-label="上一辆">\n' +
    '            <svg viewBox="0 0 52 60" fill="none" xmlns="http://www.w3.org/2000/svg">\n' +
    '              <polygon points="26,2 50,15 50,45 26,58 2,45 2,15" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.3)" stroke-width="1.5"/>\n' +
    '              <polyline points="30,22 22,30 30,38" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>\n' +
    '            </svg>\n' +
    '          </button>\n' +
    '          <button class="m2-features__hex" id="m2SamePriceNext" aria-label="下一辆">\n' +
    '            <svg viewBox="0 0 52 60" fill="none" xmlns="http://www.w3.org/2000/svg">\n' +
    '              <polygon points="26,2 50,15 50,45 26,58 2,45 2,15" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.3)" stroke-width="1.5"/>\n' +
    '              <polyline points="22,22 30,30 22,38" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>\n' +
    '            </svg>\n' +
    '          </button>\n' +
    '        </div>\n' +
    '        <div class="m2-same-price__dots" id="m2SamePriceDots" aria-label="同价位车型切换"></div>\n' +
    '      </div>\n' +
    '    </div>\n' +
    '    <footer class="m2-same-price__record-zone">\n' +
    '      <div class="m2-legal-foot" role="contentinfo" aria-label="网站备案与联系方式">\n' +
    '        <div class="m2-legal-foot__beian">\n' +
    '          <a class="m2-legal-foot__link" href="https://beian.miit.gov.cn/" target="_blank" rel="noopener noreferrer">滇ICP备2025055273号-3</a>\n' +
    '          <span class="m2-legal-foot__sep" aria-hidden="true">|</span>\n' +
    '          <a class="m2-legal-foot__link m2-legal-foot__mps" href="https://beian.mps.gov.cn/#/query/webSearch?code=53010002000314" rel="noreferrer" target="_blank">\n' +
    '            <img class="m2-legal-foot__mps-icon" src="../../../media-webp/photos/index/m2/备案图标.webp" alt="" width="18" height="20" decoding="async" loading="lazy">\n' +
    '            <span>滇公网安备53010002000314号</span>\n' +
    '          </a>\n' +
    '        </div>\n' +
    '        <p class="m2-legal-foot__copyright">© 2026 昆明芒果汽车服务有限公司 版权所有</p>\n' +
    '      </div>\n' +
    '    </footer>\n' +
    '  </section>\n' +
    '\n' +
    '  <a class="m2-car__back" href="../../index.html#m2Chooser">\n' +
    '    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">\n' +
    '      <polyline points="15 6 9 12 15 18"></polyline>\n' +
    '    </svg>\n' +
    '  </a>\n' +
    '\n' +
    '  <script src="../m2-detail-pricing-sync.js"></script>\n' +
    '  <script src="./car.js"></script>\n' +
    '</body>\n' +
    '</html>\n'
  );
}

function processFolder(folderName) {
  var srcHtml = path.join(SRC_CARPARK, folderName, 'car.html');
  if (!fs.existsSync(srcHtml)) return { skip: true, reason: 'no car.html' };

  var html = fs.readFileSync(srcHtml, 'utf8');
  var displayName = extractBodyAttr(html, 'data-car-display-name');
  if (!displayName) displayName = folderName;

  var dailyStr = extractBodyAttr(html, 'data-daily-price');
  var pricing = pricingFallback(dailyStr);

  var knockout = extractKnockout(html);
  if (!knockout) knockout = displayName;

  var cover = extractCover(html);
  if (!cover) {
    var enc = encodeURIComponent(folderName);
    cover = '../../../media-webp/photos/carpark/' + folderName + '/封面.webp';
  }

  var features = extractFeatures(html);
  var coming = extractComingSoon(html);
  features = padFeatures(features, cover, displayName, coming);

  var scenario = extractScenario(html);
  if (!scenario) {
    scenario = {
      title: '尊享出行',
      desc:
        '选择 ' +
        displayName +
        '，芒果超跑为您提供专业车辆与贴心服务，满足商务接待、自驾出游等多场景需求。',
      list: ['✓ 车况透明', '✓ 专人对接', '✓ 灵活租期', '✓ 客服支持'],
      img: features[0].src,
    };
  }
  if (!scenario.img) scenario.img = features[0].src;
  if (!scenario.list || scenario.list.length === 0) {
    scenario.list = ['✓ 车况透明', '✓ 专人对接', '✓ 灵活租期', '✓ 客服支持'];
  }

  var gallery = extractGallery(html);
  if (gallery.length === 0) {
    gallery = [cover];
    if (features[0] && features[0].src !== cover) gallery.push(features[0].src);
    if (features[1] && features[1].src) gallery.push(features[1].src);
  }

  var pageTitle = extractTitle(html);
  if (!pageTitle) pageTitle = displayName + ' · 芒果超跑';

  var outDir = path.join(DST_M2, folderName);
  fs.mkdirSync(outDir, { recursive: true });

  var outHtml = buildCarHtml({
    displayName: displayName,
    pageTitle: pageTitle,
    knockout: knockout,
    cover: cover,
    pricing: pricing,
    features: features,
    scenario: scenario,
    gallery: gallery,
  });

  fs.writeFileSync(path.join(outDir, 'car.html'), outHtml, 'utf8');
  fs.copyFileSync(TPL_CSS, path.join(outDir, 'car.css'));
  fs.copyFileSync(TPL_JS, path.join(outDir, 'car.js'));

  return { ok: true, folder: folderName };
}

function main() {
  if (!fs.existsSync(TPL_CSS) || !fs.existsSync(TPL_JS)) {
    console.error('Missing template:', TPL_CSS, TPL_JS);
    process.exit(1);
  }

  var entries = fs.readdirSync(SRC_CARPARK, { withFileTypes: true });
  var ok = 0;
  var skip = 0;
  for (var i = 0; i < entries.length; i++) {
    var e = entries[i];
    if (!e.isDirectory()) continue;
    var name = e.name;
    if (name === 'common' || name.startsWith('.')) continue;
    var r = processFolder(name);
    if (r.skip) skip++;
    else {
      ok++;
      console.log('OK', name);
    }
  }
  console.log('Done. Generated:', ok, 'skipped:', skip);
}

main();
