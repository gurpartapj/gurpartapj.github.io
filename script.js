// =============================
// I did not code this Site - ChatGPT was used for the Site Coding
// Any Embedded System coding is done by me 
// =============================
// Guaranteed Fast Cinematic Tetris
// =============================

const intro = document.getElementById("intro");
const content = document.getElementById("content");
const canvas = document.getElementById("tetrisCanvas");
const ctx = canvas.getContext("2d");

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener("resize", resize);
resize();

const CELL = 26;
const ROWS = 14;
const COLS = 10;

const GRID_W = COLS * CELL;
const GRID_H = ROWS * CELL;

function gridOrigin() {
  return {
    x: Math.floor((canvas.width - GRID_W) / 2),
    y: Math.floor((canvas.height - GRID_H) / 2),
  };
}

const COLORS = {
  I:"#39c6ff",
  O:"#ffd24a",
  T:"#b884ff",
  L:"#ff9a3c"
};

let board = Array.from({length: ROWS}, () => Array(COLS).fill(null));
let particles=[];
let state="build";
let time=0;

// Pre-fill bottom 3 rows except one column
const gap = Math.floor(Math.random()*COLS);

for(let r=ROWS-3;r<ROWS;r++){
  for(let c=0;c<COLS;c++){
    if(c!==gap){
      const keys=Object.keys(COLORS);
      board[r][c]=keys[Math.floor(Math.random()*keys.length)];
    }
  }
}

// I-piece drop
let iY=-4;
let explosionTriggered=false;

function explode(cx,cy){
  for(let i=0;i<300;i++){
    particles.push({
      x:cx,
      y:cy,
      dx:(Math.random()-0.5)*10,
      dy:(Math.random()-1.2)*10,
      life:70
    });
  }
}

function updateParticles(){
  particles.forEach(p=>{
    p.x+=p.dx;
    p.y+=p.dy;
    p.dy+=0.3;
    p.life--;
  });
  particles=particles.filter(p=>p.life>0);
}

function drawParticles(){
  ctx.save();
  ctx.globalCompositeOperation="lighter";
  particles.forEach(p=>{
    ctx.globalAlpha=p.life/70;
    ctx.fillStyle="#5aa9ff";
    ctx.fillRect(p.x,p.y,3,3);
  });
  ctx.restore();
  ctx.globalAlpha=1;
}

function drawBoard(){
  const {x:ox,y:oy}=gridOrigin();
  for(let r=0;r<ROWS;r++){
    for(let c=0;c<COLS;c++){
      if(board[r][c]){
        ctx.fillStyle=COLORS[board[r][c]];
        ctx.fillRect(ox+c*CELL,oy+r*CELL,CELL,CELL);
      }
    }
  }
}

function clearBottomLines(){
  board.splice(ROWS-3,3);
  for(let i=0;i<3;i++){
    board.unshift(Array(COLS).fill(null));
  }
}

function loop(){
  ctx.fillStyle="#0a0f1c";
  ctx.fillRect(0,0,canvas.width,canvas.height);

  time+=16;

  drawBoard();

  const {x:ox,y:oy}=gridOrigin();

  if(state==="build"){
    iY+=0.6;

    // Draw vertical I piece
    for(let i=0;i<4;i++){
      ctx.fillStyle=COLORS.I;
      ctx.fillRect(
        ox+gap*CELL,
        oy+(iY+i)*CELL,
        CELL,
        CELL
      );
    }

    if(iY+3>=ROWS-1){
      state="explode";
      clearBottomLines();
      explode(ox+gap*CELL,oy+(ROWS-2)*CELL);
    }
  }

  if(state==="explode"){
    updateParticles();
    drawParticles();

    if(particles.length===0 && !explosionTriggered){
      explosionTriggered=true;
      intro.style.opacity="0";
      setTimeout(()=>{
        intro.style.display="none";
        content.style.opacity="1";
      },500);
    }
  }

  requestAnimationFrame(loop);
}

loop();
