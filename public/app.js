/* =========================================================
   Quanta Craft Launcher · 赞助网站
   交互与动效
   ========================================================= */
(function () {
  'use strict';

  var doc = document;
  var root = doc.documentElement;
  var REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var FINE = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var $ = function (s, c) { return (c || doc).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || doc).querySelectorAll(s)); };

  /* =======================================================
     1. 逐字拆分（标题 / 可跳跃文字）
     ======================================================= */
  // 把文本切成单位：拉丁词与数字整体保留，其余按字切
  function tokenize(text, mergeLatin) {
    var out = [];
    if (!mergeLatin) {
      Array.prototype.slice.call(text).forEach(function (c) { out.push(c); });
      return out;
    }
    var re = /[A-Za-z0-9]+(?:[.'’\-][A-Za-z0-9]+)*/g;
    var last = 0, m;
    while ((m = re.exec(text)) !== null) {
      if (m.index > last) {
        Array.prototype.slice.call(text.slice(last, m.index)).forEach(function (c) { out.push(c); });
      }
      out.push(m[0]);
      last = m.index + m[0].length;
    }
    if (last < text.length) {
      Array.prototype.slice.call(text.slice(last)).forEach(function (c) { out.push(c); });
    }
    return out;
  }

  function splitChars(el, cls, mergeLatin) {
    cls = cls || 'ch';
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (n) {
        if (n.nodeType === 3) {
          var text = n.nodeValue;
          if (!text) return;
          var frag = doc.createDocumentFragment();
          tokenize(text, mergeLatin !== false).forEach(function (tok) {
            if (/^\s+$/.test(tok)) {
              frag.appendChild(doc.createTextNode(tok));
              return;
            }
            var span = doc.createElement('span');
            span.className = cls;
            span.textContent = tok;
            frag.appendChild(span);
          });
          node.replaceChild(frag, n);
        } else if (n.nodeType === 1 && n.tagName !== 'BR') {
          walk(n);
        }
      });
    })(el);
  }

  $$('[data-split]').forEach(function (el) {
    splitChars(el);
    var chars = $$('.ch', el);

    if (REDUCED) {
      chars.forEach(function (c) { c.classList.add('in'); });
      el.classList.add('done');
      return;
    }

    chars.forEach(function (c, i) {
      c.style.transitionDelay = (140 + i * 34) + 'ms';
    });

    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        chars.forEach(function (c) { c.classList.add('in'); });
      });
    });

    setTimeout(function () {
      el.classList.add('done');
      chars.forEach(function (c) { c.style.transitionDelay = ''; });
    }, 140 + chars.length * 34 + 700);
  });

  /* =======================================================
     2. 滚动揭示 + 子元素错峰
     ======================================================= */
  var STAGGER_STEP = 72;

  $$('[data-stagger]').forEach(function (box) {
    Array.prototype.slice.call(box.children).forEach(function (kid, i) {
      var d = Math.min(i, 9) * STAGGER_STEP;
      if (kid.hasAttribute('data-reveal')) {
        kid.setAttribute('data-stagger-delay', d);
      } else {
        kid.classList.add('stag');
        kid.style.transitionDelay = d + 'ms';
      }
    });
  });

  var revealIO = null;
  if ('IntersectionObserver' in window) {
    revealIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        var own = parseInt(el.getAttribute('data-delay') || 0, 10);
        var stag = parseInt(el.getAttribute('data-stagger-delay') || 0, 10);
        var delay = REDUCED ? 0 : own + stag;

        el.style.transitionDelay = delay + 'ms';
        el.classList.add('is-in');
        revealIO.unobserve(el);

        setTimeout(function () {
          el.style.transitionDelay = '';
          el.classList.add('settled');
        }, delay + 820);
      });
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.1 });
  }

  $$('[data-reveal]').forEach(function (el) {
    if (revealIO && !REDUCED) {
      revealIO.observe(el);
    } else {
      el.classList.add('is-in', 'settled');
    }
  });

  // 错峰容器整体进入
  var stagIO = null;
  if ('IntersectionObserver' in window && !REDUCED) {
    stagIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        $$('.stag', entry.target).forEach(function (kid) { kid.classList.add('in'); });
        stagIO.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.1 });
    $$('[data-stagger]').forEach(function (el) { stagIO.observe(el); });
  } else {
    $$('.stag').forEach(function (el) { el.classList.add('in'); });
  }

  /* =======================================================
     3. 数字计数 / 打字 / 脉冲
     ======================================================= */
  function easeOutExpo(t) { return t === 1 ? 1 : 1 - Math.pow(2, -10 * t); }

  function countUp(el) {
    var target = parseInt(el.getAttribute('data-count'), 10) || 0;
    if (REDUCED) { el.textContent = String(target); return; }
    var dur = 1500;
    var t0 = null;
    function frame(ts) {
      if (t0 === null) t0 = ts;
      var p = Math.min((ts - t0) / dur, 1);
      el.textContent = String(Math.round(target * easeOutExpo(p)));
      if (p < 1) requestAnimationFrame(frame);
    }
    el.textContent = '0';
    requestAnimationFrame(frame);
  }

  function typeOut(el) {
    var full = el.getAttribute('data-typer');
    if (REDUCED) { el.textContent = full; return; }
    var chars = Array.prototype.slice.call(full);
    el.textContent = '';
    var i = 0;
    (function step() {
      if (i >= chars.length) return;
      el.textContent += chars[i++];
      setTimeout(step, 108);
    })();
  }

  function pulse(el) {
    if (REDUCED) return;
    el.textContent = '0';
    el.classList.remove('pulse');
    void el.offsetWidth;
    el.classList.add('pulse');
  }

  var fxIO = null;
  if ('IntersectionObserver' in window) {
    fxIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        if (el.hasAttribute('data-count')) countUp(el);
        else if (el.hasAttribute('data-typer')) typeOut(el);
        else if (el.hasAttribute('data-pulse')) pulse(el);
        fxIO.unobserve(el);
      });
    }, { threshold: 0.6 });
    $$('[data-count], [data-typer], [data-pulse]').forEach(function (el) { fxIO.observe(el); });
  }

  /* =======================================================
     4. 卡片 3D 倾斜（仅精确指针设备）
     ======================================================= */
  if (FINE && !REDUCED) {
    $$('[data-tilt]').forEach(function (card) {
      var raf = null, next = null, active = false;

      function apply() {
        raf = null;
        if (!active || !next) return;
        card.style.transform = next;
      }

      card.addEventListener('pointermove', function (e) {
        var r = card.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width - 0.5;
        var py = (e.clientY - r.top) / r.height - 0.5;
        var max = 6.5;
        var ry = (px * max * 2).toFixed(2);
        var rx = (-py * max * 2).toFixed(2);
        next = 'rotateX(' + rx + 'deg) rotateY(' + ry + 'deg) translateY(-5px)';
        if (!raf) raf = requestAnimationFrame(apply);
      });

      card.addEventListener('pointerleave', function () {
        active = false;
        next = null;
        if (raf) { cancelAnimationFrame(raf); raf = null; }
        card.style.transform = '';
      });

      card.addEventListener('pointerenter', function () { active = true; });
    });
  }

  /* =======================================================
     5. 按钮涟漪
     ======================================================= */
  if (!REDUCED) {
    $$('[data-ripple]').forEach(function (el) {
      el.addEventListener('pointerdown', function (e) {
        var r = el.getBoundingClientRect();
        var size = Math.max(r.width, r.height) * 2.1;
        var span = doc.createElement('span');
        span.className = 'ripple';
        span.style.width = span.style.height = size + 'px';
        span.style.left = (e.clientX - r.left - size / 2) + 'px';
        span.style.top = (e.clientY - r.top - size / 2) + 'px';
        el.appendChild(span);
        setTimeout(function () { if (span.parentNode) span.parentNode.removeChild(span); }, 660);
      });
    });
  }

  /* =======================================================
     6. 导航：滚动态 / 进度条 / 区块高亮
     ======================================================= */
  var nav = $('#nav');
  var bar = $('#progressBar');
  var dock = $('#dock');
  var ticking = false;
  var wasScrolled = null;

  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      ticking = false;
      var y = window.scrollY || window.pageYOffset;
      var max = doc.documentElement.scrollHeight - window.innerHeight;
      var p = max > 0 ? Math.min(y / max, 1) : 0;

      var isScrolled = y > 10;
      if (nav) nav.classList.toggle('scrolled', isScrolled);
      if (dock) dock.classList.toggle('show', y > 520);
      if (bar) bar.style.width = (p * 100).toFixed(2) + '%';

      // 玻璃形态发生变化时，扫一道反光
      if (wasScrolled !== null && wasScrolled !== isScrolled) sheenSweep();
      wasScrolled = isScrolled;
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  onScroll();

  var sections = $$('main section[id]');
  if ('IntersectionObserver' in window && sections.length) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var id = entry.target.id;
        $$('.nav-links a').forEach(function (a) {
          a.classList.toggle('active', a.getAttribute('href') === '#' + id);
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    sections.forEach(function (s) { spy.observe(s); });
  }

  /* =======================================================
     7. 移动端菜单
     ======================================================= */
  var toggle = $('#navToggle');
  var navLinks = $('#navLinks');
  if (toggle && navLinks) {
    toggle.addEventListener('click', function () {
      var open = navLinks.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    navLinks.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') {
        navLinks.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  var toTop = $('#toTop');
  if (toTop) {
    toTop.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: REDUCED ? 'auto' : 'smooth' });
    });
  }

  var heroScroll = $('#heroScroll');
  if (heroScroll) {
    heroScroll.addEventListener('click', function () {
      var target = doc.getElementById('about');
      if (target) target.scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth', block: 'start' });
    });
  }

  /* =======================================================
     8. 收款码灯箱
     ======================================================= */
  var lightbox = $('#lightbox');
  var lbClose = $('#lbClose');
  var openers = [$('#qrOpen'), $('#qrOpen2')];
  var lastFocus = null;

  function openLb() {
    if (!lightbox) return;
    lastFocus = doc.activeElement;
    lightbox.hidden = false;
    doc.body.style.overflow = 'hidden';
    if (lbClose) lbClose.focus();
  }
  function closeLb() {
    if (!lightbox || lightbox.hidden) return;
    lightbox.hidden = true;
    doc.body.style.overflow = '';
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  openers.forEach(function (el) { if (el) el.addEventListener('click', openLb); });
  if (lbClose) lbClose.addEventListener('click', closeLb);
  if (lightbox) {
    lightbox.addEventListener('click', function (e) { if (e.target === lightbox) closeLb(); });
  }
  doc.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeLb(); });

  /* =======================================================
     9. 背景：点阵网格 + 漂浮方块 + 视差
     ======================================================= */
  var canvas = $('#grid');
  var halo = $('#halo');
  var ctx = null;
  var W = 0, H = 0, SP = 34;
  var blocks = [];
  var scrollY = 0;
  var mx = 0, my = 0, tmx = 0, tmy = 0;

  if (canvas && !REDUCED) {
    ctx = canvas.getContext('2d');
    var dpr = Math.min(window.devicePixelRatio || 1, 2);

    function buildBlocks() {
      var count = Math.round(Math.min(34, Math.max(10, (W * H) / 58000)));
      blocks = [];
      for (var i = 0; i < count; i++) blocks.push(newBlock(true));
    }

    function newBlock(spread) {
      var size = 6 + Math.random() * 13;
      return {
        x: Math.random() * W,
        y: spread ? Math.random() * H : H + size * 3,
        size: size,
        speed: 0.12 + Math.random() * 0.34,
        drift: (Math.random() - 0.5) * 0.2,
        rot: Math.random() * Math.PI,
        vrot: (Math.random() - 0.5) * 0.005,
        alpha: 0.06 + Math.random() * 0.1,
        depth: 0.4 + Math.random() * 1.6
      };
    }

    function resize() {
      W = canvas.clientWidth;
      H = canvas.clientHeight;
      canvas.width = Math.floor(W * dpr);
      canvas.height = Math.floor(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      buildBlocks();
    }

    var BAND = 0;

    function draw() {
      ctx.clearRect(0, 0, W, H);

      // 点阵网格：随滚动缓慢位移，形成视差
      var off = (scrollY * 0.08) % SP;
      var gx0 = -6 + mx * 0.5;
      var gy0 = -6 - off + my * 0.5;
      ctx.fillStyle = '#e7e7eb';
      for (var gx = gx0; gx < W; gx += SP) {
        for (var gy = gy0; gy < H; gy += SP) {
          ctx.fillRect(gx, gy, 1.5, 1.5);
        }
      }

      // 漂浮方块：缓慢上浮 + 鼠标视差 + 滚动视差（循环换行）
      for (var i = 0; i < blocks.length; i++) {
        var b = blocks[i];
        b.y -= b.speed;
        b.x += b.drift;
        b.rot += b.vrot;
        if (b.y + b.size < -20) { blocks[i] = newBlock(false); continue; }

        var oy = b.y - scrollY * 0.05 * b.depth;
        oy = ((oy % BAND) + BAND) % BAND - 40;
        var ox = b.x + mx * 0.03 * b.depth;

        ctx.save();
        ctx.translate(ox, oy);
        ctx.rotate(b.rot);
        ctx.fillStyle = 'rgba(120,120,132,' + b.alpha + ')';
        ctx.fillRect(-b.size / 2, -b.size / 2, b.size, b.size);
        ctx.fillStyle = 'rgba(120,120,132,' + (b.alpha * 1.6) + ')';
        ctx.fillRect(-b.size / 2, -b.size / 2, b.size, Math.max(1, b.size * 0.18));
        ctx.restore();
      }

      requestAnimationFrame(draw);
    }

    var rT;
    window.addEventListener('resize', function () {
      clearTimeout(rT);
      rT = setTimeout(function () { resize(); BAND = H + 80; }, 160);
    });

    resize();
    BAND = H + 80;
    requestAnimationFrame(draw);
  }

  window.addEventListener('scroll', function () {
    scrollY = window.scrollY || window.pageYOffset;
  }, { passive: true });
  scrollY = window.scrollY || 0;

  /* =======================================================
     10. 鼠标光晕跟随
     ======================================================= */
  if (halo && FINE && !REDUCED) {
    var hx = window.innerWidth / 2, hy = window.innerHeight / 3;
    var tx = hx, ty = hy;

    window.addEventListener('pointermove', function (e) {
      tx = e.clientX;
      ty = e.clientY;
      tmx = (e.clientX / window.innerWidth - 0.5) * 26;
      tmy = (e.clientY / window.innerHeight - 0.5) * 26;
      halo.classList.remove('off');
    }, { passive: true });

    doc.addEventListener('pointerleave', function () { halo.classList.add('off'); });
    doc.addEventListener('pointerenter', function () { halo.classList.remove('off'); });

    (function follow() {
      hx += (tx - hx) * 0.085;
      hy += (ty - hy) * 0.085;
      mx += (tmx - mx) * 0.06;
      my += (tmy - my) * 0.06;
      halo.style.transform = 'translate3d(' + hx.toFixed(2) + 'px,' + hy.toFixed(2) + 'px,0)';
      requestAnimationFrame(follow);
    })();
  }

  /* =======================================================
     11. 液态玻璃：反光跟随 + 状态切换时的扫光
     ======================================================= */
  var sheen = $('#glassSheen');
  var navBox = null;

  function refreshNavBox() { navBox = nav ? nav.getBoundingClientRect() : null; }

  function sheenSweep() {
    if (!sheen || REDUCED) return;
    sheen.classList.add('on');
    sheen.classList.remove('sweep');
    void sheen.offsetWidth;
    sheen.classList.add('sweep');
  }
  if (sheen) {
    sheen.addEventListener('animationend', function () {
      sheen.classList.remove('sweep');
    });
  }

  if (sheen && FINE && !REDUCED) {
    refreshNavBox();
    window.addEventListener('resize', refreshNavBox);
    window.addEventListener('scroll', refreshNavBox, { passive: true });

    window.addEventListener('pointermove', function (e) {
      if (!navBox) refreshNavBox();
      if (!navBox) return;
      // 只有指针落在导航附近时才点亮反光
      if (e.clientY > navBox.bottom + 60) {
        sheen.classList.remove('on');
        return;
      }
      var rel = (e.clientX - navBox.left) / navBox.width;
      rel = Math.max(-0.15, Math.min(1.15, rel));
      var x = rel * navBox.width - navBox.width * 0.19;
      sheen.classList.add('on');
      sheen.style.transform = 'translateX(' + x.toFixed(1) + 'px) skewX(-14deg)';
    }, { passive: true });

    doc.addEventListener('pointerleave', function () { sheen.classList.remove('on'); });
    doc.addEventListener('pointerenter', function () {
      if (navBox) sheen.classList.add('on');
    });

    // 首屏入场扫一次光
    setTimeout(sheenSweep, 900);
  }

  /* =======================================================
     12. 文字跳跃（悬停时逐字弹跳）
     ======================================================= */
  function initHop(el) {
    if (!el || el.getAttribute('data-hop-ready')) return;
    el.setAttribute('data-hop-ready', '1');

    // flex 容器里，文字会各自成为 flex item 并被 gap 撑开——先包一层再拆
    var disp = window.getComputedStyle(el).display;
    if (disp.indexOf('flex') !== -1) {
      var wrap = doc.createElement('span');
      wrap.className = 'hop-wrap';
      while (el.firstChild) wrap.appendChild(el.firstChild);
      el.appendChild(wrap);
      el = wrap;
    }

    if (!el.querySelector('.ch') && !el.querySelector('.hop')) {
      splitChars(el, 'hop', true);
    }
    var chars = $$('.ch, .hop', el);
    if (!chars.length) return;

    function play(node, delay) {
      node.style.animationDelay = delay + 'ms';
      node.classList.remove('hop-run');
      void node.offsetWidth;
      node.classList.add('hop-run');
    }

    el.addEventListener('pointerenter', function () {
      chars.forEach(function (c, i) { play(c, Math.min(i, 24) * 38); });
    });

    // 单独移到某个字上，该字也会跳
    chars.forEach(function (c) {
      c.addEventListener('pointerenter', function () { play(c, 0); });
      c.addEventListener('animationend', function () {
        c.classList.remove('hop-run');
        c.style.animationDelay = '';
      });
    });
  }

  if (!REDUCED) {
    var hopSel = '[data-hop], .sec-title, .card h3, .why-card h3, .credit b, ' +
                 '.promise-item b, .step-list b, .btn, .hero-title, .thanks-head h4, .note b';
    $$(hopSel).forEach(initHop);
  }

  /* =======================================================
     13. 点击无用区域 —— 颜文字提示
     ======================================================= */
  var KAOMOJI = [
    '(｡•́︿•̀｡)', '(´･ω･`)', '(๑•́ ₃ •̀๑)', '(｡ŏ_ŏ)', '(・∀・)',
    '(￣▽￣)', '(；一_一)', '(￢_￢)', '(￣ω￣;)', '(・_・;)'
  ];
  var TAUNT_TEXT = '别点啦，没用的！';
  var USEFUL = 'a, button, input, select, textarea, label, summary, [role="button"], [data-ripple], .lightbox, .dock, .dev';
  var liveTaunts = 0;
  var downX = 0, downY = 0, downAt = 0;

  function spawnTaunt(x, y) {
    if (liveTaunts >= 5) return;
    var el = doc.createElement('div');
    el.className = 'taunt';

    var kao = doc.createElement('span');
    kao.className = 'kao';
    kao.textContent = KAOMOJI[Math.floor(Math.random() * KAOMOJI.length)];

    var msg = doc.createElement('span');
    msg.className = 'msg';
    msg.textContent = TAUNT_TEXT;

    el.appendChild(kao);
    el.appendChild(msg);

    var half = 130;
    var left = Math.min(Math.max(x, half + 8), window.innerWidth - half - 8);
    var top = Math.min(Math.max(y - 14, 96), window.innerHeight - 108);
    el.style.left = left + 'px';
    el.style.top = top + 'px';

    doc.body.appendChild(el);
    liveTaunts++;
    setTimeout(function () {
      liveTaunts--;
      if (el.parentNode) el.parentNode.removeChild(el);
    }, 2280);
  }

  doc.addEventListener('pointerdown', function (e) {
    if (e.button !== 0) return;
    downX = e.clientX;
    downY = e.clientY;
    downAt = Date.now();
  }, { passive: true });

  doc.addEventListener('click', function (e) {
    if (e.button !== 0) return;
    if (e.target.closest(USEFUL)) return;
    // 拖动或长按不算点击
    if (Math.abs(e.clientX - downX) > 8 || Math.abs(e.clientY - downY) > 8) return;
    if (Date.now() - downAt > 700) return;
    // 有文字被选中时不算
    var sel = window.getSelection && window.getSelection();
    if (sel && String(sel).length > 0) return;
    spawnTaunt(e.clientX, e.clientY);
  });

  /* =======================================================
     14. 感谢名单 · 数据层 + 开发者模式
     ======================================================= */
  (function initSponsors() {
    var listEl = doc.getElementById('sponsorList');
    if (!listEl) return;

    /* --- 管理员凭据：只存 PBKDF2 派生值，明文不落盘 --- */
    var AUTH = {
      iter: 210000,
      salt: 'GfRdjlNKLUC4QQv94sKuJg==',
      hash: 'H+t4t260Qgnr42ZvpbCTdHDnUAC0v+LJ3930n310nBc='
    };
    var API = 'api/sponsors';
    var LS_DRAFT = 'qcl.sponsors.draft';
    var LS_LOCK = 'qcl.dev.lock';
    var PASSLEN = 24;

    var countEl = doc.getElementById('sponsorCount');
    var totalEl = doc.getElementById('sponsorTotal');
    var statEl = doc.getElementById('sponsorStat');
    var emptyEl = doc.getElementById('sponsorEmpty');

    var sp = {
      live: [],
      working: [],
      source: 'inline',
      serverOk: false,
      unlocked: false,
      editing: -1,
      secret: ''
    };

    /* ---------------- 工具 ---------------- */
    function money(n) {
      return '¥' + (Math.round((Number(n) || 0) * 100) / 100);
    }

    function normalize(rows) {
      if (!Array.isArray(rows)) return [];
      return rows.map(function (s) {
        return {
          name: String((s && s.name) || '').trim().slice(0, 40),
          amount: Number((s && s.amount)) || 0,
          date: String((s && s.date) || '').trim().slice(0, 10),
          note: String((s && s.note) || '').trim().slice(0, 60)
        };
      }).filter(function (s) { return s.name; });
    }

    function sorted(rows) {
      return rows.slice().sort(function (a, b) {
        return String(b.date || '').localeCompare(String(a.date || ''));
      });
    }

    function clone(rows) {
      return rows.map(function (s) {
        return { name: s.name, amount: s.amount, date: s.date, note: s.note };
      });
    }

    function b64ToBytes(b64) {
      var bin = atob(b64);
      var arr = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
      return arr;
    }

    function readFallback() {
      var node = doc.getElementById('sponsorFallback');
      if (!node) return [];
      try { return normalize(JSON.parse(node.textContent).sponsors); }
      catch (err) { return []; }
    }

    function readDraft() {
      try {
        var raw = localStorage.getItem(LS_DRAFT);
        return raw ? normalize(JSON.parse(raw).sponsors) : null;
      } catch (err) { return null; }
    }

    function writeDraft(rows) {
      try {
        localStorage.setItem(LS_DRAFT, JSON.stringify({
          updated: new Date().toISOString().slice(0, 10),
          sponsors: rows
        }));
        return true;
      } catch (err) { return false; }
    }

    /* ---------------- 公开渲染 ---------------- */
    function renderPublic(rows) {
      var data = sorted(rows);
      var total = data.reduce(function (sum, s) { return sum + (Number(s.amount) || 0); }, 0);

      if (countEl) countEl.textContent = String(data.length);
      if (totalEl) totalEl.textContent = money(total);
      if (statEl) statEl.hidden = data.length === 0;

      listEl.innerHTML = '';
      if (!data.length) {
        if (emptyEl) emptyEl.hidden = false;
        return;
      }
      if (emptyEl) emptyEl.hidden = true;

      data.forEach(function (s, i) {
        var li = doc.createElement('li');
        li.className = 'sponsor';

        var mark = doc.createElement('span');
        mark.className = 'sponsor-mark';
        mark.setAttribute('aria-hidden', 'true');
        mark.textContent = s.name.charAt(0).toUpperCase() || '?';

        var body = doc.createElement('span');
        body.className = 'sponsor-body';

        var name = doc.createElement('b');
        name.className = 'sponsor-name';
        name.textContent = s.name;

        var date = doc.createElement('time');
        date.className = 'sponsor-date';
        date.setAttribute('datetime', s.date || '');
        date.textContent = s.date || '';

        body.appendChild(name);
        body.appendChild(date);

        var amount = doc.createElement('span');
        amount.className = 'sponsor-amount';
        amount.textContent = money(s.amount);

        li.appendChild(mark);
        li.appendChild(body);
        li.appendChild(amount);
        listEl.appendChild(li);

        if (REDUCED) { li.classList.add('in'); return; }

        var delay = Math.min(i, 12) * 70;
        li.style.transitionDelay = delay + 'ms';
        setTimeout(function () {
          li.classList.add('in');
          setTimeout(function () { li.style.transitionDelay = ''; }, 700);
        }, 40 + delay);
      });
    }

    /* ---------------- 读取数据：线上 → 静态 → 页内 ---------------- */
    var CAN_FETCH = (typeof window.fetch === 'function' && location.protocol !== 'file:');

    function fetchJson(url) {
      return window.fetch(url, {
        headers: { Accept: 'application/json' },
        cache: 'no-store'
      }).then(function (res) {
        return res.text().then(function (text) {
          var data = null;
          try { data = JSON.parse(text); } catch (err) { data = null; }
          return { ok: res.ok, status: res.status, data: data };
        });
      });
    }

    /** 静态文件 → 页内兜底 */
    function staticRows() {
      if (!CAN_FETCH) return Promise.resolve(readFallback());
      return fetchJson('data/sponsors.json')
        .then(function (r) {
          if (r.ok && r.data) return normalize(r.data.sponsors);
          return readFallback();
        })
        .catch(function () { return readFallback(); });
    }

    function load() {
      var reachable = false;

      var probe = CAN_FETCH
        ? fetchJson(API).then(function (r) {
            // 接口在线：有数据用数据，没数据也算在线（否则第一次保存永远发不出去）
            if (r.data && r.data.error === 'not-initialized') return [];
            if (r.ok && r.data && Array.isArray(r.data.sponsors)) {
              return normalize(r.data.sponsors);
            }
            throw new Error('unreachable');
          })
        : Promise.reject(new Error('no-fetch'));

      probe
        .then(function (rows) {
          reachable = true;
          sp.live = rows;
        })
        .catch(function () {
          reachable = false;
        })
        .then(function () {
          sp.serverOk = reachable;
          if (sp.live.length) {
            sp.source = 'blobs';
            return null;
          }
          return staticRows().then(function (rows) {
            sp.live = rows;
            if (!reachable) sp.source = CAN_FETCH ? 'static' : 'inline';
            else sp.source = 'blobs';
          });
        })
        .then(function () {
          // 本机草稿只在开发者模式下产生，所以对管理员本人应当优先展示，
          // 否则"加了一条 → 刷新就没了"。
          if (!sp.unlocked) {
            var draft = readDraft();
            renderPublic(draft !== null ? draft : sp.live);
          }
          syncAdmin();
        });
    }

    /* =======================================================
       开发者模式
       ======================================================= */
    var dev = doc.getElementById('dev');
    var devBtn = doc.getElementById('devBtn');
    var devScrim = doc.getElementById('devScrim');
    var devClose = doc.getElementById('devClose');
    var devGate = doc.getElementById('devGate');
    var devBody = doc.getElementById('devBody');
    var devPass = doc.getElementById('devPass');
    var devEye = doc.getElementById('devEye');
    var devPaste = doc.getElementById('devPaste');
    var devEnter = doc.getElementById('devEnter');
    var devMsg = doc.getElementById('devMsg');
    var devForm = doc.getElementById('devForm');
    var devAdd = doc.getElementById('devAdd');
    var devCancel = doc.getElementById('devCancelEdit');
    var devList = doc.getElementById('devList');
    var devStatus = doc.getElementById('devStatus');
    var devWarn = doc.getElementById('devWarn');
    var devHint = doc.getElementById('devHint');

    if (!dev || !devBtn) return;

    var lock = { fails: 0, until: 0 };
    try {
      var raw = localStorage.getItem(LS_LOCK);
      if (raw) lock = JSON.parse(raw) || lock;
    } catch (err) { /* 忽略 */ }

    function persistLock() {
      try { localStorage.setItem(LS_LOCK, JSON.stringify(lock)); } catch (err) { /* 忽略 */ }
    }

    function verify(pass) {
      if (!window.crypto || !window.crypto.subtle) {
        return Promise.reject(new Error('当前环境不支持 WebCrypto（请用 https 访问）'));
      }
      var enc = new TextEncoder();
      return window.crypto.subtle
        .importKey('raw', enc.encode(pass), 'PBKDF2', false, ['deriveBits'])
        .then(function (key) {
          return window.crypto.subtle.deriveBits({
            name: 'PBKDF2',
            salt: b64ToBytes(AUTH.salt),
            iterations: AUTH.iter,
            hash: 'SHA-256'
          }, key, 256);
        })
        .then(function (bits) {
          var got = new Uint8Array(bits);
          var want = b64ToBytes(AUTH.hash);
          if (got.length !== want.length) return false;
          var diff = 0;
          for (var i = 0; i < got.length; i++) diff |= got[i] ^ want[i];
          return diff === 0;
        });
    }

    function setMsg(text, kind) {
      if (!devMsg) return;
      devMsg.textContent = text || '';
      devMsg.className = 'dev-msg' + (kind ? ' ' + kind : '');
    }

    function openDev() {
      dev.hidden = false;
      doc.body.style.overflow = 'hidden';
      setTimeout(function () {
        if (sp.unlocked) {
          if (devForm) devForm.elements.name.focus();
        } else if (devPass) {
          devPass.focus();
        }
      }, 60);
    }

    function closeDev() {
      dev.hidden = true;
      doc.body.style.overflow = '';
    }

    devBtn.addEventListener('click', openDev);
    if (devScrim) devScrim.addEventListener('click', closeDev);
    if (devClose) devClose.addEventListener('click', closeDev);
    doc.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !dev.hidden) closeDev();
    });

    if (devEye) {
      devEye.addEventListener('click', function () {
        var shown = devPass.type === 'text';
        devPass.type = shown ? 'password' : 'text';
        devEye.textContent = shown ? '显示' : '隐藏';
        devPass.focus();
      });
    }

    /**
     * 把输入收拾干净再比对，避免这些常见失误：
     *  - 从聊天窗口复制时带上的首尾空格
     *  - 零宽字符 / BOM
     *  - 中文输入法打出的全角符号（！＋％＃ 等）
     */
    function normalizePass(raw) {
      var notes = [];
      var s = String(raw == null ? '' : raw);

      var trimmed = s.replace(/^[\s\u3000]+|[\s\u3000]+$/g, '');
      if (trimmed !== s) { notes.push('已去掉首尾空格'); s = trimmed; }

      var noZw = s.replace(/[\u200b-\u200f\ufeff\u00a0]/g, '');
      if (noZw !== s) { notes.push('已移除零宽字符'); s = noZw; }

      var wide = 0;
      s = s.replace(/[\uff01-\uff5e]/g, function (ch) {
        wide += 1;
        return String.fromCharCode(ch.charCodeAt(0) - 0xfee0);
      });
      if (wide) notes.push('已把 ' + wide + ' 个全角字符转为半角');

      return { value: s, notes: notes };
    }

    function revealPass() {
      if (devPass.type !== 'text') {
        devPass.type = 'text';
        if (devEye) devEye.textContent = '隐藏';
      }
      devPass.select();
    }

    /** 失败时给出可行动的诊断，而不是只说一句"密码错误" */
    function diagnose(pass) {
      var parts = [];
      if (pass.length !== PASSLEN) {
        parts.push('你输入了 ' + pass.length + ' 位，密码是 ' + PASSLEN + ' 位');
      }
      var odd = [];
      for (var i = 0; i < pass.length; i++) {
        var c = pass.charCodeAt(i);
        if (c < 33 || c > 126) odd.push(pass.charAt(i));
      }
      if (odd.length) {
        parts.push('含 ' + odd.length + ' 个非 ASCII 字符（检查输入法是否切到中文）');
      }
      return parts.join('；');
    }

    if (devPaste) {
      devPaste.addEventListener('click', function () {
        if (!navigator.clipboard || !navigator.clipboard.readText) {
          setMsg('此环境不支持读取剪贴板，请在输入框里按 Ctrl+V', 'bad');
          devPass.focus();
          return;
        }
        navigator.clipboard.readText().then(function (text) {
          var norm = normalizePass(text);
          devPass.value = norm.value;
          devPass.focus();
          setMsg('已粘贴 ' + norm.value.length + ' 个字符' +
            (norm.notes.length ? '（' + norm.notes.join('；') + '）' : ''), '');
        }).catch(function () {
          setMsg('读取剪贴板被拒绝，请在输入框里按 Ctrl+V', 'bad');
          devPass.focus();
        });
      });
    }

    if (devPass) {
      devPass.addEventListener('paste', function () {
        setTimeout(function () {
          var norm = normalizePass(devPass.value);
          devPass.value = norm.value;
          if (norm.notes.length) setMsg(norm.notes.join('；'), '');
        }, 0);
      });

      // 边输边报字数，24 位密码少一位也能立刻看出来
      devPass.addEventListener('input', function () {
        if (lock.until > Date.now()) return;
        var norm = normalizePass(devPass.value);
        if (!norm.value) { setMsg(''); return; }
        setMsg('已输入 ' + norm.value.length + ' 位' +
          (norm.notes.length ? '（' + norm.notes.join('；') + '）' : ''), '');
      });
    }

    function tryUnlock() {
      var now = Date.now();
      if (lock.until > now) {
        setMsg('已锁定，请等待 ' + Math.ceil((lock.until - now) / 1000) + ' 秒', 'bad');
        return;
      }

      var norm = normalizePass(devPass.value);
      var pass = norm.value;
      if (!pass) { setMsg('请输入密码', 'bad'); return; }

      // 把规范化后的内容写回，让用户看到真正被校验的字符串
      if (pass !== devPass.value) devPass.value = pass;

      devEnter.disabled = true;
      setMsg(norm.notes.length ? (norm.notes.join('；') + '，校验中…') : '校验中…', '');

      verify(pass)
        .then(function (ok) {
          devEnter.disabled = false;
          if (!ok) {
            lock.fails = (lock.fails || 0) + 1;
            var why = diagnose(pass);
            var head;
            if (lock.fails >= 5) {
              var backoff = Math.min(30 * Math.pow(2, lock.fails - 5), 900);
              lock.until = Date.now() + backoff * 1000;
              head = '密码错误（失败 ' + lock.fails + ' 次，已锁定 ' + backoff + ' 秒）';
            } else {
              head = '密码错误（剩余尝试 ' + (5 - lock.fails) + ' 次）';
            }
            persistLock();
            setMsg(head + (why ? '。' + why + '。已显示输入内容，请核对' : '。已显示输入内容，请核对'), 'bad');
            revealPass();
            return;
          }
          lock.fails = 0;
          lock.until = 0;
          persistLock();
          sp.secret = pass;
          sp.unlocked = true;
          devPass.value = '';
          setMsg('');
          onUnlocked();
        })
        .catch(function (err) {
          devEnter.disabled = false;
          setMsg((err && err.message) || '校验失败', 'bad');
        });
    }

    if (devEnter) devEnter.addEventListener('click', tryUnlock);
    if (devPass) {
      devPass.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); tryUnlock(); }
      });
    }

    function onUnlocked() {
      devGate.hidden = true;
      devBody.hidden = false;

      // 本机草稿代表"还没保存的改动"，优先载入，避免静默丢失
      var draft = readDraft();
      sp.working = clone(draft !== null ? draft : sp.live);

      var carried = draft !== null && (sp.serverOk || ghReady()) &&
        JSON.stringify(draft) !== JSON.stringify(sp.live);

      renderAdmin();
      renderPublic(sp.working);
      fillGhForm();
      toast(carried ? '已载入未保存的本地改动，请点保存'
                    : (ghReady() ? '已解锁：保存会直接提交到 GitHub'
                                 : (sp.serverOk ? '已解锁，可直接保存到线上' : '已解锁（本机草稿模式）')));
    }

    function sourceLabel() {
      if (sp.source === 'blobs') return '线上存储（Netlify Blobs）';
      if (sp.source === 'static') return '仓库里的 data/sponsors.json';
      if (sp.source === 'inline') return '页内兜底数据';
      return '未知';
    }

    function isDirty() {
      return JSON.stringify(sp.working) !== JSON.stringify(sp.live);
    }

    function syncAdmin() {
      if (!devStatus || !sp.unlocked) return;

      var dirty = isDirty();
      var canPush = ghReady() || sp.serverOk;
      var mode = ghReady() ? '提交到 GitHub 仓库'
               : (sp.serverOk ? '保存到线上接口' : '只存本机');

      var tail;
      if (!canPush) tail = ' · 改动只在本机，别人看不到';
      else if (dirty) tail = ' · 有未保存改动';
      else tail = ' · 已同步';

      devStatus.textContent = '数据来源：' + sourceLabel() +
        ' · 保存方式：' + mode +
        ' · 当前 ' + sp.working.length + ' 条' + tail;
      devStatus.className = 'dev-status' + ((dirty || !canPush) ? ' dirty' : '');

      if (devWarn) {
        if (canPush) {
          devWarn.hidden = true;
        } else {
          devWarn.hidden = false;
          devWarn.innerHTML =
            '<b>还没配置保存通道 —— 你现在加的内容只存在这台设备，别的访客看不到</b>' +
            '要让所有人看到，任选一种：<br>' +
            '1. 展开下方「GitHub 直连」，填仓库 + 访问令牌（Fine-grained，给 Contents 读写权限），' +
            '之后点保存就会直接提交回仓库并自动重新发布；<br>' +
            '2. 点「复制 JSON」交给站点维护者，由他更新后重新发布；<br>' +
            '3. 或改用支持 Serverless Functions 的托管（Netlify 连 Git 仓库 + <code>ADMIN_PASSWORD</code>）。';
        }
      }

      if (devHint) {
        if (ghReady()) {
          devHint.textContent = '点保存后会把最新名单提交到 GitHub 仓库，约 1 分钟后全站生效。';
        } else if (sp.serverOk) {
          devHint.textContent = '改动点「保存到线上」后，所有访问者立即看到最新名单。';
        } else {
          devHint.textContent = '还没配置保存通道，改动只会存在本机草稿里（刷新后仍在，但只有你能看到）。';
        }
      }

      refreshGhBox();
    }

    /* ---------------- 管理列表 ---------------- */
    function renderAdmin() {
      devList.innerHTML = '';

      if (!sp.working.length) {
        var li0 = doc.createElement('li');
        li0.className = 'dev-empty';
        li0.textContent = '名单为空，用上面的表单添加第一条。';
        devList.appendChild(li0);
      }

      sp.working.forEach(function (s, i) {
        var li = doc.createElement('li');
        li.className = 'dev-item' + (sp.editing === i ? ' editing' : '');

        var info = doc.createElement('div');
        info.className = 'dev-item-info';

        var name = doc.createElement('b');
        name.textContent = s.name;
        var meta = doc.createElement('span');
        meta.textContent = money(s.amount) + (s.date ? ' · ' + s.date : '') + (s.note ? ' · ' + s.note : '');

        info.appendChild(name);
        info.appendChild(meta);

        var acts = doc.createElement('div');
        acts.className = 'dev-item-acts';

        var edit = doc.createElement('button');
        edit.type = 'button';
        edit.className = 'dev-mini';
        edit.textContent = sp.editing === i ? '编辑中' : '编辑';
        edit.addEventListener('click', function () { startEdit(i); });

        var del = doc.createElement('button');
        del.type = 'button';
        del.className = 'dev-mini dev-danger';
        del.textContent = '删除';
        del.addEventListener('click', function () { removeAt(i); });

        acts.appendChild(edit);
        acts.appendChild(del);

        li.appendChild(info);
        li.appendChild(acts);
        devList.appendChild(li);
      });

      if (sp.editing === -1) {
        if (devAdd) devAdd.textContent = '加入名单';
        if (devCancel) devCancel.hidden = true;
      }
      syncAdmin();
    }

    function startEdit(i) {
      sp.editing = i;
      var s = sp.working[i];
      devForm.elements.name.value = s.name;
      devForm.elements.amount.value = String(s.amount);
      devForm.elements.date.value = s.date || '';
      devForm.elements.note.value = s.note || '';
      devAdd.textContent = '更新这条';
      devCancel.hidden = false;
      devForm.elements.name.focus();
      renderAdmin();
    }

    function resetForm() {
      sp.editing = -1;
      devForm.reset();
      devForm.elements.date.value = new Date().toISOString().slice(0, 10);
      devAdd.textContent = '加入名单';
      devCancel.hidden = true;
    }

    if (devCancel) {
      devCancel.addEventListener('click', function () {
        resetForm();
        renderAdmin();
      });
    }

    function removeAt(i) {
      var s = sp.working[i];
      if (!window.confirm('确定删除「' + s.name + '」？')) return;
      sp.working.splice(i, 1);
      if (sp.editing === i) resetForm();
      else if (sp.editing > i) sp.editing -= 1;
      renderAdmin();
      renderPublic(sp.working);
      toast('已移除，记得点「保存到线上」');
    }

    if (devForm) {
      devForm.addEventListener('submit', function (e) {
        e.preventDefault();
        var f = devForm.elements;
        var name = String(f.name.value || '').trim();
        if (!name) return;
        var row = {
          name: name.slice(0, 40),
          amount: Math.max(0, Number(f.amount.value) || 0),
          date: f.date.value || '',
          note: String(f.note.value || '').trim().slice(0, 60)
        };
        if (sp.editing >= 0) {
          sp.working[sp.editing] = row;
        } else {
          sp.working.unshift(row);
        }
        resetForm();
        renderAdmin();
        renderPublic(sp.working);
        toast('已更新列表，记得点「保存到线上」');
      });
    }

    /* =======================================================
       GitHub 直连
       静态托管没有服务端，但可以让浏览器直接把 JSON 提交回仓库，
       由 GitHub Pages / Actions 自动重新发布。
       令牌只存在本机 localStorage，不进仓库、不发往第三方。
       ======================================================= */
    var GH_KEY = 'qcl.dev.gh';
    var GH_DEF_PATH = 'public/data/sponsors.json';

    var ghBox = doc.getElementById('devGh');
    var ghRepo = doc.getElementById('ghRepo');
    var ghBranch = doc.getElementById('ghBranch');
    var ghPathEl = doc.getElementById('ghPath');
    var ghToken = doc.getElementById('ghToken');
    var ghMsg = doc.getElementById('ghMsg');
    var ghSaveCfgBtn = doc.getElementById('ghSaveCfg');
    var ghTestBtn = doc.getElementById('ghTest');
    var ghClearBtn = doc.getElementById('ghClearCfg');

    function readGh() {
      var cfg = { repo: '', branch: 'main', path: GH_DEF_PATH, token: '' };
      try {
        var raw = localStorage.getItem(GH_KEY);
        if (raw) {
          var o = JSON.parse(raw) || {};
          cfg.repo = String(o.repo || '');
          cfg.branch = String(o.branch || 'main');
          cfg.path = String(o.path || GH_DEF_PATH);
          cfg.token = String(o.token || '');
        }
      } catch (err) { /* 忽略 */ }
      return cfg;
    }

    function writeGh(cfg) {
      try {
        if (!cfg.repo || !cfg.token) localStorage.removeItem(GH_KEY);
        else localStorage.setItem(GH_KEY, JSON.stringify(cfg));
        return true;
      } catch (err) { return false; }
    }

    var ghCfg = readGh();

    function ghReady() { return !!(ghCfg.repo && ghCfg.token); }

    function ghHeaders(cfg) {
      return {
        Authorization: 'Bearer ' + cfg.token,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28'
      };
    }

    function ghContentsUrl(cfg) {
      return 'https://api.github.com/repos/' + cfg.repo + '/contents/' +
        cfg.path.split('/').map(encodeURIComponent).join('/');
    }

    function utf8ToB64(str) {
      var bytes = new TextEncoder().encode(str);
      var bin = '';
      for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
      return btoa(bin);
    }

    function setGhMsg(text, bad) {
      if (!ghMsg) return;
      ghMsg.textContent = text || '';
      ghMsg.className = 'dev-msg' + (bad ? ' bad' : '');
    }

    function collectGhForm() {
      var repo = ((ghRepo && ghRepo.value) || '').trim()
        .replace(/^https?:\/\/github\.com\//i, '')
        .replace(/\.git$/i, '')
        .replace(/\/+$/, '');
      return {
        repo: repo,
        branch: ((ghBranch && ghBranch.value) || '').trim() || 'main',
        path: ((ghPathEl && ghPathEl.value) || '').trim() || GH_DEF_PATH,
        token: ((ghToken && ghToken.value) || '').trim()
      };
    }

    function refreshGhBox() {
      if (ghBox) ghBox.classList.toggle('on', ghReady());
      if (devSave) devSave.textContent = ghReady() ? '保存到 GitHub' : '保存到线上';
    }

    function fillGhForm() {
      if (ghRepo) ghRepo.value = ghCfg.repo;
      if (ghBranch) ghBranch.value = ghCfg.branch;
      if (ghPathEl) ghPathEl.value = ghCfg.path;
      if (ghToken) ghToken.value = ghCfg.token;
      refreshGhBox();
    }

    function ghSave() {
      var cfg = collectGhForm();
      if (!cfg.repo || !cfg.token) { setGhMsg('请先填写仓库与访问令牌', true); return; }

      ghCfg = cfg;
      writeGh(cfg);
      refreshGhBox();

      var url = ghContentsUrl(cfg);
      devSave.disabled = true;
      setGhMsg('正在提交…', false);
      toast('正在提交到 GitHub…');

      window.fetch(url + '?ref=' + encodeURIComponent(cfg.branch), { headers: ghHeaders(cfg) })
        .then(function (r) {
          return r.json().catch(function () { return null; })
            .then(function (d) { return { status: r.status, data: d }; });
        })
        .then(function (cur) {
          if (cur.data && cur.data.sha) return cur.data.sha;
          if (cur.status === 404) return null;            // 文件还不存在 → 新建
          if (cur.status === 401) throw new Error('令牌无效或已过期（401）');
          if (cur.status === 403) throw new Error('令牌没有该仓库的读写权限（403）');
          throw new Error((cur.data && cur.data.message) || ('读取仓库失败（HTTP ' + cur.status + '）'));
        })
        .then(function (sha) {
          var body = {
            message: 'chore(sponsors): 更新感谢名单（' + sp.working.length + ' 条）',
            content: utf8ToB64(currentJson() + '\n'),
            branch: cfg.branch
          };
          if (sha) body.sha = sha;
          return window.fetch(url, {
            method: 'PUT',
            headers: Object.assign({ 'Content-Type': 'application/json' }, ghHeaders(cfg)),
            body: JSON.stringify(body)
          });
        })
        .then(function (r) {
          return r.json().catch(function () { return {}; })
            .then(function (d) { return { status: r.status, data: d }; });
        })
        .then(function (res) {
          devSave.disabled = false;
          if (!res.data || !res.data.content) {
            var m = (res.data && res.data.message) || ('提交失败（HTTP ' + res.status + '）');
            if (res.status === 401) m = '令牌无效或已过期（401）';
            if (res.status === 403) m = '令牌没有写入权限，或触发了 GitHub 限制（403）';
            if (res.status === 409) m = '文件已被改动，请刷新页面后重试（409）';
            throw new Error(m);
          }
          sp.live = normalize(sp.working);
          try { localStorage.removeItem(LS_DRAFT); } catch (err) { /* 忽略 */ }
          renderAdmin();
          setGhMsg('已提交到 GitHub，Pages 约 1 分钟后自动更新。', false);
          toast('已提交，约 1 分钟后全站生效');
        })
        .catch(function (err) {
          devSave.disabled = false;
          // 提交失败也别把用户刚编辑的内容丢掉
          writeDraft(sp.working);
          syncAdmin();
          var m = (err && err.message) || '提交失败';
          setGhMsg(m + '。改动已暂存在本机，修好后可重试。', true);
          toast(m, true);
        });
    }

    function ghTestConn() {
      var cfg = collectGhForm();
      if (!cfg.repo || !cfg.token) { setGhMsg('请先填写仓库与访问令牌', true); return; }
      setGhMsg('测试中…', false);
      window.fetch('https://api.github.com/repos/' + cfg.repo, { headers: ghHeaders(cfg) })
        .then(function (r) {
          return r.json().catch(function () { return {}; })
            .then(function (d) { return { status: r.status, data: d }; });
        })
        .then(function (r) {
          if (r.status === 200 && r.data && r.data.full_name) {
            setGhMsg('连接成功：' + r.data.full_name +
              '（默认分支 ' + (r.data.default_branch || '?') + '）', false);
          } else if (r.status === 401) {
            setGhMsg('令牌无效或已过期（401）', true);
          } else if (r.status === 404) {
            setGhMsg('仓库不存在，或令牌未授权访问该仓库（404）', true);
          } else {
            setGhMsg('失败：' + ((r.data && r.data.message) || ('HTTP ' + r.status)), true);
          }
        })
        .catch(function () { setGhMsg('网络错误，无法访问 GitHub API', true); });
    }

    if (ghSaveCfgBtn) {
      ghSaveCfgBtn.addEventListener('click', function () {
        var cfg = collectGhForm();
        if (!cfg.repo) { setGhMsg('仓库不能为空', true); return; }
        if (cfg.repo.split('/').length !== 2) { setGhMsg('仓库要写成 owner/repo 的形式', true); return; }
        ghCfg = cfg;
        if (!writeGh(cfg)) { setGhMsg('本机存储不可用，配置无法保存', true); return; }
        refreshGhBox();
        setGhMsg(cfg.token ? '已记住配置（令牌只存在本机浏览器）' : '已记住仓库，但还没填令牌', !cfg.token);
      });
    }
    if (ghTestBtn) ghTestBtn.addEventListener('click', ghTestConn);
    if (ghClearBtn) {
      ghClearBtn.addEventListener('click', function () {
        ghCfg = { repo: '', branch: 'main', path: GH_DEF_PATH, token: '' };
        try { localStorage.removeItem(GH_KEY); } catch (err) { /* 忽略 */ }
        fillGhForm();
        setGhMsg('已清除本机保存的 GitHub 配置', false);
      });
    }

    /* ---------------- 保存 ---------------- */
    function save() {
      if (ghReady()) { ghSave(); return; }

      if (!sp.serverOk) {
        var stored = writeDraft(sp.working);
        syncAdmin();
        toast(stored
          ? '已存到本机（线上接口不可用），只有你这台设备看得到'
          : '本机存储不可用，请改用「下载 JSON」', !stored);
        return;
      }

      devSave.disabled = true;
      toast('正在保存…');

      window.fetch(API, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': sp.secret
        },
        body: JSON.stringify({ sponsors: sp.working })
      })
        .then(function (res) {
          return res.text().then(function (text) {
            var data = null;
            try { data = JSON.parse(text); } catch (err) { data = null; }
            return { status: res.status, data: data };
          });
        })
        .then(function (r) {
          devSave.disabled = false;

          if (!r.data || !r.data.ok) {
            if (r.data && r.data.error) throw new Error(r.data.error);
            if (r.status === 404) {
              throw new Error('线上接口不存在：Netlify Functions 未部署，或未配置 ADMIN_PASSWORD');
            }
            throw new Error('保存失败（HTTP ' + r.status + '）');
          }

          sp.live = normalize(r.data.sponsors || sp.working);
          sp.working = clone(sp.live);
          sp.serverOk = true;

          // 已经落到线上，本机草稿就该让位，否则会盖住更新的线上数据
          try { localStorage.removeItem(LS_DRAFT); } catch (err) { /* 忽略 */ }

          renderAdmin();
          renderPublic(sp.live);
          toast('已保存，' + sp.live.length + ' 条已上线，所有访客可见');
        })
        .catch(function (err) {
          devSave.disabled = false;
          writeDraft(sp.working);
          syncAdmin();
          toast((err && err.message) || '保存失败', true);
        });
    }

    var devSave = doc.getElementById('devSave');
    if (devSave) devSave.addEventListener('click', save);

    /* ---------------- 导入 / 导出 ---------------- */
    function currentJson() {
      return JSON.stringify({
        updated: new Date().toISOString().slice(0, 10),
        currency: 'CNY',
        sponsors: sorted(sp.working)
      }, null, 2);
    }

    function copyText(text) {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        return navigator.clipboard.writeText(text);
      }
      return new Promise(function (resolve, reject) {
        var ta = doc.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        doc.body.appendChild(ta);
        ta.select();
        var ok = false;
        try { ok = doc.execCommand('copy'); } catch (err) { ok = false; }
        doc.body.removeChild(ta);
        ok ? resolve() : reject(new Error('复制失败'));
      });
    }

    var devExport = doc.getElementById('devExport');
    if (devExport) {
      devExport.addEventListener('click', function () {
        var blob = new Blob([currentJson()], { type: 'application/json' });
        var url = URL.createObjectURL(blob);
        var a = doc.createElement('a');
        a.href = url;
        a.download = 'sponsors.json';
        doc.body.appendChild(a);
        a.click();
        doc.body.removeChild(a);
        setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
        toast('已下载 sponsors.json');
      });
    }

    var devCopy = doc.getElementById('devCopy');
    if (devCopy) {
      devCopy.addEventListener('click', function () {
        copyText(currentJson())
          .then(function () { toast('JSON 已复制到剪贴板'); })
          .catch(function () { toast('复制失败，请改用「下载 JSON」', true); });
      });
    }

    var devImport = doc.getElementById('devImport');
    if (devImport) {
      devImport.addEventListener('click', function () {
        var text = window.prompt('把 sponsors.json 的内容粘贴到这里：');
        if (!text) return;
        try {
          var parsed = JSON.parse(text);
          var rows = normalize(Array.isArray(parsed) ? parsed : parsed.sponsors);
          if (!rows.length) throw new Error('没解析出任何条目');
          sp.working = rows;
          resetForm();
          renderAdmin();
          renderPublic(sp.working);
          toast('已导入 ' + rows.length + ' 条');
        } catch (err) {
          toast('导入失败：' + ((err && err.message) || 'JSON 格式错误'), true);
        }
      });
    }

    var devWipe = doc.getElementById('devWipe');
    if (devWipe) {
      devWipe.addEventListener('click', function () {
        if (!window.confirm('清空全部名单？此操作不可撤销（保存后才会同步到线上）。')) return;
        sp.working = [];
        resetForm();
        renderAdmin();
        renderPublic(sp.working);
        toast('已清空，记得点「保存到线上」');
      });
    }

    /* ---------------- 轻提示 ---------------- */
    var toastEl = null, toastTimer = null;
    function toast(text, bad) {
      if (!toastEl) {
        toastEl = doc.createElement('div');
        toastEl.className = 'dev-toast';
        doc.body.appendChild(toastEl);
      }
      toastEl.textContent = text;
      toastEl.className = 'dev-toast show' + (bad ? ' bad' : '');
      clearTimeout(toastTimer);
      toastTimer = setTimeout(function () {
        toastEl.className = 'dev-toast' + (bad ? ' bad' : '');
      }, 2600);
    }

    /* ---------------- 启动 ---------------- */
    if (devForm) devForm.elements.date.value = new Date().toISOString().slice(0, 10);
    load();
  })();
})();
