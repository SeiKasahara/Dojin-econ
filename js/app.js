

(() => {
"use strict";

/* ── Palette ────────────────────────────────────────────── */
const C = {
  blue:    "#2563eb",
  blue2:   "#93c5fd",
  blue3:   "#dbeafe",
  amber:   "#f59e0b",
  amber2:  "#fcd34d",
  green:   "#10b981",
  red:     "#ef4444",
  slate:   "#64748b",
  slate2:  "#94a3b8",
  slate3:  "#cbd5e1",
  slate4:  "#f1f5f9",
  dark:    "#1e293b",
  purple:  "#8b5cf6",
};

const PALETTE = [C.blue, C.amber, C.green, C.purple, C.red, C.slate];
const PALETTE_LIGHT = ["#dbeafe","#fef3c7","#d1fae5","#ede9fe","#fee2e2","#f1f5f9"];

/* ── Chart.js Defaults ──────────────────────────────────── */
Chart.defaults.font.family = "'Inter','Noto Sans SC',system-ui,sans-serif";
Chart.defaults.font.size = 12;
Chart.defaults.color = "#64748b";
Chart.defaults.plugins.legend.display = false;
Chart.defaults.plugins.tooltip.backgroundColor = "rgba(15,23,42,.88)";
Chart.defaults.plugins.tooltip.cornerRadius = 6;
Chart.defaults.plugins.tooltip.padding = {top:8,right:12,bottom:8,left:12};
Chart.defaults.plugins.tooltip.titleFont = {weight:"600"};
Chart.defaults.animation.duration = 700;

/* ── Helpers ────────────────────────────────────────────── */
function $(sel) { return document.querySelector(sel); }
function $$(sel) { return document.querySelectorAll(sel); }

function makeChart(id, cfg) {
  const el = document.getElementById(id);
  if (!el) return null;
  cfg.options = cfg.options || {};
  cfg.options.responsive = true;
  cfg.options.maintainAspectRatio = false;
  return new Chart(el, cfg);
}

function pctLabel(ctx) {
  return ctx.parsed.y != null ? ctx.parsed.y + "%" : ctx.parsed.x + "%";
}

function hBar(id, labels, values, color, opts) {
  return makeChart(id, {
    type: "bar",
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: color || C.blue,
        borderRadius: 4,
        maxBarThickness: 28,
      }],
    },
    options: {
      indexAxis: "y",
      scales: {
        x: { grid:{display:false}, ticks:{callback:v=>Math.round(v)+"%"}, max: Math.ceil(Math.max(...values)*1.15) },
        y: { grid:{display:false} },
      },
      plugins: { tooltip:{callbacks:{label:pctLabel}} },
      ...opts,
    },
  });
}

/* ── Hero Stats ─────────────────────────────────────────── */
function fillHero() {
  const s = DATA.sample;
  const heroN = document.getElementById("heroN");
  const heroSample = document.getElementById("heroSample");
  const heroCreators = document.getElementById("heroCreators");
  const heroSellers = document.getElementById("heroSellers");
  if (heroN) heroN.textContent = s.n;
  if (heroSample) heroSample.textContent = s.n;
  if (heroCreators) heroCreators.textContent = s.nCreators;
  if (heroSellers) heroSellers.textContent = s.nSellers;
}

/* ── Sample Charts ──────────────────────────────────────── */
function initSample() {
  const s = DATA.sample;

  // Age
  hBar("chartAge", s.age.labels, s.age.values, C.blue);

  // Gender — donut
  makeChart("chartGender", {
    type: "doughnut",
    data: {
      labels: s.gender.labels,
      datasets: [{
        data: s.gender.values,
        backgroundColor: [C.blue, C.amber, C.slate2],
        borderWidth: 0,
      }],
    },
    options: {
      cutout: "62%",
      plugins: {
        legend: { display:true, position:"bottom", labels:{boxWidth:12, padding:12} },
        tooltip: { callbacks:{label:ctx=>ctx.label+": "+ctx.parsed+"%"} },
      },
    },
  });

  // Income
  hBar("chartIncome", s.income.labels, s.income.values, C.blue);
}

/* ── Finding 1 ──────────────────────────────────────────── */
function initF1() {
  if (!DATA.f1) return;
  const f = DATA.f1;

  // Predicted probabilities
  makeChart("chartF1Pred", {
    type: "bar",
    data: {
      labels: f.pred.labels,
      datasets: [
        { label:"男性", data:f.pred.male, backgroundColor:C.blue, borderRadius:4, maxBarThickness:36 },
        { label:"女性", data:f.pred.female, backgroundColor:C.amber, borderRadius:4, maxBarThickness:36 },
      ],
    },
    options: {
      scales: {
        x: { grid:{display:false} },
        y: { grid:{color:"#f1f5f9"}, ticks:{callback:v=>Math.round(v)+"%"} },
      },
      plugins: {
        legend: { display:true, position:"top", align:"end", labels:{boxWidth:12,padding:16} },
        tooltip: { callbacks:{label:ctx=>ctx.dataset.label+": "+ctx.parsed.y+"%"} },
      },
    },
  });

  // AME with error bars
  const ame = f.ame;
  makeChart("chartF1Ame", {
    type: "bar",
    data: {
      labels: ame.labels,
      datasets: [
        {
          label: "AME (pp)",
          data: ame.values,
          backgroundColor: ame.values.map(v => v >= 0 ? C.green : C.red),
          borderRadius: 4,
          maxBarThickness: 36,
        },
        // CI low line (invisible bar from 0 to ciLo, then ciHi - ciLo for the "range")
      ],
    },
    options: {
      scales: {
        x: { grid:{display:false} },
        y: { grid:{color:"#f1f5f9"}, ticks:{callback:v=>v+"pp"} },
      },
      plugins: {
        tooltip: {
          callbacks: {
            label: function(ctx) {
              const i = ctx.dataIndex;
              return `AME: ${ame.values[i]}pp [${ame.ciLo[i]}, ${ame.ciHi[i]}]`;
            }
          }
        },
      },
    },
    plugins: [{
      id: "errBars",
      afterDraw(chart) {
        const ctx2 = chart.ctx;
        const meta = chart.getDatasetMeta(0);
        meta.data.forEach((bar, i) => {
          const xScale = chart.scales.x;
          const yScale = chart.scales.y;
          const x = bar.x;
          const yLo = yScale.getPixelForValue(ame.ciLo[i]);
          const yHi = yScale.getPixelForValue(ame.ciHi[i]);
          ctx2.save();
          ctx2.strokeStyle = C.dark;
          ctx2.lineWidth = 1.5;
          ctx2.beginPath();
          ctx2.moveTo(x, yLo);
          ctx2.lineTo(x, yHi);
          ctx2.stroke();
          // caps
          ctx2.beginPath();
          ctx2.moveTo(x-5, yLo); ctx2.lineTo(x+5, yLo);
          ctx2.moveTo(x-5, yHi); ctx2.lineTo(x+5, yHi);
          ctx2.stroke();
          ctx2.restore();
        });
      }
    }],
  });
}

/* ── Finding 2 ──────────────────────────────────────────── */
function initF2() {
  const f = DATA.f2;

  // Elasticity labels
  const elA = document.getElementById("f2ElasA");
  const elB = document.getElementById("f2ElasB");
  if (elA) elA.textContent = f.elasticity.a_loglog;
  if (elB) elB.textContent = f.elasticity.b_loglog;

  // A-share line chart
  makeChart("chartF2Share", {
    type: "line",
    data: {
      labels: f.aShare.labels,
      datasets: [{
        label: "A 类消费份额",
        data: f.aShare.values,
        borderColor: C.blue,
        backgroundColor: C.blue3,
        fill: true,
        tension: 0.3,
        pointRadius: 5,
        pointHoverRadius: 7,
        pointBackgroundColor: C.blue,
      }],
    },
    options: {
      scales: {
        x: { grid:{display:false}, title:{display:true,text:"月可支配休闲资金",font:{size:11}} },
        y: { grid:{color:"#f1f5f9"}, ticks:{callback:v=>Math.round(v)+"%"}, min:30, max:90 },
      },
      plugins: {
        tooltip: {
          callbacks: {
            label: ctx => `A 类份额: ${ctx.parsed.y}% (n=${f.aShare.n[ctx.dataIndex]})`
          }
        },
      },
    },
  });

  // MPC stacked bar
  makeChart("chartF2Mpc", {
    type: "bar",
    data: {
      labels: f.mpc.labels,
      datasets: [
        { label:"A 类", data:f.mpc.a, backgroundColor:C.blue, borderRadius:{topLeft:4,topRight:4}, maxBarThickness:48 },
        { label:"B 类", data:f.mpc.b, backgroundColor:C.amber, borderRadius:{bottomLeft:4,bottomRight:4}, maxBarThickness:48 },
      ],
    },
    options: {
      scales: {
        x: { stacked:true, grid:{display:false} },
        y: { stacked:true, grid:{color:"#f1f5f9"}, ticks:{callback:v=>Math.round(v)+"%"}, max:100 },
      },
      plugins: {
        legend: { display:true, position:"top", align:"end", labels:{boxWidth:12,padding:16} },
        tooltip: { callbacks:{label:ctx=>ctx.dataset.label+": "+ctx.parsed.y+"%"} },
      },
    },
  });

  // Budget cut
  hBar("chartF2Budget", f.budgetCut.labels, f.budgetCut.values,
    f.budgetCut.values.map((_,i)=>i===3?C.red:C.blue));
}

/* ── Finding 3 ──────────────────────────────────────────── */
function initF3() {
  if (!DATA.f3) return;
  const f = DATA.f3;
  const colors = [C.slate2, C.amber, C.blue2, C.blue];

  // Transpose data: f.data[incomeIdx][catIdx] → datasets[catIdx].data[incomeIdx]
  const datasets = f.cats.map((cat, ci) => ({
    label: cat,
    data: f.data.map(row => row[ci]),
    backgroundColor: colors[ci],
    borderRadius: ci===f.cats.length-1 ? {topLeft:4,topRight:4} : 0,
    maxBarThickness: 48,
  }));

  makeChart("chartF3Blind", {
    type: "bar",
    data: { labels: f.labels, datasets },
    options: {
      scales: {
        x: { stacked:true, grid:{display:false}, title:{display:true,text:"月可支配休闲资金",font:{size:11}} },
        y: { stacked:true, grid:{color:"#f1f5f9"}, ticks:{callback:v=>Math.round(v)+"%"}, max:100 },
      },
      plugins: {
        legend: { display:true, position:"top", align:"end", labels:{boxWidth:12,padding:12} },
        tooltip: { callbacks:{label:ctx=>ctx.dataset.label+": "+ctx.parsed.y+"%"} },
      },
    },
  });
}

/* ── Finding 4 ──────────────────────────────────────────── */
function initF4() {
  const f = DATA.f4;
  const elInfo = document.getElementById("f4InfoPct");
  const elRep = document.getElementById("f4RepPct");
  if (elInfo) elInfo.textContent = f.main.info + "%";
  if (elRep) elRep.textContent = f.main.rep;

  makeChart("chartF4ByBlind", {
    type: "bar",
    data: {
      labels: f.byBlindBuy.labels,
      datasets: [{
        data: f.byBlindBuy.values,
        backgroundColor: C.blue,
        borderRadius: 4,
        maxBarThickness: 36,
      }],
    },
    options: {
      scales: {
        x: { grid:{display:false} },
        y: { grid:{color:"#f1f5f9"}, ticks:{callback:v=>Math.round(v)+"%"}, min:70, max:100 },
      },
      plugins: { tooltip:{callbacks:{label:ctx=>"选信息方: "+ctx.parsed.y+"%"}} },
    },
  });
}

/* ── Finding 5 ──────────────────────────────────────────── */
function initF5() {
  const f = DATA.f5;

  makeChart("chartF5Shock", {
    type: "bar",
    data: {
      labels: f.labels,
      datasets: [
        { label:"男性", data:f.male, backgroundColor:C.blue, borderRadius:4, maxBarThickness:36 },
        { label:"女性", data:f.female, backgroundColor:C.amber, borderRadius:4, maxBarThickness:36 },
      ],
    },
    options: {
      scales: {
        x: { grid:{display:false} },
        y: { grid:{color:"#f1f5f9"}, ticks:{callback:v=>Math.round(v)+"%"} },
      },
      plugins: {
        legend: { display:true, position:"top", align:"end", labels:{boxWidth:12,padding:16} },
        tooltip: { callbacks:{label:ctx=>ctx.dataset.label+": "+ctx.parsed.y+"%"} },
      },
    },
  });
}

/* ── Findings 6-8 — Gauges ──────────────────────────────── */
function initF678() {
  const sc = DATA.scales;
  const items = [
    { key:"q13", color:C.green,  direction:"positive", finding:6,
      desc:"买了本子后顺手买配套谷子的意愿" },
    { key:"q15", color:C.red,    direction:"negative", finding:7,
      desc:"如果圈内讨论度极高，即使觉得一般也会买" },
    { key:"q14", color:C.amber,  direction:"negative", finding:8,
      desc:"因为太忙，更倾向于买一眼就能满足的视觉周边" },
  ];

  const container = document.getElementById("gaugeContainer");
  if (!container) return;

  items.forEach(item => {
    const d = sc[item.key];
    const pct = (d.mean / 11) * 100;       // 0-11 scale → %
    const refPct = (5 / 11) * 100;          // neutral line

    const signLabel = d.d > 0 ? "+" : "";
    const dirClass = d.d > 0 ? "text-green" : "text-red";

    const row = document.createElement("div");
    row.className = "gauge-row";
    row.innerHTML = `
      <div class="gauge-label">
        <span style="font-size:.7rem;color:var(--c-text2)">F${item.finding} · ${d.col}</span><br>
        ${item.desc}
      </div>
      <div class="gauge-bar-wrap">
        <div class="gauge-bar" style="width:0%;background:${item.color}" data-width="${pct}%"></div>
        <div class="gauge-marker" style="left:${refPct}%" title="中性点 5"></div>
      </div>
      <div class="gauge-val">
        <span style="font-size:1.1rem;font-weight:700">${d.mean}</span>
        <span class="text-sm ${dirClass}"> d=${signLabel}${d.d}</span>
        <br><span class="text-sm text-muted">CI [${d.ciLo}, ${d.ciHi}]</span>
      </div>
    `;
    container.appendChild(row);
  });

  // Animate gauge bars after a tick
  requestAnimationFrame(() => {
    container.querySelectorAll(".gauge-bar").forEach(bar => {
      bar.style.width = bar.dataset.width;
    });
  });

  // Q14 by time chart (in expandable)
  if (sc.q14ByTime) {
    makeChart("chartQ14Time", {
      type: "bar",
      data: {
        labels: sc.q14ByTime.labels,
        datasets: [{
          data: sc.q14ByTime.values,
          backgroundColor: C.amber,
          borderRadius: 4,
          maxBarThickness: 36,
        }],
      },
      options: {
        scales: {
          x: { grid:{display:false}, title:{display:true,text:"日均闲暇时间",font:{size:11}} },
          y: { grid:{color:"#f1f5f9"}, min:2, max:6, title:{display:true,text:"Q14 均值",font:{size:11}} },
        },
        plugins: { tooltip:{callbacks:{label:ctx=>"均值: "+ctx.parsed.y}} },
      },
    });
  }
}

/* ── Finding 9 ──────────────────────────────────────────── */
function initF9() {
  const f = DATA.f9;

  const elNP = document.getElementById("f9NonProfit");
  if (elNP) elNP.textContent = f.nonProfitPct + "%";

  // Pricing donut
  makeChart("chartF9Pricing", {
    type: "doughnut",
    data: {
      labels: f.pricing.labels,
      datasets: [{
        data: f.pricing.values,
        backgroundColor: [C.blue, C.blue2, C.slate2, C.amber],
        borderWidth: 0,
      }],
    },
    options: {
      cutout: "58%",
      plugins: {
        legend: { display:true, position:"bottom", labels:{boxWidth:12,padding:10,font:{size:11}} },
        tooltip: { callbacks:{label:ctx=>ctx.label+": "+ctx.parsed+"%"} },
      },
    },
  });

  // Bottleneck
  hBar("chartF9Bottleneck", f.bottleneck.labels, f.bottleneck.values,
    f.bottleneck.values.map((_,i)=>PALETTE[i % PALETTE.length]));
}

/* ── Finding 10 ─────────────────────────────────────────── */
function initF10() {
  const f = DATA.f10;

  const elHR = document.getElementById("f10HighRes");
  if (elHR) elHR.textContent = f.highResPct + "%";

  // Resilience donut
  makeChart("chartF10Resil", {
    type: "doughnut",
    data: {
      labels: f.resilience.labels,
      datasets: [{
        data: f.resilience.values,
        backgroundColor: [C.green, C.amber, C.red],
        borderWidth: 0,
      }],
    },
    options: {
      cutout: "58%",
      plugins: {
        legend: { display:true, position:"bottom", labels:{boxWidth:12,padding:10,font:{size:11}} },
        tooltip: { callbacks:{label:ctx=>ctx.label+": "+ctx.parsed+"%"} },
      },
    },
  });

  // Exit reasons
  hBar("chartF10Exit", f.exitReasons.labels, f.exitReasons.values,
    [C.slate, C.red, C.amber, C.blue2]);
}

/* ── Navigation ─────────────────────────────────────────── */
function setupNav() {
  const nav = document.getElementById("topnav");
  const links = nav ? nav.querySelectorAll("a[href^='#']") : [];
  const sections = [];

  links.forEach(a => {
    const id = a.getAttribute("href").slice(1);
    const sec = document.getElementById(id);
    if (sec) sections.push({el:sec, link:a});
  });

  // Scroll shadow
  let ticking = false;
  window.addEventListener("scroll", () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      if (nav) nav.classList.toggle("scrolled", window.scrollY > 80);

      // Active link
      const scrollY = window.scrollY + 120;
      let current = sections[0];
      for (const s of sections) {
        if (s.el.offsetTop <= scrollY) current = s;
      }
      links.forEach(a => a.classList.remove("active"));
      if (current) current.link.classList.add("active");

      ticking = false;
    });
  });

  // Smooth scroll
  links.forEach(a => {
    a.addEventListener("click", e => {
      e.preventDefault();
      const id = a.getAttribute("href").slice(1);
      const target = document.getElementById(id);
      if (target) {
        const top = target.offsetTop - (nav ? nav.offsetHeight : 0) - 8;
        window.scrollTo({top, behavior:"smooth"});
      }
    });
  });
}

/* ── Expandable Panels ──────────────────────────────────── */
function setupExpand() {
  $$(".expand-toggle").forEach(btn => {
    btn.addEventListener("click", () => {
      const targetId = btn.dataset.target;
      const body = document.getElementById(targetId);
      if (!body) return;

      const isOpen = body.classList.contains("open");
      if (isOpen) {
        body.style.maxHeight = "0";
        body.classList.remove("open");
        btn.classList.remove("open");
      } else {
        body.style.maxHeight = body.scrollHeight + 200 + "px";
        body.classList.add("open");
        btn.classList.add("open");
        // Re-render any charts inside (they might need resize)
        setTimeout(() => {
          body.querySelectorAll("canvas").forEach(c => {
            const chart = Chart.getChart(c);
            if (chart) chart.resize();
          });
        }, 350);
      }
    });
  });
}

/* ── Scroll Reveal ──────────────────────────────────────── */
function setupReveal() {
  const els = $$(".reveal");
  if (!els.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08, rootMargin: "0px 0px -40px 0px" });

  els.forEach(el => observer.observe(el));
}

/* ── Init ───────────────────────────────────────────────── */
document.addEventListener("DOMContentLoaded", () => {
  fillHero();
  initSample();
  initF1();
  initF2();
  initF3();
  initF4();
  initF5();
  initF678();
  initF9();
  initF10();
  setupNav();
  setupExpand();
  setupReveal();
});

})();
