/* Glass optics and integration with the supplied raindrops renderer. */
(()=>{
  'use strict';
  const rainLayer = document.getElementById('rain');
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  const lessTransparency = matchMedia('(prefers-reduced-transparency: reduce)');
  const moreContrast = matchMedia('(prefers-contrast: more)');
  let photo = document.querySelector('#wallpaper img');
  let rainFrame=null, rainDimensions='', resizeTimer=0, suspended=false, rainFailed=false;

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

  function sendRainState(){
    rainFrame?.contentWindow.postMessage({type:'rain-state',running:canMove(),image:photo?.src},'*');
  }
  function rainSize(){
    const dpr=Math.max(1,Math.min(2,window.devicePixelRatio||1));
    return rainLayer.clientWidth+'x'+rainLayer.clientHeight+'@'+dpr;
  }
  function removeRain(){
    rainFrame?.remove();
    rainFrame=null;
    rainDimensions='';
    rainLayer.hidden=true;
  }
  function refresh(){
    if(!canMove()) resetSprings();
    const show=RAIN && photo?.naturalWidth && !lessTransparency.matches && !moreContrast.matches && !rainFailed;
    if(!show){ removeRain(); return; }
    rainLayer.hidden=false;
    if(!rainFrame){
      rainFrame=document.createElement('iframe');
      rainFrame.title='Rain on glass';
      rainFrame.tabIndex=-1;
      rainFrame.setAttribute('sandbox','allow-scripts');
      rainFrame.setAttribute('aria-hidden','true');
      rainFrame.src='rain.html';
      rainLayer.replaceChildren(rainFrame);
      rainDimensions=rainSize();
    }
    sendRainState();
  }
  window.addEventListener('message',event=>{
    if(!rainFrame || event.source!==rainFrame.contentWindow) return;
    if(event.data?.type==='rain-ready') sendRainState();
    if(event.data?.type==='rain-error'){ rainFailed=true; removeRain(); }
  });
  window.addEventListener('wallpaperchange',event=>{ photo=event.detail; rainFailed=false; refresh(); });
  window.addEventListener('ambiencechange',()=>{ rainFailed=false; refresh(); });
  document.addEventListener('pointermove',event=>{
    if(rainFrame && canMove() && event.pointerType!=='touch'){
      rainFrame.contentWindow.postMessage({type:'rain-pointer',x:event.clientX,y:event.clientY},'*');
    }
  },{passive:true});
  // Mobile browser chrome changes innerHeight, not our stable background viewport.
  // Rebuild the supplied renderer only when its actual size or rendering density changes.
  window.addEventListener('resize',()=>{
    resetSprings(); clearTimeout(resizeTimer);
    resizeTimer=setTimeout(()=>{
      if(!rainFrame || !rainLayer.clientWidth || !rainLayer.clientHeight || rainDimensions===rainSize()) return;
      removeRain(); refresh();
    },250);
  });
  document.addEventListener('visibilitychange',refresh);
  for(const preference of [lessTransparency,moreContrast,finePointer]) preference.addEventListener('change',()=>{ resetSprings(); refresh(); });
  window.addEventListener('beforeprint',()=>{ suspended=true; refresh(); });
  window.addEventListener('afterprint',()=>{ suspended=false; refresh(); });
  window.addEventListener('pagehide',()=>{ suspended=true; refresh(); });
  window.addEventListener('pageshow',()=>{ suspended=false; refresh(); });
  refresh();
})();
