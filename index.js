const canvas = document.getElementById('mazeCanvas');
const ctx = canvas.getContext('2d');
const timerEl = document.getElementById('timer');
const movesEl = document.getElementById('moves');
const bestTimeEl = document.getElementById('bestTime');
const difficultySelect = document.getElementById('difficulty');
const startBtn = document.getElementById('startBtn');
const hintBtn = document.getElementById('hintBtn');

let maze = [];
let playerPos = {x:0, y:0};
let goalPos = {x:0, y:0};
let cellSize = 40; // Will be updated dynamically
let timer = 0;
let moves = 0;
let timerInterval;
let bestTime = null;
let pulse = 0;
let hintPath = [];
let mazeSize = 6;

// Maze generation using recursive backtracking
function generateMaze(size){
  const maze = Array.from({length:size}, ()=>Array.from({length:size}, ()=>[true,true,true,true]));
  const visited = Array.from({length:size}, ()=>Array(size).fill(false));

  function carve(x,y){
    visited[y][x]=true;
    const dirs=[[0,-1,0],[1,0,1],[0,1,2],[-1,0,3]].sort(()=>Math.random()-0.5);
    for(let [dx,dy,wall] of dirs){
      const nx=x+dx, ny=y+dy;
      if(nx>=0 && ny>=0 && nx<size && ny<size && !visited[ny][nx]){
        maze[y][x][wall]=false;
        maze[ny][nx][(wall+2)%4]=false;
        carve(nx,ny);
      }
    }
  }
  carve(0,0);
  return maze;
}

// Update canvas size dynamically
function resizeCanvas(){
  const container = document.querySelector('.canvas-container');
  const maxContainer = Math.min(window.innerWidth * 0.95, window.innerHeight * 0.7);
  canvas.width = maxContainer;
  canvas.height = maxContainer;
  cellSize = canvas.width / mazeSize;
  drawMaze(hintPath);
}

// Draw maze
function drawMaze(path=[]){
  const size = maze.length;
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.strokeStyle='#333';
  ctx.lineWidth=2;

  for(let y=0; y<size; y++){
    for(let x=0; x<size; x++){
      const walls = maze[y][x];
      const px = x*cellSize;
      const py = y*cellSize;
      if(walls[0]) { ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px+cellSize, py); ctx.stroke(); }
      if(walls[1]) { ctx.beginPath(); ctx.moveTo(px+cellSize, py); ctx.lineTo(px+cellSize, py+cellSize); ctx.stroke(); }
      if(walls[2]) { ctx.beginPath(); ctx.moveTo(px, py+cellSize); ctx.lineTo(px+cellSize, py+cellSize); ctx.stroke(); }
      if(walls[3]) { ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px, py+cellSize); ctx.stroke(); }
    }
  }

  // Draw hint path
  if(path.length>0){
    const glow = Math.sin(pulse*2)*0.5 + 0.5;
    ctx.fillStyle = `rgba(255,255,0,${0.3 + glow*0.3})`;
    path.forEach(([x,y])=>{
      ctx.fillRect(x*cellSize + cellSize*0.25, y*cellSize + cellSize*0.25, cellSize*0.5, cellSize*0.5);
    });
  }

  // Pulsing start
  ctx.fillStyle='rgba(0,0,255,0.6)';
  ctx.beginPath();
  const startR = cellSize/3 + Math.sin(pulse)*5;
  ctx.arc(playerPos.x*cellSize + cellSize/2, playerPos.y*cellSize + cellSize/2, startR,0,Math.PI*2);
  ctx.fill();

  // Pulsing goal
  ctx.fillStyle='rgba(0,200,0,0.6)';
  ctx.beginPath();
  const goalR = cellSize/3 + Math.sin(pulse+Math.PI/2)*5;
  ctx.arc(goalPos.x*cellSize + cellSize/2, goalPos.y*cellSize + cellSize/2, goalR,0,Math.PI*2);
  ctx.fill();

  // Player
  ctx.fillStyle='blue';
  ctx.beginPath();
  ctx.arc(playerPos.x*cellSize + cellSize/2, playerPos.y*cellSize + cellSize/2, cellSize/4,0,Math.PI*2);
  ctx.fill();
}

// Move player
function movePlayer(dx,dy){
  const size=maze.length;
  let x=playerPos.x, y=playerPos.y, moved=false;
  if(dx===-1 && !maze[y][x][3]){ x--; moved=true; }
  if(dx===1 && !maze[y][x][1]){ x++; moved=true; }
  if(dy===-1 && !maze[y][x][0]){ y--; moved=true; }
  if(dy===1 && !maze[y][x][2]){ y++; moved=true; }

  if(moved){
    playerPos={x,y};
    moves++;
    movesEl.textContent=moves;
  }

  if(playerPos.x===goalPos.x && playerPos.y===goalPos.y){
    clearInterval(timerInterval);
    celebrateWin();
    setTimeout(()=>{ alert(`🎉 You won in ${timer}s with ${moves} moves!`); },500);
    if(bestTime===null || timer<bestTime){ bestTime=timer; bestTimeEl.textContent=bestTime; }
  }
  drawMaze(hintPath);
}

// Start game
function startGame(){
  const level = difficultySelect.value;
  if(level==='easy') mazeSize=6;
  else if(level==='moderate') mazeSize=10;
  else mazeSize=15;

  maze = generateMaze(mazeSize);
  playerPos={x:0,y:0};
  goalPos={x:mazeSize-1,y:mazeSize-1};
  moves=0; movesEl.textContent=moves;

  timer=0; timerEl.textContent=timer;
  clearInterval(timerInterval);
  timerInterval=setInterval(()=>{ timer++; timerEl.textContent=timer; },1000);

  hintPath=[];
  resizeCanvas();
}

// BFS hint path
function getHintPath(){
  const size=maze.length;
  const visited=Array.from({length:size}, ()=>Array(size).fill(false));
  const prev=Array.from({length:size}, ()=>Array(size).fill(null));
  const queue=[[playerPos.x,playerPos.y]];
  visited[playerPos.y][playerPos.x]=true;

  while(queue.length>0){
    const [x,y]=queue.shift();
    if(x===goalPos.x && y===goalPos.y) break;
    const dirs=[[0,-1],[1,0],[0,1],[-1,0]];
    dirs.forEach(([dx,dy])=>{
      const nx=x+dx, ny=y+dy;
      if(nx>=0 && ny>=0 && nx<size && ny<size && !visited[ny][nx]){
        if((dx===-1 && !maze[y][x][3])||(dx===1 && !maze[y][x][1])||(dy===-1 && !maze[y][x][0])||(dy===1 && !maze[y][x][2])){
          visited[ny][nx]=true;
          prev[ny][nx]=[x,y];
          queue.push([nx,ny]);
        }
      }
    });
  }

  let path=[], x=goalPos.x, y=goalPos.y;
  while(prev[y][x]){
    path.push([x,y]);
    [x,y]=prev[y][x];
  }
  path.reverse();
  return path;
}

// Confetti
function celebrateWin(){
  const duration=2000, start=performance.now();
  function frame(time){
    const t=time-start;
    if(t>duration) return;
    for(let i=0;i<50;i++){
      const x=Math.random()*canvas.width;
      const y=Math.random()*canvas.height;
      ctx.fillStyle=`hsl(${Math.random()*360},100%,50%)`;
      ctx.fillRect(x,y,5,5);
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

// Animate pulsing
function animate(){
  pulse+=0.1;
  drawMaze(hintPath);
  requestAnimationFrame(animate);
}

// Event listeners
hintBtn.addEventListener('click', ()=>{ 
  hintPath = getHintPath();
  drawMaze(hintPath);
});
startBtn.addEventListener('click', startGame);
document.addEventListener('keydown', e=>{
  switch(e.key){
    case 'ArrowUp': movePlayer(0,-1); break;
    case 'ArrowDown': movePlayer(0,1); break;
    case 'ArrowLeft': movePlayer(-1,0); break;
    case 'ArrowRight': movePlayer(1,0); break;
  }
});
window.addEventListener('resize', resizeCanvas);

// Initialize
startGame();
animate();
