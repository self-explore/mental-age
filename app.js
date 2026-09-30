// ==================== 状态 ====================
let answers = [];          // 每题所选 option index
let actualAge = 0;

// ==================== 视图切换 ====================
function show(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  window.scrollTo(0, 0);
}

// ==================== 生日页 ====================
function initBirthday() {
  const y = document.getElementById('sel-year');
  const m = document.getElementById('sel-month');
  const d = document.getElementById('sel-day');
  const nowY = new Date().getFullYear();
  y.innerHTML = '';
  for (let i = nowY - 4; i >= 1942; i--) y.innerHTML += `<option value="${i}">${i}</option>`;
  m.innerHTML = '';
  for (let i = 1; i <= 12; i++) m.innerHTML += `<option value="${i}">${i} 月</option>`;
  d.innerHTML = '';
  for (let i = 1; i <= 31; i++) d.innerHTML += `<option value="${i}">${i} 日</option>`;
  // 默认 1995-06-15
  y.value = '1995'; m.value = '6'; d.value = '15';
}

function enterQuiz() {
  const y = +document.getElementById('sel-year').value;
  const m = +document.getElementById('sel-month').value;
  const d = +document.getElementById('sel-day').value;
  const now = new Date();
  let age = now.getFullYear() - y;
  const md = now.getMonth() + 1;
  if (md < m || (md === m && now.getDate() < d)) age--;
  actualAge = Math.max(1, age);

  answers = new Array(QUESTIONS.length).fill(null);
  show('quiz-page');
  renderQuestion(0);
}

// ==================== 答题 ====================
let cur = 0;
function renderQuestion(i) {
  cur = i;
  const q = QUESTIONS[i];
  const total = QUESTIONS.length;
  document.getElementById('q-num').textContent = `Question ${i + 1}`;
  document.getElementById('q-total').textContent = `${total} total`;
  document.getElementById('q-bar').style.width = `${((i) / total) * 100}%`;
  document.getElementById('q-text').textContent = q.text;
  const wrap = document.getElementById('q-opts');
  wrap.innerHTML = q.opts.map((t, idx) =>
    `<button class="opt" onclick="pick(${idx})"><span class="opt-tag">${'ABCD'[idx]}</span>${t}</button>`
  ).join('');
}

function pick(idx) {
  answers[cur] = idx;
  if (cur < QUESTIONS.length - 1) {
    renderQuestion(cur + 1);
    window.scrollTo(0, 0);
  } else {
    startLoading();
  }
}

// ==================== 加载页 ====================
function startLoading() {
  show('load-page');
  const steps = ['读取作答结构', '计算心理年龄', '识别人格原型', '封装完整报告'];
  const bar = document.getElementById('load-bar');
  const pct = document.getElementById('load-pct');
  const list = document.getElementById('load-steps');
  list.innerHTML = steps.map((s, i) => `<div class="load-step" id="ls-${i}"><span class="ls-dot"></span>${s}</div>`).join('');
  let p = 0;
  const timer = setInterval(() => {
    p += Math.random() * 9 + 4;
    if (p >= 100) { p = 100; clearInterval(timer); setTimeout(showResult, 400); }
    bar.style.width = p + '%';
    pct.textContent = Math.floor(p) + '%';
    const stage = Math.min(3, Math.floor(p / 25));
    for (let i = 0; i < 4; i++) {
      const el = document.getElementById('ls-' + i);
      el.classList.toggle('done', i < stage || p >= 100);
      el.classList.toggle('active', i === stage && p < 100);
    }
  }, 160);
}

// ==================== 计分 ====================
function compute() {
  const dimScore = {}; DIMS.forEach(d => dimScore[d.key] = 0);
  const dimCount = {}; DIMS.forEach(d => dimCount[d.key] = 0);
  const spScore = {}; SPECIALS.forEach(s => spScore[s.key] = { sum: 0, n: 0 });
  let total = 0;

  QUESTIONS.forEach((q, i) => {
    const a = answers[i] == null ? 0 : answers[i];
    const val = a + 1;
    total += val;
    dimScore[q.dim] += val;
    dimCount[q.dim]++;
    if (q.sp && q.spv) {
      spScore[q.sp].sum += q.spv[a];
      spScore[q.sp].n++;
    }
  });

  const radar = DIMS.map(d => {
    const max = (dimCount[d.key] || 1) * 4;
    return { ...d, pct: Math.round((dimScore[d.key] / max) * 100) };
  });

  const special = SPECIALS.map(s => {
    const o = spScore[s.key];
    const pct = o.n ? Math.round(o.sum / o.n) : 50;
    return { ...s, pct };
  });

  const tier = TIERS.find(t => total >= t.min && total <= t.max) || TIERS[TIERS.length - 1];

  // 心理年龄：在档位区间内线性插值
  const ratio = (total - tier.min) / Math.max(1, tier.max - tier.min);
  const mentalAge = Math.round(tier.ageFrom + ratio * (tier.ageTo - tier.ageFrom));

  return { total, radar, special, tier, mentalAge };
}

// ==================== 雷达图 ====================
function drawRadar(canvasId, radar) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const dpr = window.devicePixelRatio || 1;
  const size = 300;
  canvas.width = size * dpr; canvas.height = size * dpr;
  canvas.style.width = size + 'px'; canvas.style.height = size + 'px';
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  const cx = size / 2, cy = size / 2, R = size / 2 - 52;
  const n = radar.length;

  ctx.clearRect(0, 0, size, size);
  // 网格
  for (let ring = 1; ring <= 4; ring++) {
    const rr = R * ring / 4;
    ctx.beginPath();
    for (let i = 0; i <= n; i++) {
      const ang = -Math.PI / 2 + (i % n) * (2 * Math.PI / n);
      const x = cx + rr * Math.cos(ang), y = cy + rr * Math.sin(ang);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.strokeStyle = 'rgba(140,120,80,0.18)'; ctx.lineWidth = 1; ctx.stroke();
  }
  for (let i = 0; i < n; i++) {
    const ang = -Math.PI / 2 + i * (2 * Math.PI / n);
    ctx.beginPath(); ctx.moveTo(cx, cy);
    ctx.lineTo(cx + R * Math.cos(ang), cy + R * Math.sin(ang));
    ctx.strokeStyle = 'rgba(140,120,80,0.15)'; ctx.stroke();
  }
  // 数据
  ctx.beginPath();
  const pts = [];
  radar.forEach((d, i) => {
    const v = d.pct / 100;
    const ang = -Math.PI / 2 + i * (2 * Math.PI / n);
    const x = cx + R * v * Math.cos(ang), y = cy + R * v * Math.sin(ang);
    pts.push([x, y]);
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.closePath();
  ctx.fillStyle = 'rgba(160,130,60,0.22)'; ctx.fill();
  ctx.strokeStyle = '#a0823c'; ctx.lineWidth = 2; ctx.stroke();
  pts.forEach(([x, y]) => { ctx.beginPath(); ctx.arc(x, y, 3.5, 0, 7); ctx.fillStyle = '#a0823c'; ctx.fill(); });
  // 标签
  ctx.font = '12px "Noto Sans SC", sans-serif';
  ctx.fillStyle = '#6a6252'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  radar.forEach((d, i) => {
    const ang = -Math.PI / 2 + i * (2 * Math.PI / n);
    ctx.fillText(d.label, cx + (R + 30) * Math.cos(ang), cy + (R + 24) * Math.sin(ang));
  });
}

// ==================== 结果页 ====================
function showResult() {
  const r = compute();
  show('result-page');

  const diff = r.mentalAge - actualAge;
  let diffText, diffArrow, diffWord;
  if (diff < 0) { diffArrow = '↓'; diffWord = '年轻'; diffText = `你的内心比实际年龄年轻 ${-diff} 岁，保留着珍贵的活力。`; }
  else if (diff > 0) { diffArrow = '↑'; diffWord = '成熟'; diffText = `你的内心比实际年龄成熟 ${diff} 岁，拥有超越同龄的沉稳。`; }
  else { diffArrow = '='; diffWord = '同步'; diffText = '你的心理年龄与实际年龄高度一致，是难得的平衡状态。'; }

  const scroll = document.getElementById('result-scroll');
  scroll.innerHTML = `
    <!-- 1 徽章+标题 -->
    <div class="r-head fade-enter">
      <span class="r-badge">测试完成</span>
      <h1 class="r-h1">你的心理画像</h1>
    </div>

    <!-- 2 年龄对比 -->
    <div class="age-card fade-enter" style="animation-delay:.05s">
      <div class="age-col">
        <div class="age-num" style="color:#7a66c8">${r.mentalAge}<small>岁</small></div>
        <div class="age-label">心理年龄</div>
      </div>
      <div class="age-mid">
        <div class="age-arrow">${diffArrow}</div>
        <div class="age-word">${diffWord}</div>
      </div>
      <div class="age-col">
        <div class="age-num" style="color:#8a8496">${actualAge}<small>岁</small></div>
        <div class="age-label">实际年龄</div>
      </div>
      <div class="age-diff">${diffText}</div>
    </div>

    <!-- 3 类型横幅 -->
    <div class="type-banner fade-enter" style="background:${r.tier.gradient}; animation-delay:.1s">
      <div class="type-name">${r.tier.name}</div>
      <div class="type-sub">PSYCHE AGE ARCHETYPE</div>
    </div>

    <!-- 4 解析 + 雷达 -->
    <div class="duo fade-enter" style="animation-delay:.15s">
      <div class="duo-card">
        <div class="card-title">性格深度解析</div>
        <p class="para">${r.tier.desc}</p>
        <div class="kw-wrap">${r.tier.keywords.map(k => `<span class="kw">#${k}</span>`).join('')}</div>
      </div>
      <div class="duo-card">
        <div class="card-title">维度分析</div>
        <canvas id="radar-canvas"></canvas>
      </div>
    </div>

    <!-- 5 特别视角（新增） -->
    <div class="sec fade-enter" style="animation-delay:.2s">
      <div class="sec-title">特别视角<span class="sec-new">NEW</span></div>
      <div class="special-box">
        ${r.special.map(s => `
          <div class="sp-item">
            <div class="sp-head">
              <span class="sp-label">${s.label}</span>
              <span class="sp-pct">${s.pct}%</span>
            </div>
            <div class="sp-bar"><div class="sp-fill" style="width:${s.pct}%"></div></div>
            <div class="sp-ends"><span>${s.low}</span><span>${s.high}</span></div>
            <div class="sp-desc">${s.desc}</div>
          </div>
        `).join('')}
      </div>
    </div>

    <!-- 6 深度自我分析 -->
    <div class="sec fade-enter" style="animation-delay:.25s">
      <div class="sec-title">深度自我分析</div>
      <div class="ana-card">
        <div class="ana-sub good">核心优势</div>
        <ul class="ana-list">${r.tier.strengths.map(s => `<li>${s}</li>`).join('')}</ul>
        <div class="ana-sub bad">潜在盲点</div>
        <ul class="ana-list">${r.tier.blinds.map(s => `<li>${s}</li>`).join('')}</ul>
        <div class="ana-sub">维度解读</div>
        <p class="para">${r.tier.dimNote}</p>
      </div>
    </div>

    <!-- 7 社交与匹配 -->
    <div class="sec fade-enter" style="animation-delay:.3s">
      <div class="sec-title">社交与匹配</div>
      <div class="ana-card">
        <div class="match-row"><span class="match-k">你的原型角色</span><span class="match-v">${r.tier.role}</span></div>
        <div class="match-row"><span class="match-k">最佳拍档</span><span class="match-v">${r.tier.partner}</span></div>
        <p class="para small">${r.tier.partnerWhy}</p>
        <div class="match-row"><span class="match-k">你的克星</span><span class="match-v">${r.tier.nemesis}</span></div>
        <p class="para small">${r.tier.nemesisWhy}</p>
        <div class="ana-sub">给未来的建议</div>
        <p class="para">${r.tier.advice}</p>
      </div>
    </div>

    <!-- 8 底栏 -->
    <div class="r-foot fade-enter" style="animation-delay:.35s">
      <div class="foot-score">总分 <strong>${r.total}</strong> / 160</div>
      <div class="foot-btns">
        <button class="fbtn" onclick="restart()">重新测试</button>
        <button class="fbtn ghost" onclick="shareResult()">分享结果</button>
      </div>
    </div>
  `;

  window.scrollTo(0, 0);
  setTimeout(() => drawRadar('radar-canvas', r.radar), 120);
}

function restart() { show('cover-page'); }
function shareResult() {
  const txt = '我刚测了心理年龄测试，来看看你的灵魂几岁了？';
  if (navigator.share) navigator.share({ title: '心理年龄测试', text: txt, url: location.href }).catch(() => {});
  else { alert('链接已复制，去分享给朋友吧！\n' + location.href); }
}

// ==================== 启动 ====================
initBirthday();
