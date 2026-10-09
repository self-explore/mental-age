// ==================== 状态 ====================
let answers = [];          // 每题所选 option index
let actualAge = 0;
let lastResult = null;     // 缓存结果供长图分享

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
    const concl = pct >= 60 ? s.high : (pct <= 40 ? s.low : '平衡中间');
    return { ...s, pct, concl };
  });

  const tier = TIERS.find(t => total >= t.min && total <= t.max) || TIERS[TIERS.length - 1];

  // 心理年龄：在档位区间内线性插值
  const ratio = (total - tier.min) / Math.max(1, tier.max - tier.min);
  const mentalAge = Math.round(tier.ageFrom + ratio * (tier.ageTo - tier.ageFrom));

  const sorted = [...radar].sort((a, b) => b.pct - a.pct);
  return { total, radar, special, tier, mentalAge, maxDim: sorted[0], minDim: sorted[sorted.length - 1] };
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
    ctx.strokeStyle = 'rgba(31,58,92,0.12)'; ctx.lineWidth = 1; ctx.stroke();
  }
  for (let i = 0; i < n; i++) {
    const ang = -Math.PI / 2 + i * (2 * Math.PI / n);
    ctx.beginPath(); ctx.moveTo(cx, cy);
    ctx.lineTo(cx + R * Math.cos(ang), cy + R * Math.sin(ang));
    ctx.strokeStyle = 'rgba(31,58,92,0.10)'; ctx.stroke();
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
  ctx.fillStyle = 'rgba(56,189,248,0.22)'; ctx.fill();
  ctx.strokeStyle = '#38BDF8'; ctx.lineWidth = 2; ctx.stroke();
  pts.forEach(([x, y]) => { ctx.beginPath(); ctx.arc(x, y, 3.5, 0, 7); ctx.fillStyle = '#38BDF8'; ctx.fill(); });
  // 同龄人平均线（虚线）
  ctx.beginPath();
  radar.forEach((d, i) => {
    const v = (d.avg || 50) / 100;
    const ang = -Math.PI / 2 + i * (2 * Math.PI / n);
    const x = cx + R * v * Math.cos(ang), y = cy + R * v * Math.sin(ang);
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.closePath();
  ctx.setLineDash([4, 4]);
  ctx.strokeStyle = 'rgba(255,107,157,0.75)'; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.setLineDash([]);
  // 标签
  ctx.font = '12px "Noto Sans SC", sans-serif';
  ctx.fillStyle = '#5b7699'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  radar.forEach((d, i) => {
    const ang = -Math.PI / 2 + i * (2 * Math.PI / n);
    ctx.fillText(d.label, cx + (R + 30) * Math.cos(ang), cy + (R + 24) * Math.sin(ang));
  });
}

// 维度三档解读
function dimNoteOf(d) {
  if (d.pct >= 75) return d.note.high;
  if (d.pct >= 50) return d.note.mid;
  return d.note.low;
}

// ==================== 结果页 ====================
function showResult() {
  lastResult = compute();
  const r = lastResult;
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

    <!-- 5 八维成熟度明细 -->
    <div class="sec fade-enter" style="animation-delay:.18s">
      <div class="sec-title">八维成熟度明细</div>
      <div class="ana-card">
        <div class="dim-extreme">
          <span class="de-tag good">最突出</span><span>${r.maxDim.label} ${r.maxDim.pct}%</span>
          <span class="de-tag bad">需关照</span><span>${r.minDim.label} ${r.minDim.pct}%</span>
        </div>
        ${r.radar.map(d => `
          <div class="dm-item">
            <div class="dm-head"><span class="dm-label">${d.label}</span><span class="dm-pct">${d.pct}%</span></div>
            <div class="dm-bar"><div class="dm-fill" style="width:${d.pct}%;background:${d.color}"></div><span class="dm-avg" style="left:${d.avg}%"></span></div>
            <div class="dm-note">${dimNoteOf(d)}<span class="dm-diff ${d.pct >= d.avg ? 'up' : 'down'}">${d.pct >= d.avg ? '高于' : '低于'}同龄平均 ${Math.abs(d.pct - d.avg)}%</span></div>
          </div>
        `).join('')}
      </div>
    </div>

    <!-- 6 特别视角（新增） -->
    <div class="sec fade-enter" style="animation-delay:.2s">
      <div class="sec-title">特别视角<span class="sec-new">NEW</span></div>
      <div class="special-box">
        ${r.special.map(s => `
          <div class="sp-item">
            <div class="sp-head">
              <span class="sp-label">${s.label}<span class="sp-concl">${s.concl}</span></span>
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

    <!-- 9 心智成长坐标 -->
    <div class="sec fade-enter" style="animation-delay:.34s">
      <div class="sec-title">心智成长坐标</div>
      <div class="ana-card">
        <div class="tl-wrap">
          ${TIERS.map(t => `
            <div class="tl-item ${t.name === r.tier.name ? 'cur' : ''}">
              <div class="tl-dot" style="background:${t.gradient}"></div>
              <div class="tl-age">${t.ageFrom}-${t.ageTo}岁</div>
              <div class="tl-name">${t.name}</div>
              ${t.name === r.tier.name ? '<div class="tl-cur">你在这里</div>' : ''}
            </div>
          `).join('')}
        </div>
        <p class="para small">你的心理年龄落在「${r.tier.name}」区间（${r.tier.ageFrom}-${r.tier.ageTo} 岁），这是你当前心智所处的成长坐标。</p>
      </div>
    </div>

    <!-- 10 成长锦囊 -->
    <div class="sec fade-enter" style="animation-delay:.38s">
      <div class="sec-title">成长锦囊</div>
      <div class="quote-card">
        <div class="qc-quote">“${r.tier.quote}”</div>
        <div class="qc-comment">${r.tier.comment}</div>
        <div class="qc-role">—— ${r.tier.role} · ${r.tier.name}</div>
      </div>
      <div class="ana-card">
        <div class="ana-sub">本周可执行的三个小行动</div>
        <ul class="act-list">${r.tier.actions.map((a, i) => `<li><span class="act-num">${i + 1}</span>${a}</li>`).join('')}</ul>
      </div>
    </div>

    <!-- 11 底栏 -->
    <div class="r-foot fade-enter" style="animation-delay:.35s">
      <div class="foot-score">总分 <strong>${r.total}</strong> / 160</div>
      <div class="foot-btns">
        <button class="fbtn" onclick="restart()">重新测试</button>
        <button class="fbtn ghost" onclick="shareImage()">保存长图</button>
        <button class="fbtn ghost" onclick="shareResult()">分享结果</button>
      </div>
    </div>
  `;

  window.scrollTo(0, 0);
  setTimeout(() => drawRadar('radar-canvas', r.radar), 120);
}

// ==================== 长图分享 ====================
let currentShareUrl = '';
function wrapText(ctx, text, x, y, maxW, lineH) {
  let line = '';
  for (const ch of text) {
    if (ctx.measureText(line + ch).width > maxW) { ctx.fillText(line, x, y); line = ch; y += lineH; }
    else line += ch;
  }
  if (line) { ctx.fillText(line, x, y); y += lineH; }
  return y;
}
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
function paintShareRadar(ctx, cx, cy, R, radar) {
  const n = radar.length;
  ctx.strokeStyle = 'rgba(31,58,92,0.12)'; ctx.lineWidth = 1;
  for (let ring = 1; ring <= 4; ring++) {
    const rr = R * ring / 4;
    ctx.beginPath();
    for (let i = 0; i <= n; i++) {
      const ang = -Math.PI / 2 + (i % n) * (2 * Math.PI / n);
      const x = cx + rr * Math.cos(ang), yy = cy + rr * Math.sin(ang);
      i === 0 ? ctx.moveTo(x, yy) : ctx.lineTo(x, yy);
    }
    ctx.stroke();
  }
  ctx.beginPath();
  radar.forEach((d, i) => {
    const v = d.pct / 100;
    const ang = -Math.PI / 2 + i * (2 * Math.PI / n);
    const x = cx + R * v * Math.cos(ang), yy = cy + R * v * Math.sin(ang);
    i === 0 ? ctx.moveTo(x, yy) : ctx.lineTo(x, yy);
  });
  ctx.closePath();
  ctx.fillStyle = 'rgba(56,189,248,0.25)'; ctx.fill();
  ctx.strokeStyle = '#38BDF8'; ctx.lineWidth = 2; ctx.stroke();
  ctx.beginPath();
  radar.forEach((d, i) => {
    const v = (d.avg || 50) / 100;
    const ang = -Math.PI / 2 + i * (2 * Math.PI / n);
    const x = cx + R * v * Math.cos(ang), yy = cy + R * v * Math.sin(ang);
    i === 0 ? ctx.moveTo(x, yy) : ctx.lineTo(x, yy);
  });
  ctx.closePath();
  ctx.setLineDash([4, 4]); ctx.strokeStyle = 'rgba(255,107,157,0.75)'; ctx.lineWidth = 1.5; ctx.stroke(); ctx.setLineDash([]);
  ctx.fillStyle = '#5b7699'; ctx.font = '500 16px "Noto Sans SC", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  radar.forEach((d, i) => {
    const ang = -Math.PI / 2 + i * (2 * Math.PI / n);
    ctx.fillText(d.label, cx + (R + 26) * Math.cos(ang), cy + (R + 20) * Math.sin(ang));
  });
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
}
function shareImage() {
  const r = lastResult; if (!r) return;
  const W = 750, pad = 52;
  const diff = r.mentalAge - actualAge;
  const diffWord = diff < 0 ? `年轻${-diff}岁` : diff > 0 ? `成熟${diff}岁` : '同步';
  const headH = 150, ageH = 150, typeH = 120, radarH = 420;
  const dimH = 8 * 62 + 70;
  const quoteH = 260;
  const spH = r.special.length * 44 + 70;
  const footH = 100;
  const H = headH + ageH + typeH + radarH + dimH + quoteH + spH + footH;
  const cv = document.createElement('canvas');
  const dpr = 2;
  cv.width = W * dpr; cv.height = H * dpr;
  const ctx = cv.getContext('2d');
  ctx.scale(dpr, dpr);
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#eef7ff'); bg.addColorStop(.5, '#dceeff'); bg.addColorStop(1, '#cfe4fa');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  ctx.textBaseline = 'top'; ctx.textAlign = 'left';
  let y = 44;
  ctx.fillStyle = '#5b7699'; ctx.font = '500 20px "Noto Sans SC", sans-serif';
  ctx.fillText('自我探索 · 真实心理年龄测试', pad, y); y += 34;
  ctx.fillStyle = '#1f3a5c'; ctx.font = '700 46px "Noto Serif SC", serif';
  ctx.fillText('心理年龄测试报告', pad, y); y = headH;
  ctx.fillStyle = '#1f3a5c'; ctx.font = '700 64px "Noto Serif SC", serif';
  ctx.fillText(`${r.mentalAge}岁`, pad, y + 10);
  ctx.fillStyle = '#5b7699'; ctx.font = '500 22px "Noto Sans SC", sans-serif';
  ctx.fillText(`心理年龄 · 比实际${diffWord}`, pad, y + 86);
  ctx.fillStyle = '#8aa3c0'; ctx.textAlign = 'right'; ctx.fillText(`实际 ${actualAge} 岁`, W - pad, y + 86); ctx.textAlign = 'left';
  y += ageH;
  ctx.fillStyle = 'rgba(255,255,255,0.7)'; roundRect(ctx, pad, y, W - pad * 2, typeH - 30, 18); ctx.fill();
  ctx.fillStyle = '#1f3a5c'; ctx.font = '700 34px "Noto Serif SC", serif';
  ctx.fillText(r.tier.name, pad + 28, y + 30);
  ctx.fillStyle = '#5b7699'; ctx.font = '400 18px "Noto Sans SC", sans-serif';
  ctx.fillText('PSYCHE AGE ARCHETYPE', pad + 28, y + 76);
  y += typeH;
  paintShareRadar(ctx, W / 2, y + radarH / 2 - 20, 150, r.radar);
  y += radarH;
  ctx.fillStyle = '#1f3a5c'; ctx.font = '700 26px "Noto Serif SC", serif';
  ctx.fillText('八维成熟度', pad, y); y += 44;
  r.radar.forEach(d => {
    ctx.fillStyle = '#1f3a5c'; ctx.font = '500 20px "Noto Sans SC", sans-serif';
    ctx.fillText(d.label, pad, y + 4);
    ctx.textAlign = 'right'; ctx.fillText(`${d.pct}%`, W - pad, y + 4); ctx.textAlign = 'left';
    ctx.fillStyle = '#e2eefb'; roundRect(ctx, pad, y + 32, W - pad * 2, 10, 5); ctx.fill();
    ctx.fillStyle = d.color; roundRect(ctx, pad, y + 32, (W - pad * 2) * d.pct / 100, 10, 5); ctx.fill();
    ctx.fillStyle = '#FF6B9D'; ctx.fillRect(pad + (W - pad * 2) * d.avg / 100 - 1, y + 28, 2, 18);
    y += 62;
  });
  y += 8;
  ctx.fillStyle = 'rgba(255,255,255,0.75)'; roundRect(ctx, pad, y, W - pad * 2, quoteH - 40, 18); ctx.fill();
  ctx.fillStyle = '#1f3a5c'; ctx.font = '600 26px "Noto Serif SC", serif';
  let qy = wrapText(ctx, `“${r.tier.quote}”`, pad + 28, y + 28, W - pad * 2 - 56, 38);
  ctx.fillStyle = '#5b7699'; ctx.font = '400 19px "Noto Sans SC", sans-serif';
  qy = wrapText(ctx, r.tier.comment, pad + 28, qy + 10, W - pad * 2 - 56, 30);
  ctx.fillStyle = '#8aa3c0'; ctx.font = '500 18px "Noto Sans SC", sans-serif';
  ctx.fillText(`—— ${r.tier.role} · ${r.tier.name}`, pad + 28, qy + 8);
  y += quoteH;
  ctx.fillStyle = '#1f3a5c'; ctx.font = '700 26px "Noto Serif SC", serif';
  ctx.fillText('特别视角', pad, y); y += 44;
  r.special.forEach(s => {
    ctx.fillStyle = '#5b7699'; ctx.font = '500 20px "Noto Sans SC", sans-serif';
    ctx.fillText(s.label, pad, y + 2);
    ctx.fillStyle = '#1d8fc4'; ctx.font = '600 20px "Noto Sans SC", sans-serif';
    ctx.textAlign = 'right'; ctx.fillText(`${s.concl} ${s.pct}%`, W - pad, y + 2); ctx.textAlign = 'left';
    y += 44;
  });
  y += 6;
  ctx.fillStyle = '#8aa3c0'; ctx.font = '400 18px "Noto Sans SC", sans-serif';
  ctx.fillText('测一测你的灵魂几岁了 → self-explore.github.io/mental-age', pad, y + 10);
  showShareModal(cv.toDataURL('image/png'));
}
function showShareModal(url) {
  currentShareUrl = url;
  let m = document.getElementById('share-modal');
  if (!m) {
    m = document.createElement('div'); m.id = 'share-modal'; m.className = 'share-modal';
    m.innerHTML = '<div class="sm-inner"><img id="sm-img" alt="结果长图"><div class="sm-btns"><button class="fbtn" id="sm-down">下载图片</button><button class="fbtn ghost" onclick="closeShareModal()">关闭</button></div><p class="sm-tip">移动端可长按图片保存到相册</p></div>';
    document.body.appendChild(m);
    document.getElementById('sm-down').onclick = () => {
      const a = document.createElement('a');
      a.href = currentShareUrl; a.download = '心理年龄测试报告.png'; a.click();
    };
  }
  document.getElementById('sm-img').src = currentShareUrl;
  m.classList.add('show');
}
function closeShareModal() { const m = document.getElementById('share-modal'); if (m) m.classList.remove('show'); }

function restart() { show('cover-page'); }
function shareResult() {
  const txt = '我刚测了心理年龄测试，来看看你的灵魂几岁了？';
  if (navigator.share) navigator.share({ title: '心理年龄测试', text: txt, url: location.href }).catch(() => {});
  else { alert('链接已复制，去分享给朋友吧！\n' + location.href); }
}

// ==================== 启动 ====================
initBirthday();
