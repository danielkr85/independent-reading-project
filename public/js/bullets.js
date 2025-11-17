export const bullets = [];

export function shootBullet(ship){
  bullets.push({
    x: ship.x,
    y: ship.y,
    vx: ship.vx + Math.cos(ship.angle)*1.0,
    vy: ship.vy + Math.sin(ship.angle)*1.0,
    life: 200,
    trail: []
  });
}

export function updateBullets(dt){
  bullets.forEach((b,i)=>{
    b.x += b.vx * dt;
    b.y += b.vy * dt;

    b.trail.push({x:b.x,y:b.y});
    if(b.trail.length>5) b.trail.shift();

    // Wraparound
    if(b.x > 800) b.x = 0;
    if(b.x < 0) b.x = 800;
    if(b.y > 600) b.y = 0;
    if(b.y < 0) b.y = 600;

    b.life -= dt;
    if(b.life <= 0) bullets.splice(i,1);
  });
}

export function drawBullets(ctx){
  ctx.strokeStyle='white';
  ctx.lineWidth=1;
  bullets.forEach(b=>{
    // draw trail
    ctx.beginPath();
    b.trail.forEach((p,i)=>{
      if(i===0) ctx.moveTo(p.x,p.y);
      else ctx.lineTo(p.x,p.y);
    });
    ctx.stroke();

    // draw main bullet
    ctx.fillRect(b.x-1,b.y-1,2,2);

    // ghost wrap copies for edge
    const offsets = [-800,0,800];
    offsets.forEach(ox=>{
      offsets.forEach(oy=>{
        if(ox!==0 || oy!==0){
          ctx.fillRect(b.x-1+ox,b.y-1+oy,2,2);
          ctx.beginPath();
          b.trail.forEach((p,i)=>{
            if(i===0) ctx.moveTo(p.x+ox,p.y+oy);
            else ctx.lineTo(p.x+ox,p.y+oy);
          });
          ctx.stroke();
        }
      });
    });
  });
}
