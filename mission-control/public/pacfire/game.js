const TILE=32,COLS=26,ROWS=19;
const canvas=document.getElementById('game');const ctx=canvas.getContext('2d');
const scoreEl=document.getElementById('score');const highEl=document.getElementById('high');const livesEl=document.getElementById('lives');
const musicBtn=document.getElementById('musicBtn');
const HIGH_KEY='pacfire-highscore';
let high=Number(localStorage.getItem(HIGH_KEY)||0),score=0,lives=3,gameOver=false;
highEl.textContent='High: '+high;

const mapRaw=[
"##########################",
"#............##..........#",
"#.####.#####.##.#####.####",
"#o####.#####.##.#####.###o",
"#.####.#####.##.#####.####",
"#........................#",
"#.####.##.########.##.####",
"#......##....##....##....#",
"######.##### ## #####.####",
"######.##          ##.####",
"######.## ###--### ##.####",
"#..........#GGGG#.........#",
"######.## ######## ##.####",
"######.##    PP    ##.####",
"#.####.#####.##.#####.####",
"#o..##................##.o#",
"###.##.##.########.##.##.##",
"#......##....##....##.....#",
"##########################",
].map(r=>r.padEnd(COLS,'#').slice(0,COLS));

const dirs={left:{x:-1,y:0},right:{x:1,y:0},up:{x:0,y:-1},down:{x:0,y:1}};
let input={left:false,right:false,up:false,down:false,shoot:false};

const grid=mapRaw.map(r=>r.split(''));
let pellets=0;
for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++)if(grid[y][x]==='.'||grid[y][x]==='o')pellets++;

const pac={x:13*TILE+TILE/2,y:13*TILE+TILE/2,r:12,dir:'left',speed:3.1,cool:0};
let ghosts=[];
for(let i=0;i<4;i++)ghosts.push({x:(11+i)*TILE+16,y:11*TILE+16,r:12,speed:2,color:['#ff4d4d','#57d1ff','#ff9de1','#ffb347'][i],dead:0});
let bullets=[];let particles=[];

function wallAt(px,py){const tx=Math.floor(px/TILE),ty=Math.floor(py/TILE);if(tx<0||ty<0||tx>=COLS||ty>=ROWS)return true;return grid[ty][tx]==='#';}
function canMove(nx,ny,r){return !wallAt(nx-r,ny-r)&&!wallAt(nx+r,ny-r)&&!wallAt(nx-r,ny+r)&&!wallAt(nx+r,ny+r)}
function tileAt(x,y){return {tx:Math.floor(x/TILE),ty:Math.floor(y/TILE)}}

function eatPellet(){const {tx,ty}=tileAt(pac.x,pac.y);const c=grid[ty]?.[tx];if(c==='.'||c==='o'){grid[ty][tx]=' ';score+=c==='o'?50:10;pellets--;scoreEl.textContent='Score: '+score;if(score>high){high=score;localStorage.setItem(HIGH_KEY,String(high));highEl.textContent='High: '+high;}if(pellets<=0){gameOver=true;}}
}

function shoot(){if(pac.cool>0)return;pac.cool=16;const d=dirs[pac.dir]||dirs.left;bullets.push({x:pac.x,y:pac.y,vx:d.x*7.5,vy:d.y*7.5,r:5,life:60});}

function explode(x,y,color='#ff7a00'){for(let i=0;i<24;i++){const a=Math.random()*Math.PI*2,s=1+Math.random()*4;particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:28+Math.random()*20,color});}}

function updatePac(){let vx=0,vy=0;if(input.left){vx=-pac.speed;pac.dir='left';}else if(input.right){vx=pac.speed;pac.dir='right';}
if(input.up){vy=-pac.speed;pac.dir='up';}else if(input.down){vy=pac.speed;pac.dir='down';}
const nx=pac.x+vx,ny=pac.y+vy;if(canMove(nx,pac.y,pac.r))pac.x=nx;if(canMove(pac.x,ny,pac.r))pac.y=ny;if(pac.cool>0)pac.cool--;eatPellet();if(input.shoot){input.shoot=false;shoot();}}

function updateGhosts(){for(const g of ghosts){if(g.dead>0){g.dead--;continue;}if(Math.random()<0.04){const options=Object.entries(dirs).filter(([,d])=>canMove(g.x+d.x*2,g.y+d.y*2,g.r));if(options.length){const pick=options[Math.floor(Math.random()*options.length)][1];g.vx=pick.x*g.speed;g.vy=pick.y*g.speed;}}
if(g.vx==null){g.vx=g.speed;g.vy=0;}if(!canMove(g.x+g.vx,g.y,g.r))g.vx*=-1;else g.x+=g.vx;if(!canMove(g.x,g.y+g.vy,g.r))g.vy*=-1;else g.y+=g.vy;
const dx=g.x-pac.x,dy=g.y-pac.y;if(dx*dx+dy*dy<(g.r+pac.r)*(g.r+pac.r)){lives--;livesEl.textContent='Lives: '+lives;pac.x=13*TILE+16;pac.y=13*TILE+16;explode(pac.x,pac.y,'#ffd54a');if(lives<=0)gameOver=true;}}
}

function updateBullets(){bullets=bullets.filter(b=>{b.x+=b.vx;b.y+=b.vy;b.life--;if(b.life<=0||wallAt(b.x,b.y)){explode(b.x,b.y,'#ff8a00');return false;}for(const g of ghosts){if(g.dead>0)continue;const dx=g.x-b.x,dy=g.y-b.y;if(dx*dx+dy*dy<(g.r+b.r)*(g.r+b.r)){g.dead=180;score+=200;scoreEl.textContent='Score: '+score;if(score>high){high=score;localStorage.setItem(HIGH_KEY,String(high));highEl.textContent='High: '+high;}explode(g.x,g.y,g.color);return false;}}
return true;});}

function updateParticles(){particles=particles.filter(p=>{p.x+=p.vx;p.y+=p.vy;p.vy+=0.06;p.life--;return p.life>0;});}

function draw(){ctx.clearRect(0,0,canvas.width,canvas.height);
for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++){const c=grid[y][x],px=x*TILE,py=y*TILE;if(c==='#'){ctx.fillStyle='#15376f';ctx.fillRect(px,py,TILE,TILE);}else if(c==='.'||c==='o'){ctx.fillStyle=c==='o'?'#ff9':'#f2f2f2';ctx.beginPath();ctx.arc(px+16,py+16,c==='o'?5:2.7,0,Math.PI*2);ctx.fill();}}
ctx.fillStyle='#ffd54a';ctx.beginPath();ctx.arc(pac.x,pac.y,pac.r,0.25*Math.PI,1.75*Math.PI);ctx.lineTo(pac.x,pac.y);ctx.fill();
for(const g of ghosts){if(g.dead>0)continue;ctx.fillStyle=g.color;ctx.beginPath();ctx.arc(g.x,g.y,g.r,Math.PI,0);ctx.lineTo(g.x+g.r,g.y+g.r);ctx.lineTo(g.x-g.r,g.y+g.r);ctx.fill();ctx.fillStyle='#fff';ctx.fillRect(g.x-7,g.y-2,4,4);ctx.fillRect(g.x+3,g.y-2,4,4);} 
ctx.fillStyle='#ff7a00';for(const b of bullets){ctx.beginPath();ctx.arc(b.x,b.y,b.r,0,Math.PI*2);ctx.fill();}
for(const p of particles){ctx.fillStyle=p.color;ctx.fillRect(p.x,p.y,2,2);} 
if(gameOver){ctx.fillStyle='rgba(0,0,0,0.55)';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.fillStyle='#fff';ctx.font='bold 42px monospace';ctx.fillText(lives>0?'YOU WIN':'GAME OVER',canvas.width/2-130,canvas.height/2);ctx.font='20px monospace';ctx.fillText('Press R to restart',canvas.width/2-95,canvas.height/2+36);}}

function reset(){location.reload();}

document.addEventListener('keydown',e=>{const k=e.key.toLowerCase();if(k==='arrowleft'||k==='a')input.left=true;if(k==='arrowright'||k==='d')input.right=true;if(k==='arrowup'||k==='w')input.up=true;if(k==='arrowdown'||k==='s')input.down=true;if(k===' '){e.preventDefault();input.shoot=true;}if(k==='r'&&gameOver)reset();if(audioCtx&&audioCtx.state==='suspended')audioCtx.resume();});
document.addEventListener('keyup',e=>{const k=e.key.toLowerCase();if(k==='arrowleft'||k==='a')input.left=false;if(k==='arrowright'||k==='d')input.right=false;if(k==='arrowup'||k==='w')input.up=false;if(k==='arrowdown'||k==='s')input.down=false;});

let audioCtx=null,musicOn=true,interval=null;
function note(freq,dur=0.12,type='square',gain=0.03){const o=audioCtx.createOscillator(),g=audioCtx.createGain();o.type=type;o.frequency.value=freq;g.gain.value=gain;o.connect(g);g.connect(audioCtx.destination);o.start();o.stop(audioCtx.currentTime+dur);} 
function startMusic(){if(interval)return;audioCtx=audioCtx||new (window.AudioContext||window.webkitAudioContext)();const seq=[523,659,784,659,523,392,523,659,880,784,659,523,392,330,392,523];let i=0;interval=setInterval(()=>{if(!musicOn)return;note(seq[i%seq.length],0.11,'square',0.025);if(i%4===0)note(seq[(i+8)%seq.length]/2,0.14,'triangle',0.015);i++;},130);} 
function stopMusic(){if(interval){clearInterval(interval);interval=null;}}
musicBtn.onclick=()=>{musicOn=!musicOn;musicBtn.textContent='Music: '+(musicOn?'On':'Off');if(musicOn)startMusic();};
startMusic();

function loop(){if(!gameOver){updatePac();updateGhosts();updateBullets();updateParticles();}draw();requestAnimationFrame(loop);}loop();
