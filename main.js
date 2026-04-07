const AudioContext = window.AudioContext || window.webkitAudioContext;
let audioCtx;

// Play synths
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
function sfxPush() { playTone(600, 'sine', 0.1, 0.1); }
function sfxPop() { playTone(400, 'triangle', 0.1, 0.1); }
function sfxError() { playTone(150, 'sawtooth', 0.3, 0.2); }
function sfxSuccess() { playTone(400, 'sine', 0.1, 0.1); setTimeout(() => playTone(600, 'sine', 0.2, 0.15), 100); }

// ── HINGLISH DICTIONARY ──
const botJokes = {
  pushNum: {
    meme: ["Seedha line cross kar ke queue me ghus gaya! 🏃", "Number detected! Postfix me bhej diya.", "Operands are VIPs bhai!"],
    explain: ["Operands are immediately pushed to the postfix output queue."],
    exam: ["Push operand to output."]
  },
  pushOpStack: {
    meme: ["Oye! Operator aa gaya… ab precedence dikhega 😏", "Push kar diya… smooth operator 💪", "Stacking it up! 🏗️"],
    explain: ["Operator pushed to the stack. Precedence is maintained."],
    exam: ["Push operator to stack."]
  },
  popHigher: {
    meme: ["Wait! Stack ka top zyada heavy hai, ise pheko bahar! 🛑", "Pop ho gaya! Stack bhi emotional हो gaya 😭"],
    explain: ["Top of stack has matched or higher precedence. Popping it to output."],
    exam: ["Pop higher/equal precedence operator."]
  },
  matchedParen: {
    meme: ["Brackets matched! Scope clear kar diya 🥜", "Dono brackets mil gaye, stack clear karo."],
    explain: ["Right parenthesis found. Popping stack until matching left parenthesis."],
    exam: ["Pop until matching '('."]
  },
  parenReject: {
    meme: ["Bhai yeh kaisa bracket hai? Koi sathi nahi iska 😭", "Ye parenthesis single kyu hai bhai?"],
    explain: ["Parenthesis mismatch detected."],
    exam: ["Syntax Error: Mismatched Parens."]
  },
  done: {
    meme: ["Result aa gaya bhai… treat kab dega? 🍕", "Algorithm complete! 🔥", "Ek number bhai, run ho gaya result!"],
    explain: ["Algorithm complete. Evaluation is successful."],
    exam: ["Complete."]
  },
  error: {
    meme: ["Bhai yeh expression illegal hai 😂", "Stack said NO! Syntax check kar lo 💀"],
    explain: ["Expression syntax error detected. Check structure."],
    exam: ["Syntax Error Detected."]
  }
};

let tokens = [], allSteps = [], stepIdx = 0, finalResult = 0, finalPostfix = [], autoTimer = null;
const prec = { '+': 1, '-': 1, '*': 2, '/': 2, '^': 3 };
const assoc = { '+': 'L', '-': 'L', '-': 'L', '/': 'L', '^': 'R' };
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

function generateSteps(tks) {
  const steps = []; const opStack = []; const postfix = [];
  const snap = (idx, action, ped, bot, p, h) => {
    steps.push({ tokenIdx: idx, opStack: [...opStack], postfix: [...postfix], action, pedagogy: ped, botEvent: bot, phase: p, operandStack: null, pfHighlight: h });
  };
  snap(-1, 'Start', 'Init Phase 1.', 'pushNum', 1, -1);

  for (let i = 0; i < tks.length; i++) {
    const t = tks[i];
    if (isAlnum(t)) { postfix.push(t); snap(i, `Output ${t}`, `${t} goes directly to output.`, 'pushNum', 1, -1); }
    else if (t === '(') { opStack.push(t); snap(i, `Stack (`, `Pushed (`, 'pushOpStack', 1, -1); }
    else if (t === ')') {
      snap(i, `Found )`, `Popping until matching (`, 'matchedParen', 1, -1);
      while(opStack.length && opStack[opStack.length-1] !== '(') { postfix.push(opStack.pop()); snap(i, `Pop to output`, '', '', 1, -1); }
      if (opStack.length) opStack.pop(); else return { error: `Extra ')' detected.` };
    } else if (isOp(t)) {
      while(opStack.length && opStack[opStack.length-1] !== '(' && ((assoc[t]==='L'&&prec[opStack[opStack.length-1]]>=prec[t])||(assoc[t]==='R'&&prec[opStack[opStack.length-1]]>prec[t]))) {
        postfix.push(opStack.pop()); snap(i, `Pop due to precedence`, `Higher prec operator popped.`, 'popHigher', 1, -1);
      }
      opStack.push(t); snap(i, `Stack ${t}`, `Operator pushed.`, 'pushOpStack', 1, -1);
    } else { return { error: `Illegal token ${t}` }; }
  }
  while(opStack.length) {
    if(opStack[opStack.length-1] === '(') return { error: 'Unclosed (' };
    postfix.push(opStack.pop()); snap(tks.length, `Drain stack`, `Output remaining ops.`, '', 1, -1);
  }
  snap(tks.length, 'Phase 1 Complete', `Postfix: ${postfix.join(' ')}`, 'done', 1, -1);

  const finalPostfix = [...postfix];
  const valStack = [];
  const snap2 = (hlIdx, act, ped, vs) => steps.push({ tokenIdx: tks.length, opStack: [], postfix: [...finalPostfix], action: act, pedagogy: ped, botEvent: '', phase: 2, operandStack: [...vs], pfHighlight: hlIdx });

  snap2(-1, "Start Eval", "Phase 2 started.", valStack);
  for (let i = 0; i < finalPostfix.length; i++) {
    const t = finalPostfix[i];
    if (isAlnum(t)) { valStack.push(isNaN(t)?t:parseFloat(t)); snap2(i, `Push ${t}`, `Operand to eval stack.`, valStack); }
    else if (isOp(t)) {
      if (valStack.length < 2) return { error: 'Missing operands in postfix!' };
      const b=valStack.pop(), a=valStack.pop();
      let r = isNaN(a)||isNaN(b) ? `(${a}${t}${b})` : (t==='+'?a+b : t==='-'?a-b : t==='*'?a*b : t==='/'?a/b : Math.pow(a,b));
      valStack.push(r); snap2(i, `Evaluate ${t}`, `Computed ${a}${t}${b}=${r}`, valStack);
    }
  }
  snap2(finalPostfix.length, "Result Extracted", `Result: ${valStack[0]}`, valStack);
  return { steps, postfix: finalPostfix, finalResult: valStack[0], error: null };
}

// ── BOT LOGIC ──
function getBotMode() { return document.querySelector('input[name="bmode"]:checked').value; }
function stackySay(type) {
  if(!type || type==='') return;
  const mode = getBotMode();
  const arr = botJokes[type][mode];
  if(!arr) return;
  document.getElementById('bot-text').textContent = arr[Math.floor(Math.random()*arr.length)];
  const b = document.getElementById('bot-bubble');
  b.classList.add('show');
  gsap.fromTo(b, {y: 20, opacity:0}, {y:0, opacity:1, duration:0.3, ease:"back.out(1.7)"});
  setTimeout(()=> b.classList.remove('show'), 3000);
}

// ── RENDER ENGINE (GSAP CONNECTED) ──
function renderStep(idx) {
  if(!allSteps.length) return;
  const s = allSteps[Math.max(0, Math.min(idx, allSteps.length - 1))];
  stepIdx = Math.max(0, Math.min(idx, allSteps.length - 1));

  // Timeline UI update
  document.querySelectorAll('.tl-pip').forEach((p, i) => {
    if(i === stepIdx) p.classList.add('active'); else p.classList.remove('active');
  });

  // Token Strip
  const strip = document.getElementById('token-strip'); strip.innerHTML = '';
  tokens.forEach((t, i) => {
    const d = document.createElement('div'); d.className = 'token'; d.textContent = t;
    if(s.phase===1) {
      if(i < s.tokenIdx) { d.classList.add('processed'); d.classList.add('ghost'); }
      else if(i === s.tokenIdx) { d.classList.add('current'); d.classList.add('neon-current'); }
    } else d.classList.add('ghost');
    strip.appendChild(d);
  });

  // Postfix strip
  const pfStrip = document.getElementById('postfix-strip'); pfStrip.innerHTML = '';
  s.postfix.forEach((t, i) => {
    const d = document.createElement('div'); d.className = 'pf-token'; d.textContent = t;
    if(isAlnum(t)) d.classList.add('neon-operand'); else d.classList.add('neon-operator');
    if(s.phase===2 && s.pfHighlight===i) d.classList.add('current');
    pfStrip.appendChild(d);
  });
  
  // Animate newly added postfix token if applicable
  if(s.postfix.length > 0 && s.action.includes('Push') && s.phase === 1) {
    if(pfStrip.lastChild) gsap.from(pfStrip.lastChild, {x: -30, opacity: 0, scale:0.5, duration: 0.4, ease: "back.out(1.7)"});
  }

  // Operator Stack
  const oarea = document.getElementById('op-stack-area'); oarea.innerHTML = '';
  s.opStack.forEach((t, i) => {
    const d = document.createElement('div'); d.className = 'stack-item neon-operator'; d.textContent = t;
    if(i===s.opStack.length-1) d.classList.add('top');
    oarea.appendChild(d);
  });
  if(s.action.includes('Stack ') && s.phase===1 && oarea.lastChild) {
    gsap.from(oarea.lastChild, {y: -40, opacity: 0, duration: 0.4, ease: "bounce.out"});
  }

  // Operand Stack (Phase 2 Eval)
  const varea = document.getElementById('operand-stack-area'); varea.innerHTML = '';
  if(s.phase===2 && s.operandStack) {
    s.operandStack.forEach((t, i) => {
      const d = document.createElement('div'); d.className = 'stack-item neon-result'; d.textContent = t;
      if(i===s.operandStack.length-1) d.classList.add('top');
      varea.appendChild(d);
    });
    if(s.action.includes('Push') && varea.lastChild) {
      gsap.from(varea.lastChild, {y: -40, opacity: 0, duration: 0.4, ease: "bounce.out"});
    }
  }

  // Metrics
  document.getElementById('m-steps').textContent = stepIdx;
  document.getElementById('m-opstack').textContent = Math.max(parseInt(document.getElementById('m-opstack').textContent), s.opStack.length);
  
  stackySay(s.botEvent);

  if(s.action && s.action.includes('Output')) sfxPush();
  else if(s.action && s.action.includes('Stack')) sfxPush();
  else if(s.action && s.action.includes('Pop')) sfxPop();

  if(stepIdx === allSteps.length-1) sfxSuccess();
  document.getElementById('btn-prev').disabled = stepIdx<=0; document.getElementById('btn-next').disabled = stepIdx>=allSteps.length-1;
}

function initTimeline() {
  const tl = document.getElementById('timeline'); tl.innerHTML = '';
  allSteps.forEach((s, i) => {
    const d = document.createElement('div'); d.className = 'tl-pip';
    d.onclick = () => { stopAuto(); renderStep(i); };
    tl.appendChild(d);
  });
}

function loadExpression(expr) {
  stopAuto();
  document.getElementById('m-opstack').textContent = '0';

  const tks = tokenize(expr);
  const res = generateSteps(tks);
  if(res.error) {
    sfxError();
    stackySay('error');
    console.warn("Syntax Error:", res.error);
    return;
  }
  tokens = tks; allSteps = res.steps; finalResult = res.finalResult; finalPostfix = res.postfix;
  stepIdx = 0; initTimeline(); renderStep(0);
}

function getDelay() { return [1500, 1000, 600, 300, 100][parseInt(document.getElementById('speed-slider').value) - 1]; }
function startAuto() {
  if (stepIdx >= allSteps.length - 1) renderStep(0);
  document.getElementById('btn-auto').classList.add('active');
  document.getElementById('btn-auto').innerHTML = '⏸ PAUSE';
  autoTimer = setInterval(() => {
    if (stepIdx >= allSteps.length - 1) { stopAuto(); return; }
    renderStep(stepIdx + 1);
  }, getDelay());
}
function stopAuto() { clearInterval(autoTimer); autoTimer=null; document.getElementById('btn-auto').classList.remove('active'); document.getElementById('btn-auto').innerHTML = '► AUTO'; }

document.getElementById('btn-next').onclick = () => { stopAuto(); renderStep(stepIdx+1); };
document.getElementById('btn-prev').onclick = () => { stopAuto(); renderStep(stepIdx-1); };
document.getElementById('btn-auto').onclick = () => { if(autoTimer) stopAuto(); else startAuto(); };
document.getElementById('load-btn').onclick = () => loadExpression(document.getElementById('expr-input').value);
document.getElementById('expr-input').addEventListener('keydown', e => { if (e.key === 'Enter') loadExpression(e.target.value); });
document.getElementById('speed-slider').oninput = function() { if (autoTimer) { stopAuto(); startAuto(); } };
document.getElementById('theme-toggle').onclick = () => {
    const body = document.body;
    body.setAttribute('data-theme', body.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
    document.getElementById('theme-toggle').textContent = body.getAttribute('data-theme').toUpperCase();
};

// ── PARTICLES BACKGROUND ENGINE (TUNED) ──
function initParticles() {
  const canvas = document.getElementById("particles-bg");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  let particles = [];
  function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
  window.addEventListener('resize', resize);
  resize();

  for (let i = 0; i < 60; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 2,
      dx: (Math.random() - 0.5) * 1.2, // Faster energy
      dy: (Math.random() - 0.5) * 1.2
    });
  }

  function animateParticles() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#00f5ff";
    particles.forEach(p => {
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
      p.x += p.dx; p.y += p.dy;
      if (p.x < 0 || p.x > canvas.width) p.dx *= -1;
      if (p.y < 0 || p.y > canvas.height) p.dy *= -1;
    });
    requestAnimationFrame(animateParticles);
  }
  animateParticles();
}

// Initial load
initParticles();
loadExpression('5 + ( 2 * 3 )');
