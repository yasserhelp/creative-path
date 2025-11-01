// Professional, modular snake game (clean & commented)

document.addEventListener('DOMContentLoaded', () => {
  // DOM
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  const hudLogos = document.getElementById('hudLogos');
  const hudLevel = document.getElementById('hudLevel');
  const logosEl = document.getElementById('logos');
  const levelEl = document.getElementById('level');
  const statusEl = document.getElementById('status');
  const terminal = document.getElementById('terminal');
  const modal = document.getElementById('modal');
  const modalStart = document.getElementById('modalStart');
  const modalDemo = document.getElementById('modalDemo');
  const modalGameOver = document.getElementById('modalGameOver');
  const restartBtn = document.getElementById('restartBtn');
  const btnStart = document.getElementById('btnStart');
  const btnPause = document.getElementById('btnPause');

  const speedInput = document.getElementById('speed');
  const gridInput = document.getElementById('grid');
  const musicInput = document.getElementById('music');

  // audio elements (set src if you have assets)
  const audioEat = document.getElementById('audioEat');
  const audioLevel = document.getElementById('audioLevel');
  const audioBgm = document.getElementById('audioBgm');

  // state
  let gridSize = parseInt(gridInput.value);
  let cell = Math.floor(canvas.width / gridSize);
  let snake = [];
  let dir = {x:1,y:0};
  let nextDir = {x:1,y:0};
  let food = null;
  let logos = 0;
  let level = 1;
  let running = false;
  let paused = false;
  let raf = null;
  let tickAccum = 0;
  const baseInterval = 120;

  // utils
  const termLog = (txt, color) => {
    const el = document.createElement('div'); el.textContent = txt;
    if(color) el.style.color = color;
    terminal.appendChild(el); terminal.scrollTop = terminal.scrollHeight;
  };

  function resetState() {
    gridSize = parseInt(gridInput.value);
    cell = Math.floor(canvas.width / gridSize);
    snake = [];
    const cx = Math.floor(gridSize/2), cy = Math.floor(gridSize/2);
    snake.push({x:cx,y:cy});
    snake.push({x:cx-1,y:cy});
    snake.push({x:cx-2,y:cy});
    dir = {x:1,y:0}; nextDir = {x:1,y:0};
    logos = 0; level = 1; running = false; paused = false;
    hudLogos.textContent = logos; hudLevel.textContent = level;
    logosEl.textContent = logos; levelEl.textContent = level; statusEl.textContent = 'READY';
    placeFood();
    draw();
  }

  function placeFood(){
    let tries=0;
    while(tries<2000){
      const fx = Math.floor(Math.random()*gridSize);
      const fy = Math.floor(Math.random()*gridSize);
      if(!snake.some(s=>s.x===fx && s.y===fy)){
        food = {x:fx,y:fy, logo: Math.random() < 0.28};
        return;
      }
      tries++;
    }
  }

  function draw(){
    ctx.clearRect(0,0,canvas.width,canvas.height);
    // background
    ctx.fillStyle = '#001213';
    ctx.fillRect(0,0,canvas.width,canvas.height);

    // subtle grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.02)';
    ctx.lineWidth = 1;
    for(let i=0;i<=gridSize;i++){
      ctx.beginPath(); ctx.moveTo(i*cell,0); ctx.lineTo(i*cell,canvas.height); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0,i*cell); ctx.lineTo(canvas.width,i*cell); ctx.stroke();
    }

    // food
    if(food){
      const fx = food.x*cell, fy = food.y*cell;
      if(food.logo){
        ctx.fillStyle = '#ffd166';
        ctx.fillRect(fx+3,fy+3,cell-6,cell-6);
        ctx.fillStyle = '#111';
        ctx.font = `${Math.max(10,cell/1.6)}px sans-serif`;
        ctx.textAlign='center'; ctx.textBaseline='middle';
        ctx.fillText('★', fx+cell/2, fy+cell/2);
      } else {
        ctx.fillStyle = '#ff6b6b';
        ctx.fillRect(fx+3,fy+3,cell-6,cell-6);
      }
    }

    // snake
    for(let i=snake.length-1;i>=0;i--){
      const s = snake[i];
      const x = s.x*cell, y = s.y*cell;
      if(i===0){
        ctx.fillStyle = '#63e6be';
        ctx.fillRect(x+1,y+1,cell-2,cell-2);
      } else {
        const t = i/snake.length;
        ctx.fillStyle = `rgba(99,230,190,${Math.max(0.2,1-t)})`;
        ctx.fillRect(x+1,y+1,cell-2,cell-2);
      }
    }

    // HUD small
    ctx.fillStyle = 'rgba(255,255,255,0.03)';
    ctx.fillRect(10,canvas.height-36,200,28);
    ctx.fillStyle = '#e8fff8';
    ctx.font = '13px sans-serif';
    ctx.fillText(`Level: ${level}  •  Logos: ${logos}`, 18, canvas.height-16);
  }

  function step(){
    if(!(nextDir.x === -dir.x && nextDir.y === -dir.y)) dir = nextDir;
    const head = {x:(snake[0].x + dir.x + gridSize) % gridSize, y:(snake[0].y + dir.y + gridSize) % gridSize};
    if(snake.some(seg=>seg.x===head.x && seg.y===head.y)){
      endGame(); return;
    }
    snake.unshift(head);
    if(food && head.x===food.x && head.y===food.y){
      if(food.logo){
        logos++;
        logosEl.textContent = logos; hudLogos.textContent = logos;
        termLog(`Collected logo: ${logos}`, '#ffd166');
        if(logos % 5 === 0){
          level++; levelEl.textContent = level; hudLevel.textContent = level;
          termLog(`Level up: ${level}`, '#63e6be');
          if(audioLevel && audioLevel.src) { audioLevel.currentTime=0; audioLevel.play().catch(()=>{}); }
          // GSAP pop
          try{ gsap.fromTo('#hudLevel',{scale:0.8},{scale:1,duration:0.36,ease:'back.out(2)'}); }catch(e){}
        }
      }
      // play eat sound if available
      try{ if(audioEat && audioEat.src){ audioEat.currentTime=0; audioEat.play().catch(()=>{}); } }catch(e){}
      placeFood();
    } else {
      snake.pop();
    }
  }

  // main loop
  let last = performance.now();
  let acc = 0;
  function loop(now){
    if(!running) return;
    const delta = now - last; last = now; acc += delta;
    const s = parseFloat(speedInput.value);
    const interval = Math.max(40, baseInterval / s - (level-1)*4);
    if(acc >= interval){
      acc = 0; step(); draw();
    }
    raf = requestAnimationFrame(loop);
  }

  // input handling
  window.addEventListener('keydown', e=>{
    const k = e.key;
    if(k === 'ArrowUp' || k === 'w') nextDir = {x:0,y:-1};
    if(k === 'ArrowDown' || k === 's') nextDir = {x:0,y:1};
    if(k === 'ArrowLeft' || k === 'a') nextDir = {x:-1,y:0};
    if(k === 'ArrowRight' || k === 'd') nextDir = {x:1,y:0};
    if(k === ' ') togglePause();
  });

  function startGame(demo=false){
    resetState();
    running = true; paused = false; statusEl.textContent = 'RUNNING';
    if(demo) speedInput.value = 1.6;
    try{ if(audioBgm && audioBgm.src) audioBgm.play().catch(()=>{}); }catch(e){}
    last = performance.now(); cancelAnimationFrame(raf); raf = requestAnimationFrame(loop);
    modal.style.display = 'none';
    termLog('Game started', '#63e6be');
  }

  function togglePause(){
    if(!running) return;
    paused = !paused;
    statusEl.textContent = paused ? 'PAUSED' : 'RUNNING';
    if(!paused){ last = performance.now(); raf = requestAnimationFrame(loop); }
    else cancelAnimationFrame(raf);
  }

  function endGame(){
    running = false;
    statusEl.textContent = 'COMPLETE';
    document.getElementById('finalLogos').textContent = logos;
    modalGameOver.style.display = 'flex';
    termLog(`Journey complete — logos: ${logos}`, '#ffd166');
    try{ if(audioBgm && !audioBgm.paused) audioBgm.pause(); }catch(e){}
  }

  // UI bindings
  modalStart.addEventListener('click', ()=> startGame(false));
  modalDemo.addEventListener('click', ()=> startGame(true));
  btnStart.addEventListener('click', ()=> startGame(false));
  btnPause.addEventListener('click', ()=> togglePause());
  restartBtn.addEventListener('click', ()=> { modalGameOver.style.display='none'; startGame(false); });

  // live updates UI
  gridInput.addEventListener('input', ()=> { document.getElementById('gridVal').textContent = gridInput.value; });
  speedInput.addEventListener('input', ()=> { document.getElementById('speedVal').textContent = parseFloat(speedInput.value).toFixed(1); });
  musicInput && musicInput.addEventListener('input', ()=> { document.getElementById('musicVal').textContent = parseFloat(musicInput.value).toFixed(2); try{ if(audioBgm) audioBgm.volume = parseFloat(musicInput.value); }catch(e){} });

  // initial
  resetState();
  // entrance animation
  try{ gsap.from('.app > *',{y:20, opacity:0, stagger:0.06, duration:0.6, ease:'power2.out'}); }catch(e){}
  termLog('Ready — press START to begin', '#63e6be');
});
