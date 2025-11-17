import { ship, updateShip, drawShip } from './ship.js';
import { asteroids, spawnAsteroids, worldVerts, drawAsteroids, updateAsteroids, createAsteroid } from './asteroids.js';
import { bullets, shootBullet, updateBullets, drawBullets } from './bullets.js';
import { particles, createParticles, updateParticles, drawParticles } from './particles.js';
import { polysCollide } from './collision.js';

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let keys = {};
document.addEventListener('keydown', e => keys[e.key] = true);
document.addEventListener('keyup', e => keys[e.key] = false);
document.addEventListener('keydown', e => { if(e.key===' '&&ship.alive) shootBullet(ship); });

let lastTime=0;
let gameTime=0;

spawnAsteroids(8);

// Initialize faint stars
const stars = [];
for(let i=0;i<50;i++){
  stars.push({ x: Math.random()*800, y: Math.random()*600, speed: Math.random()*0.3+0.1 });
}

function loop(timestamp){
  const dt = (timestamp - lastTime)/16;
  lastTime = timestamp;
  gameTime += dt;

  updateShip(dt,keys);
  updateBullets(dt);
  updateAsteroids(dt);
  updateParticles();

  // Collision detection + splitting
  asteroids.forEach((a,ai)=>{
    bullets.forEach((b,bi)=>{
      if(polysCollide(worldVerts(a),[{x:b.x,y:b.y}])){
        createParticles(b.x,b.y,10);
        if(a.size>15){
          const numFragments = 2 + Math.floor(Math.random()*2);
          for(let i=0;i<numFragments;i++){
            const fragSize = a.size/2;
            const frag = createAsteroid(a.x,a.y,fragSize);
            const angle = Math.random()*Math.PI*2;
            const speed = Math.random()*0.3 + 0.1;
            frag.vx += Math.cos(angle)*speed + a.vx;
            frag.vy += Math.sin(angle)*speed + a.vy;
            asteroids.push(frag);
          }
        }
        asteroids.splice(ai,1);
        bullets.splice(bi,1);
      }
    });

    const shipVerts = [
      {x:ship.x+Math.cos(ship.angle)*15, y:ship.y+Math.sin(ship.angle)*15},
      {x:ship.x+Math.cos(ship.angle+2.5)*-10, y:ship.y+Math.sin(ship.angle+2.5)*-10},
      {x:ship.x+Math.cos(ship.angle-2.5)*-10, y:ship.y+Math.sin(ship.angle-2.5)*-10}
    ];
    if(polysCollide(worldVerts(a), shipVerts)) ship.alive=false;
  });

  if(asteroids.length===0) spawnAsteroids(5+Math.floor(Math.random()*5));

  // Ghosting effect: slightly transparent background
  ctx.fillStyle='rgba(0,0,0,0.2)';
  ctx.fillRect(0,0,800,600);

  // Optional subtle screen shake
  let shakeX=0, shakeY=0;
  if(Math.random()<0.01){
    shakeX=(Math.random()-0.5)*4;
    shakeY=(Math.random()-0.5)*4;
  }
  ctx.save();
  ctx.translate(shakeX,shakeY);

  // Draw all game elements
  drawAsteroids(ctx);
  drawShip(ctx);
  drawBullets(ctx);
  drawParticles(ctx);

  ctx.restore();

  // Faint stars
  ctx.fillStyle='white';
  stars.forEach(s=>{
    ctx.fillRect(s.x,s.y,1,1);
    s.y += s.speed*dt;
    if(s.y>600) s.y=0;
  });

  // HUD
  ctx.fillStyle='white';
  ctx.font='16px monospace';
  ctx.fillText(`Fuel: ${ship.fuel.toFixed(1)}`,10,20);
  ctx.fillText(`Time: ${Math.floor(gameTime)}`,10,40);
  if(!ship.alive) ctx.fillText('GAME OVER',400-40,300);

  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
