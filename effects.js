/* Original glass optics and rain. No network requests or third-party runtime. */
(()=>{
  'use strict';
  const canvas = document.getElementById('rain');
  const context = canvas.getContext('2d');
  const scene = document.createElement('canvas');
  const sceneContext = scene.getContext('2d');
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  const lessTransparency = matchMedia('(prefers-reduced-transparency: reduce)');
  const moreContrast = matchMedia('(prefers-contrast: more)');
  let photo = document.querySelector('#wallpaper img');
  let width=0, height=0, ratio=1, drops=[], rainFrame=0, previousTime=0, resizeTimer=0;
  let suspended=false, spawn=0;

  /* A neutral centre and curved edge normals refract only the lens perimeter. */
  function createLens(){
    const map=document.createElement('canvas');
    map.width=256; map.height=128;
    const ctx=map.getContext('2d');
    if(!ctx) return;
    const pixels=ctx.createImageData(map.width,map.height), radius=42;
    for(let y=0;y<map.height;y++) for(let x=0;x<map.width;x++){
      const px=x-127.5, py=y-63.5;
      const qx=Math.abs(px)-(128-radius), qy=Math.abs(py)-(64-radius);
      const ox=Math.max(qx,0), oy=Math.max(qy,0), length=Math.hypot(ox,oy);
      const depth=radius-(length+Math.min(Math.max(qx,qy),0));
      const bend=depth>=0 && depth<22 ? Math.pow(1-depth/22,1.8)*112 : 0;
      const nx=length ? ox/length : qx>qy?1:0;
      const ny=length ? oy/length : qy>=qx?1:0;
      const i=(y*map.width+x)*4;
      pixels.data[i]=128+Math.sign(px)*nx*bend;
      pixels.data[i+1]=128+Math.sign(py)*ny*bend;
      pixels.data[i+2]=128; pixels.data[i+3]=255;
    }
    ctx.putImageData(pixels,0,0);
    document.getElementById('glass-map').setAttribute('href',map.toDataURL());
    document.documentElement.dataset.glass='ready';
  }
  createLens();

  const springs=new Map();
  let springFrame=0, active=null, illuminated=null;
  const controls='.blk,.iconbtn,.tabs button,.picker button,.nav-w,.day-switch button';
  const surfaces='.masthead-in,.sec,.chead,.box,.dayrow,.weekbar,.tabs';
  function canMove(){ return motionEnabled() && !document.hidden && !suspended; }
  function resetSprings(){
    cancelAnimationFrame(springFrame); springFrame=0;
    springs.forEach((state,element)=>{
      ['--pull-x','--pull-y','--stretch-x','--stretch-y'].forEach(key=>element.style.removeProperty(key));
    });
    springs.clear(); active=null;
    if(illuminated){ illuminated.style.removeProperty('--light-x'); illuminated.style.removeProperty('--light-y'); }
    illuminated=null;
  }
  function animateSprings(){
    springFrame=0;
    if(!canMove() || !finePointer.matches){ resetSprings(); return; }
    let pending=false;
    springs.forEach((state,element)=>{
      if(!element.isConnected){ springs.delete(element); return; }
      let moving=false;
      for(const key of ['x','y','s']){
        state.velocity[key]=(state.velocity[key]+(state.target[key]-state.value[key])*.16)*.7;
        state.value[key]+=state.velocity[key];
        if(Math.abs(state.target[key]-state.value[key])>.001 || Math.abs(state.velocity[key])>.001) moving=true;
      }
      element.style.setProperty('--pull-x',state.value.x.toFixed(3)+'px');
      element.style.setProperty('--pull-y',state.value.y.toFixed(3)+'px');
      element.style.setProperty('--stretch-x',(1+state.value.s).toFixed(4));
      element.style.setProperty('--stretch-y',(1-state.value.s*.45).toFixed(4));
      if(moving) pending=true;
      else if(element!==active){
        ['--pull-x','--pull-y','--stretch-x','--stretch-y'].forEach(key=>element.style.removeProperty(key));
        springs.delete(element);
      }
    });
    if(pending) springFrame=requestAnimationFrame(animateSprings);
  }
  function aim(element,x,y,s){
    if(!element) return;
    let state=springs.get(element);
    if(!state){ state={value:{x:0,y:0,s:0},velocity:{x:0,y:0,s:0},target:{x,y,s}}; springs.set(element,state); }
    state.target={x,y,s};
    if(!springFrame) springFrame=requestAnimationFrame(animateSprings);
  }
  document.addEventListener('pointermove',event=>{
    if(!canMove() || !finePointer.matches || event.pointerType==='touch') return;
    const element=event.target.closest(controls);
    if(active!==element){ aim(active,0,0,0); active=element; }
    if(element && !element.disabled){
      const rect=element.getBoundingClientRect();
      const x=(event.clientX-rect.left)/rect.width-.5, y=(event.clientY-rect.top)/rect.height-.5;
      aim(element,x*7,y*6,.028);
    }
    const surface=event.target.closest(surfaces);
    if(surface){
      if(illuminated && illuminated!==surface){ illuminated.style.removeProperty('--light-x'); illuminated.style.removeProperty('--light-y'); }
      illuminated=surface;
      const rect=surface.getBoundingClientRect();
      surface.style.setProperty('--light-x',((event.clientX-rect.left)/rect.width*100).toFixed(1)+'%');
      surface.style.setProperty('--light-y',((event.clientY-rect.top)/rect.height*100).toFixed(1)+'%');
    }
  },{passive:true});
  document.addEventListener('pointerout',event=>{
    if(active && (!event.relatedTarget || !active.contains(event.relatedTarget))){ aim(active,0,0,0); active=null; }
  },{passive:true});
  document.addEventListener('pointerdown',()=>{ if(active && canMove()) aim(active,0,1,-.045); },{passive:true});
  document.addEventListener('pointerup',()=>{ if(active && canMove()) aim(active,0,0,.028); },{passive:true});
  window.addEventListener('blur',resetSprings);
  window.addEventListener('scroll',resetSprings,{passive:true});

  function newDrop(anywhere=false){
    const running=Math.random()<.24;
    return {x:Math.random()*width,y:anywhere || !running?Math.random()*height:-25,r:running?6+Math.random()*7:1.5+Math.random()*3,
      speed:running?18+Math.random()*36:0,phase:Math.random()*Math.PI*2,tail:0};
  }
  function resizeRain(){
    if(!context || !sceneContext) return;
    width=innerWidth; height=innerHeight;
    ratio=Math.min(devicePixelRatio||1,1.5,2560/Math.max(width,height));
    canvas.width=scene.width=Math.round(width*ratio);
    canvas.height=scene.height=Math.round(height*ratio);
    context.setTransform(ratio,0,0,ratio,0,0);
    if(photo && photo.naturalWidth){
      const scale=Math.max(scene.width/photo.naturalWidth,scene.height/photo.naturalHeight);
      const w=photo.naturalWidth*scale,h=photo.naturalHeight*scale;
      sceneContext.clearRect(0,0,scene.width,scene.height);
      sceneContext.drawImage(photo,(scene.width-w)/2,(scene.height-h)/2,w,h);
    }
    const count=Math.min(110,Math.max(32,Math.round(width*height/13000)));
    drops=Array.from({length:count},()=>newDrop(true));
    refresh();
  }
  function drawDrop(drop){
    const {x,y,r,speed}=drop, tall=r*(1+Math.min(speed/260,.45));
    if(drop.tail>0){
      const trail=context.createLinearGradient(x,y-drop.tail,x,y);
      trail.addColorStop(0,'rgba(220,239,255,0)'); trail.addColorStop(1,'rgba(220,239,255,.12)');
      context.strokeStyle=trail; context.lineWidth=Math.max(1,r*.3);
      context.beginPath(); context.moveTo(x,y-drop.tail); context.lineTo(x,y); context.stroke();
    }
    context.save();
    context.beginPath(); context.ellipse(x,y,r,tall,0,0,Math.PI*2); context.clip();
    /* The clear, enlarged image inside each drop contrasts with the misted window. */
    context.drawImage(scene,(x-r/1.65)*ratio,(y-tall/1.65)*ratio,r*2/1.65*ratio,tall*2/1.65*ratio,x-r,y-tall,r*2,tall*2);
    const shade=context.createLinearGradient(x-r,y-tall,x+r,y+tall);
    shade.addColorStop(0,'rgba(255,255,255,.24)'); shade.addColorStop(.4,'rgba(255,255,255,0)'); shade.addColorStop(1,'rgba(2,12,22,.32)');
    context.fillStyle=shade; context.fillRect(x-r,y-tall,r*2,tall*2);
    context.restore();
    context.lineWidth=.7; context.strokeStyle='rgba(238,249,255,.66)';
    context.beginPath(); context.ellipse(x,y,r*.85,tall*.9,0,Math.PI*1.08,Math.PI*1.78); context.stroke();
    context.strokeStyle='rgba(1,13,24,.24)';
    context.beginPath(); context.ellipse(x,y,r,tall,0,.1,Math.PI*.9); context.stroke();
  }
  function drawRain(dt){
    context.clearRect(0,0,width,height);
    if(dt){
      spawn+=dt;
      if(spawn>.24){ spawn=0; drops.push(newDrop()); }
      for(const drop of drops){
        if(drop.speed){
          drop.speed=Math.min(110,drop.speed+dt*5);
          drop.y+=drop.speed*dt; drop.x+=Math.sin(drop.y*.025+drop.phase)*dt*2;
          drop.tail=Math.min(65,drop.tail+drop.speed*dt);
        }
      }
      /* Moving drops collect smaller beads; limits keep the work bounded. */
      for(let i=0;i<drops.length;i++){
        const a=drops[i]; if(!a.speed || !a.r) continue;
        for(let j=i+1;j<drops.length;j++){
          const b=drops[j]; if(!b.r || Math.abs(a.y-b.y)>a.r+b.r) continue;
          if(Math.hypot(a.x-b.x,a.y-b.y)<(a.r+b.r)*.7){ a.r=Math.min(17,Math.sqrt(a.r*a.r+b.r*b.r)); a.speed+=8; b.r=0; }
        }
      }
      drops=drops.filter(drop=>drop.r && drop.y<height+30).slice(-120);
    }
    drops.forEach(drawDrop);
  }
  function animateRain(time){
    rainFrame=0;
    if(!canMove() || canvas.hidden) return;
    if(!previousTime || time-previousTime>=1000/30){
      drawRain(previousTime?Math.min((time-previousTime)/1000,.06):0);
      previousTime=time;
    }
    rainFrame=requestAnimationFrame(animateRain);
  }
  function refresh(){
    cancelAnimationFrame(rainFrame); rainFrame=0; previousTime=0;
    if(!canMove()) resetSprings();
    canvas.hidden=!(context && sceneContext && photo && photo.naturalWidth && RAIN && !lessTransparency.matches && !moreContrast.matches);
    if(canvas.hidden || document.hidden || suspended) return;
    drawRain(0);
    if(canMove()) rainFrame=requestAnimationFrame(animateRain);
  }
  window.addEventListener('wallpaperchange',event=>{ photo=event.detail; resizeRain(); });
  window.addEventListener('ambiencechange',refresh);
  window.addEventListener('resize',()=>{ resetSprings(); clearTimeout(resizeTimer); resizeTimer=setTimeout(resizeRain,160); });
  document.addEventListener('visibilitychange',refresh);
  for(const preference of [lessTransparency,moreContrast,finePointer]) preference.addEventListener('change',()=>{ resetSprings(); refresh(); });
  window.addEventListener('beforeprint',()=>{ suspended=true; refresh(); });
  window.addEventListener('afterprint',()=>{ suspended=false; refresh(); });
  window.addEventListener('pagehide',()=>{ suspended=true; refresh(); });
  window.addEventListener('pageshow',()=>{ suspended=false; refresh(); });
  resizeRain();
})();
