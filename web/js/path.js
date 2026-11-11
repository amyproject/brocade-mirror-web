/* 学习路径 · Personalized learning path (Brocade Mirror), shown in "My progress".
   Three stages (Foundations → Flow → Refine). The start comes from the onboarding level and moves up
   as moves are marked mastered; goals pick the moves to emphasise; "adapt for" chips show the
   pre-written easier variations (问一问 answers) with reputable sources. Sources were found with Exa
   (tools/exa_content.py → data-refs.js) among NIH/PubMed, clinics, the NHS, ACOG, CDC and open-access
   journals, and reviewed. "Find more research" asks Exa live through the local helper (/api/refs). */
(function () {
  'use strict';
  var A = window.BDJApp, REFS = window.BDJ_REFS, LIB = window.BDJ_ASK;
  if (!A || !REFS) return;
  var h = A.h, icon = A.icon, t = A.t, S = A.S, D = A.D;
  var track = function (e, p) { if (window.BDJTrack) window.BDJTrack(e, p); };
  function zh() { return S.lang === 'zh'; }
  var KEY = 'bdj.path.v1';
  var st = (function () { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } })();
  st.adapt = st.adapt || [];
  function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { } }
  var ENTRY = {}; (LIB ? LIB.entries : []).forEach(function (e) { ENTRY[e.id] = e; });

  var STAGES = [
    { id: 'beginner', zh: '入门 · 打基础', en: 'Foundations', wk: { zh: '第 1–2 周', en: 'Weeks 1–2' },
      steps: [
        { zh: '先学第一至四式，再学五至八式，每次只学一式；速度 0.5–0.75×，打开“镜像”和“解说”。', en: 'Learn moves 1–4, then 5–8, one move per session at 0.5–0.75×, with Mirror and Voiceover on.' },
        { zh: '自然呼吸，马步站高，膝盖对脚尖；动作做到舒适为止。', en: 'Breathe naturally, keep the horse stance high with knees over toes, and stay within comfort.' },
        { zh: '能不暂停地跟下来，就把这一式标为“初学”。', en: 'When you can follow a move without pausing, mark it “Learning”.' }],
      daily: { zh: '每天约 10 分钟：新动作慢练 3 遍 + 0.75× 全套 1 遍。', en: 'About 10 min a day: 3 slow reps of a new move + one round of the full routine at 0.75×.' } },
    { id: 'intermediate', zh: '进阶 · 连贯', en: 'Flow', wk: { zh: '第 3–6 周', en: 'Weeks 3–6' },
      steps: [
        { zh: '每天 1× 速度跟练全套 3 遍，让呼吸跟上动作（看呼吸环的 吸 / 呼 / 停）。', en: 'Follow the full routine 3 times a day at 1×, matching breath to movement (watch the 吸 / 呼 / 停 ring).' },
        { zh: '马步逐渐降低；用侧面、背面视角和“易错”对照自己。', en: 'Lower the stance gradually; check yourself against the side and back views and the Mistakes tab.' },
        { zh: '最不熟的一式用“单步循环”反复练。', en: 'Drill your weakest move with the step loop.' }],
      daily: { zh: '每天 10–15 分钟：全套 3 遍 + 一式重点练。', en: '10–15 min a day: 3 full rounds + one focus move.' } },
    { id: 'advanced', zh: '精修 · 细节', en: 'Refine', wk: { zh: '第 7 周起', en: 'Week 7 on' },
      steps: [
        { zh: '按标准遍数练完整套路（约 12 分钟），定势处停 1–2 秒。', en: 'Do the standard set with traditional reps (about 12 min), holding each end position 1–2 s.' },
        { zh: '抠细节：力达掌根、眼随手走、颠足七次；保持“松静自然”。', en: 'Refine the details: drive through the palm heels, eyes follow the hands, seven heel drops; stay relaxed and calm.' },
        { zh: '不看视频独立完成；需要时请 AI 老师帮你检查要领。', en: 'Practise without the video; ask the AI instructor to check your cues.' }],
      daily: { zh: '每天 15–20 分钟：标准全套 + 静站收势。', en: '15–20 min a day: the standard set + a quiet standing close.' } }
  ];
  var GOAL_FOCUS = {  // goal → moves to emphasise + a tip
    stress: { moves: [1, 5], zh: '呼气放长，傍晚 0.75× 慢练一遍。', en: 'Lengthen the exhale; one slow round at 0.75× in the evening.' },
    sleep: { moves: [1, 5], zh: '睡前一小时练一遍，打开解说、放慢速度。', en: 'One gentle round an hour before bed, slowed down with Voiceover on.' },
    flex: { moves: [1, 3, 6], zh: '伸展到七分，每周增加一点幅度。', en: 'Stretch to about 70%, adding a little range each week.' },
    balance: { moves: [2, 5, 8], zh: '扶椅背练马步和颠足，熟练后再松手。', en: 'Practise the stance and heel raises holding a chair back, letting go once steady.' },
    back: { moves: [3, 4, 6], zh: '前屈只到舒适处，用髋部折叠。', en: 'Fold only as far as comfortable, hinging at the hips.' },
    energy: { moves: [2, 7], zh: '早晨练一遍，出拳有力但不憋气。', en: 'A morning round; punch with intent but never hold your breath.' },
    culture: { moves: [1, 4], zh: '看看每式名字的含义（问一问：“理三焦”是什么意思）。', en: 'Read what each move’s name means (Ask: what does “Triple Burner” mean?).' }
  };
  var ADAPT = [
    ['mod-knees', '膝盖', 'Knees'], ['mod-back', '腰背', 'Lower back'], ['mod-neck', '颈椎', 'Neck'], ['mod-shoulder', '肩膀', 'Shoulders'],
    ['mod-balance', '平衡 / 年长', 'Balance / older'], ['mod-seated', '坐姿', 'Seated'], ['mod-bp-heart', '血压 / 心脏', 'Blood pressure / heart'],
    ['mod-pregnancy', '孕期', 'Pregnancy'], ['mod-osteoporosis', '骨质疏松', 'Osteoporosis']
  ];
  var LEVEL_START = { 'new': 0, some: 0, regular: 1, refine: 2 };

  function L(o) { return o ? (zh() ? o.zh : o.en) : ''; }
  function mastered() { var n = 0; for (var k = 1; k <= 8; k++) if ((A.P.level[k] || 0) >= 3) n++; return n; }
  function stageNow(plan) {
    var base = LEVEL_START[plan.level] != null ? LEVEL_START[plan.level] : 0, m = mastered();
    return Math.max(base, m >= 8 ? 2 : m >= 4 ? 1 : 0);
  }
  function srcList(list, max) {
    if (!list || !list.length) return null;
    return h('ul', { class: 'pth-src' }, list.slice(0, max || 3).map(function (r) {
      return h('li', {}, [h('a', { href: r.url, target: '_blank', rel: 'noopener noreferrer', text: r.title, onclick: function () { track('reference_opened', { site: r.site }); } }),
        h('span', { text: r.site + (r.year ? ' · ' + r.year : '') })]);
    }));
  }

  // live search through the local helper (only when the page is served by it)
  function findMore(plan, box, btn) {
    if (!/^https?:$/.test(location.protocol)) { box.textContent = t('需要用 sh web/serve.sh 打开（localhost）才能在线检索。', 'Open the page via sh web/serve.sh (localhost) to search live.'); return; }
    var goals = (plan.goals || []).join(' '), adapt = st.adapt.map(function (id) { return (ADAPT.filter(function (a) { return a[0] === id; })[0] || [])[2] || ''; }).join(' ');
    var level = STAGES[stageNow(plan)].id;
    btn.disabled = true; box.textContent = t('正在检索可信来源…', 'Searching reputable sources…');
    fetch('/api/refs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ level: level, goals: goals, adapt: adapt }) })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (j) {
        btn.disabled = false; box.innerHTML = '';
        if (!j.results || !j.results.length) { box.textContent = t('没有找到新的来源。', 'No new sources found.'); return; }
        box.appendChild(srcList(j.results, 5));
        track('references_searched', { level: level, n: j.results.length });
      })
      .catch(function () { btn.disabled = false; box.textContent = t('检索失败，请稍后再试。', 'Search failed, please try again later.'); });
  }

  function render(plan, rerender) {
    var cur = stageNow(plan);
    var wrap = h('div', { class: 'pth' });
    // stages
    var stages = h('ol', { class: 'pth-stages' }, STAGES.map(function (s, i) {
      var open = i === cur;
      return h('li', { class: 'pth-stage' + (i < cur ? ' done' : '') + (open ? ' now' : '') }, [
        h('div', { class: 'pth-head' }, [h('span', { class: 'pth-n', text: String(i + 1) }), h('b', { text: L(s) }), h('span', { class: 'pth-wk', text: L(s.wk) }),
          open ? h('span', { class: 'pth-now', text: t('当前', 'You are here') }) : null]),
        open ? h('ul', { class: 'pth-steps' }, s.steps.map(function (x) { return h('li', { text: L(x) }); })) : null,
        open ? h('p', { class: 'pth-daily', text: L(s.daily) }) : null,
        open ? h('details', { class: 'pth-more' }, [h('summary', { text: t('参考资料', 'Reference material') }), srcList(REFS.levels[s.id])]) : null
      ]);
    }));
    wrap.appendChild(stages);
    // goals → focus moves
    var foci = (plan.goals || []).map(function (g) { return GOAL_FOCUS[g] && { g: g, f: GOAL_FOCUS[g] }; }).filter(Boolean);
    if (foci.length) {
      wrap.appendChild(h('div', { class: 'pth-focus' }, foci.slice(0, 3).map(function (x) {
        return h('div', { class: 'pth-fc' }, [
          h('div', { class: 'pth-fm' }, x.f.moves.map(function (n) {
            var m = D.moves[n - 1];
            return h('button', { class: 'seal sm', title: zh() ? m.nameZh : m.nameEn, text: m.seal, onclick: function () { if (A.isFull()) A.selectMode('move'); A.selectMove(n); if (window.BDJJourney) { var mm = document.querySelector('.me-card .modal-x'); if (mm) mm.click(); } } });
          })),
          h('p', { text: L(x.f) })
        ]);
      })));
    }
    // adapt for
    var chips = h('div', { class: 'pth-chips' }, ADAPT.map(function (a) {
      var on = st.adapt.indexOf(a[0]) >= 0;
      return h('button', { class: 'chip' + (on ? ' on' : ''), 'aria-pressed': on, text: zh() ? a[1] : a[2], onclick: function () {
        var i = st.adapt.indexOf(a[0]); if (i >= 0) st.adapt.splice(i, 1); else st.adapt.push(a[0]); save();
        track('path_adapt', { topic: a[0], on: i < 0 }); rerender();
      } });
    }));
    wrap.appendChild(h('div', { class: 'pth-k', text: t('需要调整的地方（可多选）', 'Adapt for (choose any)') }));
    wrap.appendChild(chips);
    st.adapt.forEach(function (id) {
      var e = ENTRY[id]; if (!e) return;
      wrap.appendChild(h('div', { class: 'pth-adapt' }, [h('b', { text: L(e.q) }), h('p', { text: L(e.a) }), srcList(REFS.byEntry[id], 3)]));
    });
    // live
    var box = h('div', { class: 'pth-live' });
    var btn = h('button', { class: 'onb-btn ghost', text: t('为我的计划检索更多研究', 'Find more research for my plan'), onclick: function () { findMore(plan, box, btn); } });
    wrap.appendChild(h('div', { class: 'pth-actions' }, [btn]));
    wrap.appendChild(box);
    wrap.appendChild(h('p', { class: 'onb-fine', text: t('来源由 Exa 在 NIH/PubMed、医院、NHS、ACOG 等可信网站中检索，并经人工筛选；不是医疗建议。', 'Sources found with Exa among reputable sites (NIH/PubMed, clinics, the NHS, ACOG…) and screened; not medical advice.') }));
    return wrap;
  }

  window.BDJPath = { render: render, stage: stageNow, refs: REFS };
})();
