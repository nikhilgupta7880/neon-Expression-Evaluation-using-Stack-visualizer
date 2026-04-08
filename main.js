const AudioContext = window.AudioContext || window.webkitAudioContext;
let audioCtx;

function playTone(freq, type, duration, vol=0.1) {
  if (!audioCtx) audioCtx = new AudioContext();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
  gain.gain.setValueAtTime(vol, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
  osc.connect(gain); gain.connect(audioCtx.destination);
  osc.start(); osc.stop(audioCtx.currentTime + duration);
}
function sfxPush() { playTone(600, 'sine', 0.15, 0.6); }
function sfxPop() { playTone(400, 'triangle', 0.15, 0.6); }
function sfxError() { playTone(150, 'sawtooth', 0.5, 0.8); }
function sfxSuccess() { playTone(400, 'sine', 0.25, 0.7); setTimeout(() => playTone(600, 'sine', 0.4, 0.9), 100); }

const botJokes = {
  pushNum: {
    meme: ["Seedha line cross kar ke queue me ghus gaya! 🏃", "Number detected! Bhej diya.", "Operands are VIPs bhai!"],
    explain: ["Operands are immediately pushed to the output queue."],
    exam: ["Push operand to output."]
  },
  pushOpStack: {
    meme: ["Oye! Operator aa gaya… ab precedence dikhega 😏", "Push kar diya… smooth operator 💪"],
    explain: ["Operator pushed to the stack. Precedence is maintained."],
    exam: ["Push operator to stack."]
  },
  popHigher: {
    meme: ["Wait! Stack ka top zyada heavy hai, ise pheko bahar! 🛑", "Pop ho gaya! Stack bhi emotional ho gaya 😭"],
    explain: ["Higher precedence operator popped to output."],
    exam: ["Pop higher precedence operator."]
  },
  matchedParen: {
    meme: ["Brackets matched! Scope clear kar diya 🥜", "Dono brackets mil gaye!"],
    explain: ["Right parenthesis found. Popping stack until matching left parenthesis."],
    exam: ["Pop until matching '('."]
  },
  done: {
    meme: ["Result aa gaya bhai… treat kab dega? 🍕", "Algorithm complete! 🔥"],
    explain: ["Algorithm complete. Evaluation is successful."],
    exam: ["Complete."]
  },
  error: {
    meme: ["Bhai yeh expression illegal hai 😂", "Stack said NO! Syntax check kar lo 💀"],
    explain: ["Expression syntax error detected."],
    exam: ["Syntax Error."]
  }
};

let tokens = [], allSteps = [], stepIdx = 0, autoTimer = null;
const prec = { '+': 1, '-': 1, '*': 2, '/': 2, '^': 3 };
const assoc = { '+': 'L', '-': 'L', '*': 'L', '/': 'L', '^': 'R' };
const isOp = t => '+-*/^'.includes(t);
const isAlnum = t => /^[A-Za-z0-9.]+$/.test(t);

function tokenize(expr) {
  const tks = []; let i = 0; const s = expr.replace(/\s+/g, '');
  while(i < s.length) {
    if(/[A-Za-z0-9.]/.test(s[i])) {
      let n = ''; while(i < s.length && /[A-Za-z0-9.]/.test(s[i])) n += s[i++];
      tks.push(n);
    } else tks.push(s[i++]);
  }
  return tks;
}

function generateSteps(tks, mode = 'postfix') {
  const steps = []; const opStack = []; const output = [];
  const snap = (idx, action, ped, bot, p, h) => {
    steps.push({ tokenIdx: idx, opStack: [...opStack], postfix: [...output], action, pedagogy: ped, botEvent: bot, phase: 1, operandStack: null, pfHighlight: h });
  };

  let workingTks = [...tks];
  if (mode === 'prefix') {
    workingTks = workingTks.reverse().map(t => t==='('?')':(t===')'?'(':t));
  }

  snap(-1, `Start ${mode}`, `Init conversion.`, 'pushNum', 1, -1);

  for (let i = 0; i < workingTks.length; i++) {
    const t = workingTks[i];
    if (isAlnum(t)) { output.push(t); snap(i, `To Output: ${t}`, `${t} goes to output.`, 'pushNum', 1, -1); }
    else if (t === '(') { opStack.push(t); snap(i, `Push (`, `Start scope.`, 'pushOpStack', 1, -1); }
    else if (t === ')') {
      while(opStack.length && opStack[opStack.length-1] !== '(') { output.push(opStack.pop()); snap(i, `Pop to output`, '', '', 1, -1); }
      if (opStack.length) opStack.pop();
    } else if (isOp(t)) {
      while(opStack.length && opStack[opStack.length-1] !== '(' && ((assoc[t]==='L'&&prec[opStack[opStack.length-1]]>=prec[t])||(assoc[t]==='R'&&prec[opStack[opStack.length-1]]>prec[t]))) {
        output.push(opStack.pop()); snap(i, `Pop Prec: ${opStack[opStack.length-1]}`, `Precedence check.`, 'popHigher', 1, -1);
      }
      opStack.push(t); snap(i, `Push ${t}`, `Op pushed.`, 'pushOpStack', 1, -1);
    }
  }
  while(opStack.length) { output.push(opStack.pop()); snap(workingTks.length, `Final Drain`, `Empty stack.`, '', 1, -1); }
  
  let finalOutput = [...output];
  if (mode === 'prefix') finalOutput = finalOutput.reverse();

  snap(workingTks.length, 'Phase 1 Complete', `${mode.toUpperCase()}: ${finalOutput.join(' ')}`, 'done', 1, -1);

  // EVALUATION PHASE
  const valStack = [];
  const evalSteps = (hl, act, ped, vs) => steps.push({ tokenIdx: workingTks.length, opStack: [], postfix: [...finalOutput], action: act, pedagogy: ped, botEvent: '', phase: 2, operandStack: [...vs], pfHighlight: hl });
  
  evalSteps(-1, "Start Eval", "Calculating result...", valStack);
  for (let i = 0; i < finalOutput.length; i++) {
    const t = finalOutput[i];
    if (isAlnum(t)) { valStack.push(isNaN(t)?t:parseFloat(t)); evalSteps(i, `Push ${t}`, `Operand ready.`, valStack); }
    else if (isOp(t)) {
      if (valStack.length < 2) break;
      const b=valStack.pop(), a=valStack.pop();
      let r = (t==='+'?a+b : t==='-'?a-b : t==='*'?a*b : t==='/'?a/b : Math.pow(a,b));
      valStack.push(r); evalSteps(i, `Eval ${t}`, `${a}${t}${b} = ${r}`, valStack);
    }
  }
  evalSteps(finalOutput.length, "Result Done", `Final: ${valStack[0]}`, valStack);
  return { steps, result: valStack[0], postfix: finalOutput };
}

function renderStep(idx) {
  if(!allSteps.length) return;
  const s = allSteps[Math.max(0, Math.min(idx, allSteps.length - 1))];
  stepIdx = Math.max(0, Math.min(idx, allSteps.length - 1));

  document.querySelectorAll('.tl-pip').forEach((p, i) => i === stepIdx ? p.classList.add('active') : p.classList.remove('active'));

  const strip = document.getElementById('token-strip'); strip.innerHTML = '';
  tokens.forEach((t, i) => {
    const d = document.createElement('div'); d.className = 'token'; d.textContent = t;
    if(s.phase===1 && i === s.tokenIdx) { d.classList.add('current', 'neon-current'); gsap.from(d, {y:-20, opacity:0, duration:0.3}); }
    else if(s.phase===1 && i < s.tokenIdx) d.classList.add('ghost');
    strip.appendChild(d);
  });

  const pfStrip = document.getElementById('postfix-strip'); pfStrip.innerHTML = '';
  s.postfix.forEach((t, i) => {
    const d = document.createElement('div'); d.className = 'token pf-token'; d.textContent = t;
    d.classList.add(isOp(t)?'neon-operator':'neon-operand');
    if(s.phase===2 && s.pfHighlight===i) d.classList.add('current', 'neon-current');
    pfStrip.appendChild(d);
  });

  const oarea = document.getElementById('op-stack-area'); oarea.innerHTML = '';
  s.opStack.forEach((t, i) => {
    const d = document.createElement('div'); d.className = 'stack-item neon-operator'; d.textContent = t;
    if(i===s.opStack.length-1) d.classList.add('top');
    oarea.appendChild(d);
  });

  const varea = document.getElementById('operand-stack-area'); varea.innerHTML = '';
  if(s.operandStack) s.operandStack.forEach((t, i) => {
    const d = document.createElement('div'); d.className = 'stack-item neon-result'; d.textContent = t;
    if(i===s.operandStack.length-1) d.classList.add('top');
    varea.appendChild(d);
  });

  // Hollywood animations
  if (s.action.includes('Push') || s.action.includes('Stack')) {
    const target = s.phase===2 ? varea.lastChild : oarea.lastChild;
    if (target) gsap.from(target, {y: -60, scale: 0.5, opacity:0, duration: 0.5, ease: "bounce.out"});
    sfxPush();
  } else if (s.action.includes('Pop')) {
    sfxPop();
  }

  document.getElementById('m-steps').textContent = stepIdx;
  document.getElementById('m-opstack').textContent = Math.max(parseInt(document.getElementById('m-opstack').textContent || "0"), s.opStack.length);
  stackySay(s.botEvent);

  const status = document.getElementById('status-badge');
  if (stepIdx === allSteps.length-1) {
    status.textContent = "SUCCESS"; status.style.borderColor = "var(--neon-operand)";
    fireConfetti(); sfxSuccess();
    showResult(s.pedagogy);
  } else {
    status.textContent = "PROCESSING"; status.style.borderColor = "var(--neon-current)";
  }
}

function fireConfetti() {
  const count = 200, defaults = { origin: { y: 0.7 } };
  function fire(particleRatio, opts) { confetti(Object.assign({}, defaults, opts, { particleCount: Math.floor(count * particleRatio) })); }
  fire(0.25, { spread: 26, startVelocity: 55 });
  fire(0.2, { spread: 60 });
  fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
  fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
  fire(0.1, { spread: 120, startVelocity: 45 });
}

function showResult(msg) {
    const modal = document.getElementById('result-modal');
    document.getElementById('result-summary').textContent = msg;
    modal.classList.add('show');
}

function stackySay(type) {
  if(!type || type==='') return;
  const mode = document.querySelector('input[name="bmode"]:checked').value;
  const arr = botJokes[type][mode];
  if(!arr) return;
  document.getElementById('bot-text').textContent = arr[Math.floor(Math.random()*arr.length)];
  const b = document.getElementById('bot-bubble');
  b.classList.add('show');
  const avatar = document.getElementById('bot-avatar');
  avatar.textContent = type === 'done' ? '😎' : (type === 'error' ? '😵' : (type === 'pushOpStack' ? '🤔' : '🤖'));
  gsap.fromTo(b, {y: 20, opacity:0}, {y:0, opacity:1, duration:0.3});
  setTimeout(()=> b.classList.remove('show'), 3000);
}

function loadExpression(expr) {
  stopAuto();
  const inp = document.getElementById('expr-input');
  inp.classList.remove('shake-err');
  const tks = tokenize(expr);
  const mode = document.getElementById('algo-mode').value;
  const res = generateSteps(tks, mode);
  if(!res.steps.length) { sfxError(); inp.classList.add('shake-err'); return; }
  tokens = tks; allSteps = res.steps;
  const tl = document.getElementById('timeline'); tl.innerHTML = '';
  allSteps.forEach((_, i) => { const p = document.createElement('div'); p.className = 'tl-pip'; p.onclick = () => renderStep(i); tl.appendChild(p); });
  renderStep(0);
}

function getDelay() { return [1500, 1000, 600, 300, 100][parseInt(document.getElementById('speed-slider').value) - 1]; }
function startAuto() {
  if (stepIdx >= allSteps.length - 1) renderStep(0);
  document.getElementById('btn-auto').innerHTML = '⏸ PAUSE';
  autoTimer = setInterval(() => { if (stepIdx >= allSteps.length - 1) { stopAuto(); return; } renderStep(stepIdx + 1); }, getDelay());
}
function stopAuto() { clearInterval(autoTimer); autoTimer=null; document.getElementById('btn-auto').innerHTML = '► AUTO'; }

function setExpr(e) { document.getElementById('expr-input').value = e; loadExpression(e); }

// ── DRAG & DROP INIT ──
function initDrags() {
    new Sortable(document.getElementById('tool-box'), { group: { name: 'shared', pull: 'clone', put: false }, sort: false, animation: 150 });
    new Sortable(document.getElementById('drag-pad'), { group: 'shared', animation: 150, onAdd: (evt) => evt.item.classList.remove('dragger') });
}

document.getElementById('toggle-drag').onclick = () => {
    const pad = document.getElementById('drag-pad-container');
    pad.style.display = pad.style.display === 'none' ? 'block' : 'none';
    if(pad.style.display==='block') initDrags();
};

document.getElementById('btn-use-drag').onclick = () => {
    const items = [...document.getElementById('drag-pad').children].map(c => c.textContent).join('');
    setExpr(items);
};

document.getElementById('btn-next').onclick = () => { stopAuto(); renderStep(stepIdx+1); };
document.getElementById('btn-prev').onclick = () => { stopAuto(); renderStep(stepIdx-1); };
document.getElementById('btn-auto').onclick = () => { if(autoTimer) stopAuto(); else startAuto(); };
document.getElementById('load-btn').onclick = () => loadExpression(document.getElementById('expr-input').value);
document.getElementById('expr-input').onkeydown = e => { if(e.key==='Enter') loadExpression(e.target.value); };
document.getElementById('theme-toggle').onclick = () => {
    const b = document.body; b.setAttribute('data-theme', b.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
    document.getElementById('theme-toggle').textContent = b.getAttribute('data-theme').toUpperCase();
};

// ── PARTICLES ──
function initParticles() {
  const canvas = document.getElementById("particles-bg"); if (!canvas) return;
  const ctx = canvas.getContext("2d"); let p = [];
  function res() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
  window.addEventListener('resize', res); res();
  for (let i = 0; i < 60; i++) p.push({ x: Math.random()*canvas.width, y: Math.random()*canvas.height, r: Math.random()*2, dx: (Math.random()-0.5)*1.2, dy: (Math.random()-0.5)*1.2 });
  (function anim() {
    ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.fillStyle = "#00f5ff";
    p.forEach(pt => { ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.r, 0, Math.PI*2); ctx.fill(); pt.x+=pt.dx; pt.y+=pt.dy; if(pt.x<0||pt.x>canvas.width) pt.dx*=-1; if(pt.y<0||pt.y>canvas.height) pt.dy*=-1; });
    requestAnimationFrame(anim);
  })();
}

initParticles(); loadExpression('5 + ( 2 * 3 )');
