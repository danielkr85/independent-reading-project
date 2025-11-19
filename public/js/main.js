import { ship, updateShip, drawShip, refuelShip } from './ship.js';
import { asteroids, spawnAsteroids, worldVerts, drawAsteroids, updateAsteroids, createAsteroid } from './asteroids.js';
import { bullets, shootBullet, updateBullets, drawBullets } from './bullets.js';
import { particles, createParticles, updateParticles, drawParticles } from './particles.js';
import { polysCollide } from './collision.js';
import { MissionLog } from './missionlog.js';
import { FuelGauge } from './fuel.js';
import { shipDebris, createShipDebris, updateShipDebris, drawShipDebris } from './shipdebris.js';
import { astrophageClouds, spawnAstrophageClouds, updateAstrophageClouds, drawAstrophageClouds, checkCloudCollision, getCollectedCount, getTotalCloudCount } from './astrophage.js';

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Initialize Mission Log
const missionLog = new MissionLog();
await missionLog.loadEvents();

let keys = {};
document.addEventListener('keydown', e => keys[e.key] = true);
document.addEventListener('keyup', e => keys[e.key] = false);
document.addEventListener('keydown', e => { if(e.key===' '&&ship.alive) shootBullet(ship); });

let lastTime=0;
let gameTime=0;
let asteroidsDestroyed = 0;
let previousAsteroidCount = 0;
let shipExploded = false;

// Initialize Fuel Gauge
const fuelGauge = new FuelGauge(ship.maxFuel);

// Project Hail Mary Mission Setup
const missionTargets = 3;
spawnAstrophageClouds(missionTargets);
spawnAsteroids(5);
missionLog.triggerEvent('gameStart', { gameTime: 0 });

// Initialize faint stars
const stars = [];
for(let i=0;i<50;i++){
  stars.push({ x: Math.random()*800, y: Math.random()*600, speed: Math.random()*0.3+0.1 });
}

function loop(timestamp){
  const dt = (timestamp - lastTime)/16;
  lastTime = timestamp;
  gameTime += dt;

  // Only update game if mission text is not displaying
  if(!missionLog.isDisplayingMessage()) {
    updateShip(dt,keys);
    updateBullets(dt);
    updateAsteroids(dt);
    updateAstrophageClouds();
  }
  
  // These always update, even during pause
  updateParticles();
  updateShipDebris();
  missionLog.update();
  missionLog.updateBottomMessages();

  // Collision detection + splitting
  asteroids.forEach((a,ai)=>{
    bullets.forEach((b,bi)=>{
      if(polysCollide(worldVerts(a),[{x:b.x,y:b.y}])){
        createParticles(b.x,b.y,10);
        asteroidsDestroyed++;
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
    if(polysCollide(worldVerts(a), shipVerts) && !shipExploded) {
      createShipDebris(ship.x, ship.y, ship.angle);
      createParticles(ship.x, ship.y, 50);
      ship.alive=false;
      shipExploded = true;
    }
  });

  // Check cloud collection
  if(ship.alive) {
    const collectedCloud = checkCloudCollision(ship.x, ship.y);
    if(collectedCloud) {
      console.log('Cloud collected! Adding fuel...');
      refuelShip(30);
      console.log('Current fuel:', ship.fuel);
      
      const collected = getCollectedCount();
      const total = getTotalCloudCount();
      missionLog.queueBottomMessage(`Sample collected! (${collected}/${total})`);
      
      // Check if mission complete
      if(collected === missionTargets) {
        console.log('MISSION COMPLETE!');
        missionLog.queueMessage('mission_complete', `MISSION COMPLETE! All ${missionTargets} samples collected!`, 300);
      }
    }
  }

  // Check for wave clears and asteroid spawns
  if(asteroids.length===0 && previousAsteroidCount > 0) {
    missionLog.triggerEvent('waveClear', { asteroidCount: asteroids.length });
    spawnAsteroids(5+Math.floor(Math.random()*5));
    missionLog.triggerEvent('asteroidSpawn', { asteroidCount: asteroids.length });
  } else if(previousAsteroidCount === 0 && asteroids.length > 0) {
    missionLog.triggerEvent('asteroidSpawn', { asteroidCount: asteroids.length });
  }
  previousAsteroidCount = asteroids.length;

  // Trigger low fuel warning
  if(ship.fuel < 5 && ship.fuel > 0) {
    missionLog.triggerEvent('lowFuel', { fuel: ship.fuel });
  }

  // Trigger game over
  if(!ship.alive) {
    missionLog.triggerEvent('gameOver', { gameTime: gameTime });
  }

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
  drawAstrophageClouds(ctx);
  if(ship.alive) drawShip(ctx);
  drawBullets(ctx);
  drawParticles(ctx);
  drawShipDebris(ctx);
  
  // Draw mission log
  missionLog.draw(ctx, canvas.width, canvas.height);

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
  ctx.fillText(`Time: ${Math.floor(gameTime)}`,10,40);

  // Draw fuel gauge
  fuelGauge.draw(ctx, ship.fuel, canvas.width, canvas.height);

  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
