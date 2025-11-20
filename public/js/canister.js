// Alien Canister System
// Canisters from an intelligent alien race that the player must collect

export const canisters = [];
let canisteIdCounter = 0;
let nextCanisterSpawnTime = 0;
let currentMissionNumber = 1;

export function createCanister(x, y) {
  canisters.push({
    id: canisteIdCounter++,
    x: x,
    y: y,
    vx: (Math.random() - 0.5) * 0.12,
    vy: 0.25,
    radius: 12,
    collected: false,
    rotation: 0,
    rotationSpeed: Math.random() * 0.03 + 0.02,
    age: 0,
    spinAxisAngle: Math.random() * Math.PI * 2 // Which axis it's spinning on
  });
  nextCanisterSpawnTime = Date.now() + 15000; // Next canister in 15 seconds
  return canisters[canisters.length - 1];
}

export function spawnCanisters(count = 3) {
  // Remove old canisters
  canisters.length = 0;
  canisteIdCounter = 0;
  nextCanisterSpawnTime = 0;
  
  // Spawn first canister immediately
  if (count > 0) {
    createCanister(400, -30);
  }
}

export function setMissionNumber(mission) {
  currentMissionNumber = mission;
}

export function updateCanisters() {
  canisters.forEach((canister, i) => {
    // Drift movement (comes down from top)
    canister.x += canister.vx;
    canister.y += canister.vy;
    
    // Rotation (much slower now)
    canister.rotation += canister.rotationSpeed;
    canister.age++;
    
    // Wraparound
    if (canister.x > 800) canister.x = 0;
    if (canister.x < 0) canister.x = 800;
    if (canister.y > 600) canister.y = 0;
  });
  
  // Only auto-spawn canisters during Mission 2
  if (currentMissionNumber === 2) {
    const uncollectedCount = canisters.filter(c => !c.collected).length;
    const totalSpawned = canisters.length;
    
    if (totalSpawned < 3 && uncollectedCount === 0) {
      // All existing canisters collected, spawn next one
      createCanister(400, -30);
    } else if (totalSpawned < 3 && Date.now() > nextCanisterSpawnTime) {
      // 15 seconds passed, spawn next one anyway
      createCanister(400, -30);
    }
  }
}

export function drawCanisters(ctx) {
  canisters.forEach(canister => {
    ctx.save();
    ctx.translate(canister.x, canister.y);
    
    if (canister.collected) {
      ctx.globalAlpha = 0.2;
    }
    
    // Pulse effect
    const pulse = Math.sin(canister.age * 0.05) * 0.15 + 1;
    const radius = canister.radius * pulse;
    
    // Glow around canister
    ctx.fillStyle = `rgba(200, 100, 255, ${0.3 * (canister.collected ? 0.3 : 1)})`;
    ctx.beginPath();
    ctx.arc(0, 0, radius + 8, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw cylinder spinning
    // Rotate based on the axis
    ctx.rotate(canister.rotation);
    ctx.rotate(canister.spinAxisAngle);
    
    // Cylinder body (3D-like view)
    ctx.fillStyle = `rgba(180, 100, 255, ${0.8 * (canister.collected ? 0.3 : 1)})`;
    ctx.fillRect(-8, -radius, 16, radius * 2);
    
    // Cylinder ends (caps)
    ctx.fillStyle = `rgba(220, 150, 255, ${0.9 * (canister.collected ? 0.3 : 1)})`;
    ctx.beginPath();
    ctx.ellipse(-0, -radius, 8, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.beginPath();
    ctx.ellipse(0, radius, 8, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Highlight stripe
    ctx.strokeStyle = `rgba(255, 200, 255, ${0.7 * (canister.collected ? 0.3 : 1)})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-6, -radius * 0.5);
    ctx.lineTo(6, -radius * 0.5);
    ctx.stroke();
    
    // Label when not collected
    if (!canister.collected) {
      ctx.rotate(-canister.spinAxisAngle);
      ctx.rotate(-canister.rotation);
      ctx.fillStyle = '#ff00ff';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('CANISTER', 0, -radius - 15);
    }
    
    ctx.restore();
  });
}

export function checkCanisterCollision(shipX, shipY) {
  let collected = null;
  
  canisters.forEach(canister => {
    if (!canister.collected) {
      const dx = shipX - canister.x;
      const dy = shipY - canister.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < canister.radius + 20) {
        canister.collected = true;
        collected = canister;
      }
    }
  });
  
  return collected;
}

export function getCollectedCanisterCount() {
  return canisters.filter(c => c.collected).length;
}

export function getTotalCanisterCount() {
  return canisters.length;
}
