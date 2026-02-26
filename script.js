// =============================
// I did not code this Site - ChatGPT was used for the Site Coding
// Any Embedded System coding is done by me 
// =============================
// Clean Scripted Tetris Replay
// 4 Row Clear Cinematic Intro
// =============================

const intro = document.getElementById("intro");
const content = document.getElementById("content");
const canvas = document.getElementById("tetrisCanvas");
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const CELL = 28;
const ROWS = 16;
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
  L:"#ff9a3c",
  J:"#4f79ff"
};

let board = Array.from({length: ROWS}, () => Array(COLS).fill(null));

let state = "play";
let particles = [];
let scriptIndex = 0;
let dropY = -4;

// Scripted placements (build 4 full rows except last column)
const SCRIPT = [
  {col:0},{col:2},{col:4},{col:6},{col:8},
  {col:0},{col:2},{col:4},{col:6},{col:8},
  {col:0},{col:2},{col:4},{col:6},{col:8},
  {col:0},{col:2},{col:4},{col:6},{col:8},
];

function drawBoard(){
  const {x:ox,y:oy}=gridOrigin();
  for(let r=0;r<ROWS;r++){
    for(let c=0;c<COLS;c++){
      if(board[r][c]){
        ctx.fillStyle = COLORS[board[r][c]];
        ctx.fillRect(ox+c*CELL, oy+r*CELL, CELL, CELL);
      }
    }
  }
}

function explode(cx,cy){
  for(let i=0;i<300;i++){
    particles.push({
      x:cx,
      y:cy,
      dx:(Math.random()-0.5)*8,
      dy:(Math.random()-1.1)*8,
      life:60
    });
  }
}

function updateParticles(){
  particles.forEach(p=>{
    p.x+=p.dx;
    p.y+=p.dy;
    p.dy+=0.4;
    p.life--;
  });
  particles = particles.filter(p=>p.life>0);
}

function drawParticles(){
  ctx.save();
  ctx.globalCompositeOperation="lighter";
  particles.forEach(p=>{
    ctx.globalAlpha=p.life/60;
    ctx.fillStyle="#5aa9ff";
    ctx.fillRect(p.x,p.y,3,3);
  });
  ctx.restore();
  ctx.globalAlpha=1;
}

function clearFourRows(){
  board.splice(ROWS-4,4);
  for(let i=0;i<4;i++){
    board.unshift(Array(COLS).fill(null));
  }
}

function loop(){
  ctx.fillStyle="#0a0f1c";
  ctx.fillRect(0,0,canvas.width,canvas.height);

  drawBoard();

  const {x:ox,y:oy}=gridOrigin();

  if(state==="play"){

    // Drop O blocks to build rows
    if(scriptIndex < SCRIPT.length){
      dropY+=0.6;

      ctx.fillStyle=COLORS.O;
      ctx.fillRect(ox+SCRIPT[scriptIndex].col*CELL, oy+dropY*CELL, CELL, CELL);
      ctx.fillRect(ox+(SCRIPT[scriptIndex].col+1)*CELL, oy+dropY*CELL, CELL, CELL);
      ctx.fillRect(ox+SCRIPT[scriptIndex].col*CELL, oy+(dropY+1)*CELL, CELL, CELL);
      ctx.fillRect(ox+(SCRIPT[scriptIndex].col+1)*CELL, oy+(dropY+1)*CELL, CELL, CELL);

      if(dropY+1 >= ROWS-1){
        for(let r=ROWS-2;r<ROWS;r++){
          for(let c=SCRIPT[scriptIndex].col;c<SCRIPT[scriptIndex].col+2;c++){
            board[r][c]="O";
          }
        }
        scriptIndex++;
        dropY=-4;
      }

    } else {
      // Final I piece
      dropY+=0.7;
      for(let i=0;i<4;i++){
        ctx.fillStyle=COLORS.I;
        ctx.fillRect(ox+8*CELL, oy+(dropY+i)*CELL, CELL, CELL);
      }

      if(dropY+3 >= ROWS-1){
        clearFourRows();
        explode(ox+8*CELL, oy+(ROWS-2)*CELL);
        state="explode";
      }
    }
  }

  if(state==="explode"){
    updateParticles();
    drawParticles();

    if(particles.length===0){
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
