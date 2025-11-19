// Ship Debris System
// Creates fractured ship pieces that explode on collision

export const shipDebris = [];

export function createShipDebris(shipX, shipY, shipAngle) {
  const debrisCount = 8;
  
  // Create debris pieces
  for (let i = 0; i < debrisCount; i++) {
    const angle = (Math.PI * 2 * i) / debrisCount + (Math.random() - 0.5) * 0.5;
    const speed = Math.random() * 0.8 + 0.4;
    
    shipDebris.push({
      x: shipX,
      y: shipY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.3,
      life: Math.random() * 60 + 80,
      maxLife: 140,
      size: Math.random() * 3 + 2,
      type: i % 3 // Different piece types for variety
    });
  }
}

export function updateShipDebris() {
  shipDebris.forEach((debris, i) => {
    debris.x += debris.vx;
    debris.y += debris.vy;
    debris.rotation += debris.rotationSpeed;
    debris.life--;
    
    // Wraparound
    if (debris.x > 800) debris.x = 0;
    if (debris.x < 0) debris.x = 800;
    if (debris.y > 600) debris.y = 0;
    if (debris.y < 0) debris.y = 600;
    
    // Remove when life expires
    if (debris.life <= 0) shipDebris.splice(i, 1);
  });
}

export function drawShipDebris(ctx) {
  shipDebris.forEach(debris => {
    const alpha = Math.max(0, debris.life / debris.maxLife);
    
    ctx.save();
    ctx.translate(debris.x, debris.y);
    ctx.rotate(debris.rotation);
    ctx.globalAlpha = alpha;
    
    // Draw different piece types
    switch (debris.type) {
      case 0: // Front point
        ctx.strokeStyle = '#ffff00';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(debris.size * 2, 0);
        ctx.lineTo(-debris.size, -debris.size);
        ctx.lineTo(-debris.size * 0.5, 0);
        ctx.lineTo(-debris.size, debris.size);
        ctx.closePath();
        ctx.stroke();
        break;
      
      case 1: // Side wing piece
        ctx.strokeStyle = '#00ffff';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(0, -debris.size);
        ctx.lineTo(debris.size * 1.5, 0);
        ctx.lineTo(0, debris.size);
        ctx.lineTo(-debris.size, debris.size * 0.5);
        ctx.closePath();
        ctx.stroke();
        break;
      
      case 2: // Random shard
        ctx.fillStyle = `rgba(255, 100, 0, ${alpha})`;
        ctx.beginPath();
        ctx.arc(0, 0, debris.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ff6600';
        ctx.lineWidth = 1;
        ctx.stroke();
        break;
    }
    
    ctx.restore();
  });
}
