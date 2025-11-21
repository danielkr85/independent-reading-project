import { ship, updateShip, drawShip, refuelShip } from './ship.js';
import { asteroids, spawnAsteroids, worldVerts, drawAsteroids, updateAsteroids, createAsteroid } from './asteroids.js';
import { bullets, shootBullet, updateBullets, drawBullets } from './bullets.js';
import { particles, createParticles, updateParticles, drawParticles } from './particles.js';
import { polysCollide } from './collision.js';
import { MissionLog } from './missionlog.js';
import { FuelGauge } from './fuel.js';
import { shipDebris, createShipDebris, updateShipDebris, drawShipDebris, createRespawnPieces, updateRespawnPieces, drawRespawnPieces, respawnComplete, clearRespawnPieces } from './shipdebris.js';
import { astrophageClouds, spawnAstrophageClouds, updateAstrophageClouds, drawAstrophageClouds, checkCloudCollision, getCollectedCount, getTotalCloudCount } from './astrophage.js';
import { canisters, spawnCanisters, updateCanisters, drawCanisters, checkCanisterCollision, getCollectedCanisterCount, getTotalCanisterCount, setMissionNumber } from './canister.js';

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
let shipInvulnerable = false;
let shipExplodedAt = 0;
let shipInvulnerableUntil = 0;
let shipRespawnAt = 0;
const RESPAWN_DELAY = 1500; // ms until respawn after crash
const RESPAWN_INVULN = 2000; // ms of invulnerability after respawn
let shipAssembling = false;

// Mission system
let currentMission = 1;
let missionComplete = false;
let transitionAlpha = 0;
let isTransitioning = false;
// New timing + timeScale for slow-down fade
let missionCompleteAt = 0; // timestamp when completion sequence started
const MISSION_COMPLETE_WAIT = 2000; // ms to wait before slowing
const MISSION_SLOW_DURATION = 2000; // ms duration to slow down and fade
const MISSION_FADE_IN_DURATION = 800; // ms duration to fade back in to new mission
let isFadingIn = false;
let fadeInStart = 0;
let timeScale = 1.0; // global movement multiplier (1 = normal, 0 = paused)

// Initialize Fuel Gauge
const fuelGauge = new FuelGauge(ship.maxFuel);

// Project Hail Mary Mission Setup
const missionTargets = 3;
spawnAstrophageClouds(missionTargets);
spawnAsteroids(5);
missionLog.triggerEvent('gameStart', { gameTime: 0 });

// Ensure starting fuel is full
ship.fuel = ship.maxFuel;

// mission requirements
let mission2Requirement = 3;

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
  // Allow updates while mission message is showing if missionComplete so game doesn't fully pause
  if(!missionLog.isDisplayingMessage() || missionComplete) {
    if(!shipAssembling) updateShip(dt * timeScale,keys);
    updateBullets(dt * timeScale);
    updateAsteroids(dt * timeScale);
    updateAstrophageClouds(timeScale);
    updateCanisters(timeScale);
  }
  
  // These always update, even during pause
  updateParticles(timeScale);
  updateShipDebris(timeScale);
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
    // Quick distance check to avoid unnecessary polygon SAT and reduce false positives
    const dx = a.x - ship.x;
    const dy = a.y - ship.y;
    const approxDist2 = dx*dx + dy*dy;
    const approxRadius = (a.size || 30) + 16; // asteroid size + ship approx radius
    if(approxDist2 < approxRadius*approxRadius) {
      if(polysCollide(worldVerts(a), shipVerts) && !shipExploded && !shipInvulnerable) {
        createShipDebris(ship.x, ship.y, ship.angle);
        createParticles(ship.x, ship.y, 50);
        ship.alive=false;
        shipExploded = true;
        shipExplodedAt = timestamp;
      }
    }
    
  });

  // Check cloud collection
  if(ship.alive && currentMission === 1) {
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
        console.log('MISSION 1 COMPLETE!');
        missionComplete = true;
        missionLog.queueMessage('mission_complete', `MISSION 1 COMPLETE! Preparing Mission 2...`, 300);
        // mark mission completion timestamp (will be set when pause clears below)
        missionCompleteAt = 0;
        // make ship invulnerable immediately so game doesn't punish player during message/transition
        shipInvulnerable = true;
        // ensure ship is alive and clear any debris so player doesn't die during transition
        ship.alive = true;
        shipExploded = false;
        shipDebris.length = 0;
        particles.length = 0;
      }
    }
  }

  // Mission completion sequence: wait, then slow & fade, then reset
  if(missionComplete && !missionLog.isDisplayingMessage()) {
    if(!missionCompleteAt) missionCompleteAt = timestamp;
  } else {
    // Clear any pending completion timestamp if mission not complete
    if(!missionComplete) missionCompleteAt = 0;
  }

  if(missionCompleteAt) {
    const elapsed = timestamp - missionCompleteAt;

    if(elapsed < MISSION_COMPLETE_WAIT) {
      // still waiting - do nothing special
    } else if(elapsed < MISSION_COMPLETE_WAIT + MISSION_SLOW_DURATION) {
      // slow down and fade over MISSION_SLOW_DURATION
      const t = (elapsed - MISSION_COMPLETE_WAIT) / MISSION_SLOW_DURATION; // 0..1
      // ease linear
      timeScale = Math.max(0, 1 - t);
      transitionAlpha = Math.min(1, t);
    } else {
      // sequence complete - perform reset and start next mission (screen currently black)
        const nextMission = currentMission + 1;
        currentMission = nextMission;
        setMissionNumber(nextMission);
        missionComplete = false;
        missionCompleteAt = 0;

        // Reset ship position for new mission
        ship.x = 400;
        ship.y = 480;
        ship.vx = 0;
        ship.vy = 0;
        ship.angle = -Math.PI / 2;
      ship.alive = true;
      shipExploded = false;

        // Clear world state for clean start
        astrophageClouds.length = 0;
        canisters.length = 0;
        bullets.length = 0;
        particles.length = 0;
        shipDebris.length = 0;

        // Setup next mission specifics
        if (nextMission === 2) {
          missionLog.queueMessage('mission2_start', `Mission 2: Receive alien canisters - dodge asteroids`, 240);
          spawnCanisters(mission2Requirement);
          spawnAsteroids(8);
        } else if (nextMission === 3) {
          missionLog.queueMessage('mission3_start', `Mission 3: Free play`, 240);
          // Base game: no astrophage, no canisters. Keep some asteroids for gameplay.
          spawnAsteroids(5);
        } else {
          // Default fallback
          spawnAsteroids(5);
        }

        // Reset fuel reserves at the start of each mission
        ship.fuel = ship.maxFuel;

        // restore defaults and start a short fade-in so mission doesn't cut instantly
        timeScale = 1.0;
        transitionAlpha = 1.0; // start fully black and fade in
        isFadingIn = true;
        fadeInStart = timestamp;
        // clear invulnerability now that next mission will begin
        shipInvulnerable = false;
    }
  }

  // Handle fade-in after reset
  if(isFadingIn) {
    const fadeElapsed = timestamp - fadeInStart;
    if(fadeElapsed >= MISSION_FADE_IN_DURATION) {
      transitionAlpha = 0;
      isFadingIn = false;
      // fade-in finished: clear invulnerability so player can be damaged again
      shipInvulnerable = false;
    } else {
      transitionAlpha = Math.max(0, 1 - (fadeElapsed / MISSION_FADE_IN_DURATION));
    }
  }

  // Clear temporary invulnerability after respawn if time expired
  if (shipInvulnerableUntil && timestamp >= shipInvulnerableUntil) {
    shipInvulnerable = false;
    shipInvulnerableUntil = 0;
  }

  // Handle respawn after crash
  if (shipExploded && shipExplodedAt) {
    if (timestamp - shipExplodedAt >= RESPAWN_DELAY) {
      // Instant respawn with glow/fade-in effect
      shipDebris.length = 0;
      particles.length = 0;
      ship.alive = true;
      shipExploded = false;
      ship.x = 400;
      ship.y = 480;
      ship.vx = 0;
      ship.vy = 0;
      ship.angle = -Math.PI/2;
      // Invulnerability with visual fade-in
      shipInvulnerable = true;
      shipInvulnerableUntil = timestamp + RESPAWN_INVULN;
      shipAssembling = false;
      shipExplodedAt = 0;
      // Track respawn time for glow/fade effect
      shipRespawnAt = timestamp;
    }
  }

  // Check canister collection (Mission 2)
  if(ship.alive && currentMission === 2) {
    const collectedCanister = checkCanisterCollision(ship.x, ship.y);
    if(collectedCanister) {
      console.log('Canister collected!');
      refuelShip(25);
      
      const collected = getCollectedCanisterCount();
      missionLog.queueBottomMessage(`Canister received! (${collected}/${mission2Requirement})`);
      
      // Check if mission 2 complete (requirement based)
      if(collected >= mission2Requirement) {
        console.log('MISSION 2 COMPLETE!');
        missionComplete = true;
        missionLog.queueMessage('mission2_complete', `MISSION 2 COMPLETE! All canisters received!`, 300);
        // Make ship invulnerable during the completion sequence to avoid dying while transitioning
        shipInvulnerable = true;
        // ensure ship is alive and clear debris
        ship.alive = true;
        shipExploded = false;
        shipDebris.length = 0;
        particles.length = 0;
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

  // removed global game-over; crashes now respawn the player on the current mission

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
  drawCanisters(ctx);
  if(ship.alive) {
    drawShip(ctx);
    // Draw fancy glow/fade effect during respawn
    if (shipRespawnAt > 0) {
      const respawnElapsed = timestamp - shipRespawnAt;
      const respawnDuration = 800; // ms for glow/fade to complete
      if (respawnElapsed < respawnDuration) {
        const progress = respawnElapsed / respawnDuration;
        const glowAlpha = Math.max(0, 1 - progress);
        
        ctx.save();
        
        // Outer expanding ring (cyan)
        const ringSize = 20 + progress * 60;
        ctx.globalAlpha = glowAlpha * 0.5;
        ctx.strokeStyle = 'cyan';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(ship.x, ship.y, ringSize, 0, Math.PI * 2);
        ctx.stroke();
        
        // Middle pulsing ring (magenta)
        const pulse = Math.sin(progress * Math.PI * 3) * 0.5 + 0.5;
        ctx.globalAlpha = glowAlpha * pulse * 0.6;
        ctx.strokeStyle = 'magenta';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(ship.x, ship.y, 30 + pulse * 10, 0, Math.PI * 2);
        ctx.stroke();
        
        // Inner glow (bright cyan/white)
        ctx.globalAlpha = glowAlpha * 0.7;
        ctx.fillStyle = 'cyan';
        ctx.beginPath();
        ctx.arc(ship.x, ship.y, 35 - progress * 15, 0, Math.PI * 2);
        ctx.fill();
        
        // Radial spikes
        ctx.globalAlpha = glowAlpha * 0.4;
        ctx.strokeStyle = 'rgba(255, 200, 255, 0.8)';
        ctx.lineWidth = 1;
        for (let i = 0; i < 8; i++) {
          const angle = (i / 8) * Math.PI * 2 + progress * Math.PI;
          const innerRad = 15;
          const outerRad = 40 + progress * 30;
          ctx.beginPath();
          ctx.moveTo(
            ship.x + Math.cos(angle) * innerRad,
            ship.y + Math.sin(angle) * innerRad
          );
          ctx.lineTo(
            ship.x + Math.cos(angle) * outerRad,
            ship.y + Math.sin(angle) * outerRad
          );
          ctx.stroke();
        }
        
        ctx.restore();
      } else {
        shipRespawnAt = 0;
      }
    }
  }
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
    s.y += s.speed*dt*timeScale;
    if(s.y>600) s.y=0;
  });

  // HUD
  ctx.fillStyle='white';
  ctx.font='16px monospace';

  // Draw fuel gauge
  fuelGauge.draw(ctx, ship.fuel, canvas.width, canvas.height);

  // UI indicators: centered horizontally near bottom; text labels removed
  const hudPadding = 12;
  const hudY = canvas.height - hudPadding - 12;

  if (currentMission === 1) {
    const collected = getCollectedCount();
    const total = missionTargets;
    const spacing = 28;
    const startX = Math.round(canvas.width / 2 - ((total - 1) * spacing) / 2);

    for (let i = 0; i < total; i++) {
      const ix = startX + i * spacing;
      const iy = hudY;
      ctx.beginPath();
      ctx.arc(ix, iy, 7, 0, Math.PI * 2);
      ctx.fillStyle = i < collected ? 'cyan' : 'rgba(0,200,200,0.18)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,200,200,0.6)';
      ctx.stroke();
    }
  }

  if (currentMission === 2) {
    const collected = getCollectedCanisterCount();
    const total = mission2Requirement;
    const spacing = 36;
    const startX = Math.round(canvas.width / 2 - ((total - 1) * spacing) / 2);

    for (let i = 0; i < total; i++) {
      const ix = startX + i * spacing;
      const iy = hudY - 6;
      // draw a more detailed canister icon: body + caps + stripe + glow when collected
      // body
      ctx.fillStyle = i < collected ? '#8b5dd1' : 'rgba(120,80,130,0.18)';
      roundRect(ctx, ix - 10, iy, 20, 24, 3, true, false);
      // top cap
      ctx.fillStyle = i < collected ? '#9d78e3' : 'rgba(200,160,220,0.12)';
      ctx.beginPath();
      ctx.ellipse(ix, iy, 8, 4, 0, Math.PI, 0);
      ctx.fill();
      // bottom cap
      ctx.beginPath();
      ctx.ellipse(ix, iy + 24, 8, 4, 0, 0, Math.PI);
      ctx.fill();
      // stripe
      ctx.fillStyle = i < collected ? '#ffd7ff' : 'rgba(255,255,255,0.12)';
      ctx.fillRect(ix - 6, iy + 8, 12, 4);
      // outline
      ctx.strokeStyle = 'rgba(255,255,255,0.16)';
      ctx.strokeRect(ix - 10, iy, 20, 24);
      // glow pulse when newly collected
      if (i < collected) {
        ctx.fillStyle = 'rgba(200,150,255,0.12)';
        ctx.beginPath();
        ctx.ellipse(ix, iy + 12, 16, 10, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // Draw transition fade (draw when alpha > 0)
  if(transitionAlpha > 0) {
    ctx.fillStyle = `rgba(0, 0, 0, ${transitionAlpha})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  requestAnimationFrame(loop);
}

  // Helper: rounded rectangle
  function roundRect(ctx, x, y, w, h, r, fill, stroke) {
    if (typeof r === 'undefined') r = 5;
    if (typeof fill === 'undefined') fill = true;
    if (typeof stroke === 'undefined') stroke = false;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
    if (fill) ctx.fill();
    if (stroke) ctx.stroke();
  }

  requestAnimationFrame(loop);
