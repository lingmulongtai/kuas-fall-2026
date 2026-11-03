/* DOM geometry adapter for the unmodified Good Machines optical shaders.
 * Text and native controls stay in the DOM. One WebGL2 context renders the
 * material behind them; each nesting level samples the preceding level.
 */
(()=>{
  'use strict';
  const root=document.documentElement;
  const canvas=document.createElement('canvas');
  canvas.id='glass-canvas'; canvas.setAttribute('aria-hidden','true');
  document.body.prepend(canvas);
  const reducedTransparency=matchMedia('(prefers-reduced-transparency: reduce)');
  const contrast=matchMedia('(prefers-contrast: more)');
  const selectors='.masthead-in,.sec,.weekbar,.dayrow,.chead,.box,.foot p,#view-week>.sec-head,.tabs,.langswitch,.picker button,.day-switch,.timetable-switch,.iconbtn,.nav-w,.panel,.blk,.tt .empty,.now-panel,.now-item,.course-live,.exam-card,.notice-list li,.handouts,.wk,.notice,.sidenote,.preset-card,.preset-lens,select,input:not([type="file"]):not([type="hidden"]),.attendance-editor,summary';
  const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
  let gl,programs,photo=document.querySelector('#wallpaper img'),rainImage=null,raf=0,settleUntil=0,suspended=false;
  let width=0,height=0,left=0,top=0,dpr=1,sourceDirty=true,targets=[],capacity=8;
  const fb={};
  try{ gl=canvas.getContext('webgl2',{antialias:false,alpha:false,premultipliedAlpha:false,preserveDrawingBuffer:false}); }catch(_){}
  if(!gl){ root.dataset.optics='fallback'; return; }
  capacity=Math.max(8,Math.min(96,Math.floor((gl.getParameter(gl.MAX_FRAGMENT_UNIFORM_VECTORS)-32)/7)));
  const shaders=window.GlassMaterials.shaders(capacity);
  function compile(fragment){
    const shader=(type,src)=>{ const s=gl.createShader(type); gl.shaderSource(s,src); gl.compileShader(s); if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)) throw Error(gl.getShaderInfoLog(s)); return s; };
    const p=gl.createProgram(),vert=shader(gl.VERTEX_SHADER,shaders.VERT),frag=shader(gl.FRAGMENT_SHADER,fragment);
    gl.attachShader(p,vert); gl.attachShader(p,frag); gl.bindAttribLocation(p,0,'a'); gl.linkProgram(p);
    gl.deleteShader(vert);gl.deleteShader(frag);
    if(!gl.getProgramParameter(p,gl.LINK_STATUS)) throw Error(gl.getProgramInfoLog(p));
    const loc={};
    for(let i=0;i<gl.getProgramParameter(p,gl.ACTIVE_UNIFORMS);i++){ const name=gl.getActiveUniform(p,i).name.replace(/\[0\]$/,'');loc[name]=gl.getUniformLocation(p,name); }
    return {p,loc};
  }
  try{ programs={cover:compile(shaders.COVER),blur:compile(shaders.BLUR),glass:compile(shaders.GLASS)}; }
  catch(error){ console.error('Glass shader:',error);root.dataset.optics='fallback';return; }
  const quad=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,quad);
  gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,2,gl.FLOAT,false,0,0);
  const mipLevels=(w,h)=>Math.floor(Math.log2(Math.max(w,h)))+1;
  function rtex(name,w,h,levels=1){
    let t=fb[name];if(t && t.w===w && t.h===h && t.levels===levels)return t;
    if(t){gl.deleteTexture(t.tex);t.fbos.forEach(f=>gl.deleteFramebuffer(f));}
    const tex=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,tex);
    gl.texStorage2D(gl.TEXTURE_2D,levels,gl.RGBA8,w,h);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,levels>1?gl.LINEAR_MIPMAP_LINEAR:gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAX_LEVEL,levels-1);
    const fbos=[];
    for(let i=0;i<levels;i++){const f=gl.createFramebuffer();gl.bindFramebuffer(gl.FRAMEBUFFER,f);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,tex,i);fbos.push(f);}
    return fb[name]={tex,fbo:fbos[0],fbos,w,h,levels};
  }
  function drawTo(prog,fbo,w,h,setup){gl.useProgram(prog.p);gl.bindFramebuffer(gl.FRAMEBUFFER,fbo);gl.viewport(0,0,w,h);setup(prog.loc);gl.drawArrays(gl.TRIANGLES,0,3);}
  function bindTex(unit,tex){gl.activeTexture(gl.TEXTURE0+unit);gl.bindTexture(gl.TEXTURE_2D,tex);}
  // Reference pyramid: full resolution cache, 17-tap passes, 3px base sigma,
  // 12px pickup sigma, and at most ten pyramid levels. Never lower quality on motion.
  const SIGMA0=3,PICK_SIGMA=12,PYR_MAX=10;
  function buildPyramid(){
    const cw=canvas.width,ch=canvas.height,bw=Math.max(1,Math.ceil(cw/2)),bh=Math.max(1,Math.ceil(ch/2));
    const levels=Math.min(PYR_MAX,mipLevels(bw,bh)),P=rtex('pyr',bw,bh,levels),T=rtex('pyrTmp',bw,bh,levels);
    for(let i=0;i<levels;i++){
      const w=Math.max(1,bw>>i),h=Math.max(1,bh>>i),sig=i?1.3:1.5;
      drawTo(programs.blur,T.fbos[i],w,h,L=>{bindTex(0,i?P.tex:fb.scene.tex);gl.uniform1i(L.u_tex,0);gl.uniform2f(L.u_step,1/w,0);gl.uniform1f(L.u_sigma,sig);gl.uniform1f(L.u_lod,i?i-1:1);});
      drawTo(programs.blur,P.fbos[i],w,h,L=>{bindTex(0,T.tex);gl.uniform1i(L.u_tex,0);gl.uniform2f(L.u_step,0,1/h);gl.uniform1f(L.u_sigma,sig);gl.uniform1f(L.u_lod,i);});
    }
  }
  const source=document.createElement('canvas'),cx=source.getContext('2d',{willReadFrequently:true});
  const imageTex=gl.createTexture();
  let meanLum=.6,pixels=null;
  function uploadSource(){
    source.width=canvas.width;source.height=canvas.height;
    cx.fillStyle=root.dataset.theme==='dark'?'#171f2b':'#dce6eb';cx.fillRect(0,0,source.width,source.height);
    const image=RAIN && rainImage ? rainImage : photo;
    if(image && (image.width || image.naturalWidth)){
      const iw=image.naturalWidth||image.width,ih=image.naturalHeight||image.height;
      const scale=Math.max(source.width/iw,source.height/ih);
      cx.drawImage(image,(source.width-iw*scale)/2,(source.height-ih*scale)/2,iw*scale,ih*scale);
    }
    bindTex(0,imageTex);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,source);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.MIRRORED_REPEAT);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.MIRRORED_REPEAT);
    gl.generateMipmap(gl.TEXTURE_2D);
    pixels=cx.getImageData(0,0,source.width,source.height).data;
    let sum=0;
    for(let y=0;y<24;y++)for(let x=0;x<24;x++){
      const i=(Math.floor((y+.5)*source.height/24)*source.width+Math.floor((x+.5)*source.width/24))*4;
      sum+=luminance(pixels.subarray(i,i+3));
    }
    meanLum=sum/(24*24);sourceDirty=false;
  }
  const lin=c=>{c/=255;return c<=.04045?c/12.92:((c+.055)/1.055)**2.4;};
  const luminance=c=>.2126*lin(c[0])+.7152*lin(c[1])+.0722*lin(c[2]);
  function measure(rect){
    // The reference measures linear luminance on a 10×10 grid, with hysteresis.
    let sum=0;
    for(let y=0;y<10;y++)for(let x=0;x<10;x++){
      const px=clamp(Math.floor((rect.left+(x+.5)*rect.width/10)*dpr),0,source.width-1);
      const py=clamp(Math.floor((rect.top+(y+.5)*rect.height/10)*dpr),0,source.height-1);
      const i=(py*source.width+px)*4;
      sum+=luminance(pixels.subarray(i,i+3));
    }
    return sum/100;
  }
  const toneMemory=new WeakMap();
  const arrays=Array.from({length:7},()=>new Float32Array(capacity*4));
  function batchSurfaces(shapes,limit){
    const batches=[];
    for(const shape of shapes){
      const batch=batches.find(batch=>batch.length<limit && batch[0].m===shape.m && batch[0].clip.key===shape.clip.key && batch.every(other=>{
        const a=shape.rect,b=other.rect;
        const dx=Math.max(a.left-b.left-b.width,b.left-a.left-a.width,0);
        const dy=Math.max(a.top-b.top-b.height,b.top-a.top-a.height,0);
        return Math.hypot(dx,dy)>=Math.max(shape.m.merge,other.m.merge);
      }));
      if(batch)batch.push(shape);else batches.push([shape]);
    }
    return batches;
  }
  function collect(){
    const layers=new Map();
    for(const el of targets){
      const bounds=el.getBoundingClientRect();
      if(!bounds.width || !bounds.height || bounds.bottom<top-96 || bounds.top>top+height+96 || !el.checkVisibility({checkOpacity:true,checkVisibilityCSS:true}))continue;
      const rect={left:bounds.left-left,top:bounds.top-top,width:bounds.width,height:bounds.height};
      let clip={left:0,top:0,width,height,key:'viewport'};
      const scroller=el.parentElement?.closest('.calendar-scroll,.attendance-editor-scroll');
      if(scroller){
        const box=scroller.getBoundingClientRect();
        const x=Math.max(0,box.left-left),y=Math.max(0,box.top-top);
        clip={left:x,top:y,width:Math.max(0,Math.min(width,box.right-left)-x),height:Math.max(0,Math.min(height,box.bottom-top)-y)};
        clip.key=[clip.left,clip.top,clip.width,clip.height].join(',');
        if(!clip.width || !clip.height || rect.left+rect.width<clip.left || rect.left>clip.left+clip.width || rect.top+rect.height<clip.top || rect.top>clip.top+clip.height)continue;
      }
      let depth=0,parent=el.parentElement;
      while(parent){if(parent.matches(selectors))depth++;parent=parent.parentElement;}
      if(el.closest('.tabs'))depth+=30;
      if(!layers.has(depth))layers.set(depth,[]);
      const style=getComputedStyle(el),m=window.GlassMaterials.presets.find(p=>p.id===(el.dataset.materialPreview||root.dataset.material))?.p||window.GlassMaterials.presets[5].p;
      const L=measure(rect),old=toneMemory.get(el)||0;
      const tone=m.appearance==='light'?0:m.appearance==='dark'?1:Math.min(rect.width,rect.height)<=96?(old>.5?(L<.22?1:0):(L<.14?1:0)):0;
      toneMemory.set(el,tone);
      const forcedInk=root.dataset.textColor==='white'?'light':root.dataset.textColor==='black'?'dark':root.dataset.theme==='dark'?'light':null;
      if(forcedInk && el.dataset.glassInk!==forcedInk)el.dataset.glassInk=forcedInk;
      layers.get(depth).push({rect,r:parseFloat(style.borderTopLeftRadius)||0,m,tone,clip});
      if(el.classList.contains('segmented')){
        const selected=el.querySelector('[aria-selected="true"],[aria-pressed="true"]');
        if(selected){
          const level=depth+1;
          if(!layers.has(level))layers.set(level,[]);
          const selectedRect=selected.getBoundingClientRect();
          layers.get(level).push({rect:{left:selectedRect.left-left,top:selectedRect.top-top,width:selectedRect.width,height:selectedRect.height},r:parseFloat(getComputedStyle(selected).borderTopLeftRadius)||24,m,tone,clip});
        }
      }
    }
    return [...layers].sort((a,b)=>a[0]-b[0]).map(entry=>entry[1]);
  }
  const touch={x:-1e4,y:-1e4,strength:0};
  let inkPixels=null;
  function updateLabelContrast(){
    if(root.dataset.theme==='dark' || ['white','black'].includes(root.dataset.textColor))return;
    // Inspect the finished glass, including neighbouring lenses and dimming,
    // rather than predicting text contrast from the unprocessed photograph.
    const w=Math.min(320,canvas.width),h=Math.max(1,Math.round(canvas.height*w/canvas.width));
    const ink=rtex('ink',w,h);
    drawTo(programs.cover,ink.fbo,w,h,L=>{
      bindTex(0,fb.scene.tex);gl.uniform1i(L.u_img,0);gl.uniform4f(L.u_fit,1,-1,0,0);gl.uniform4f(L.u_rect,0,0,1,1);gl.uniform1i(L.u_un,0);gl.uniform2f(L.u_world,width,height);
    });
    if(!inkPixels || inkPixels.length!==w*h*4)inkPixels=new Uint8Array(w*h*4);
    gl.readPixels(0,0,w,h,gl.RGBA,gl.UNSIGNED_BYTE,inkPixels);
    for(const el of targets){
      if(!el.checkVisibility({checkOpacity:true,checkVisibilityCSS:true}))continue;
      const text=el.querySelector(':scope > .preset-caption,:scope > .sec-head,:scope > .brand,:scope > .daylab,:scope > h2')||el;
      const rect=text.getBoundingClientRect();
      if(!rect.width || !rect.height || rect.bottom<top || rect.top>top+height)continue;
      const samples=[];
      for(let y=0;y<6;y++)for(let x=0;x<8;x++){
        const px=clamp(Math.floor((rect.left-left+rect.width*(.2+.6*(x+.5)/8))*w/width),0,w-1);
        const py=clamp(Math.floor((rect.top-top+rect.height*(.2+.6*(y+.5)/6))*h/height),0,h-1);
        const i=((h-1-py)*w+px)*4;
        samples.push(luminance(inkPixels.subarray(i,i+3)));
      }
      samples.sort((a,b)=>a-b);
      const L=samples[Math.floor(samples.length/2)];
      const color=1.05/(L+.05)>=(L+.05)/.073?'light':'dark';
      if(el.dataset.glassInk!==color)el.dataset.glassInk=color;
    }
  }
  function drawLayer(shapes){
    const [s0,s1,s2,m0,m1,m2,m3]=arrays,material=shapes[0].m;
    const clip=shapes[0].clip;
    if(clip.key!=='viewport'){
      gl.bindFramebuffer(gl.READ_FRAMEBUFFER,fb.scene.fbo);gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER,fb.output.fbo);
      gl.blitFramebuffer(0,0,canvas.width,canvas.height,0,0,canvas.width,canvas.height,gl.COLOR_BUFFER_BIT,gl.NEAREST);
      gl.enable(gl.SCISSOR_TEST);
      const x=Math.round(clip.left*canvas.width/width),y=Math.round(clip.top*canvas.height/height);
      const right=Math.round((clip.left+clip.width)*canvas.width/width),bottom=Math.round((clip.top+clip.height)*canvas.height/height);
      gl.scissor(x,canvas.height-bottom,right-x,bottom-y);
    }
    for(let i=0;i<shapes.length;i++){
      const {rect:r,m,tone}=shapes[i],o=i*4;
      s0.set([r.left+r.width/2,r.top+r.height/2,r.width/2,r.height/2],o);
      s1.set([shapes[i].r,tone,1,m.sizeScale?clamp(Math.sqrt(Math.min(r.width,r.height)/62),.75,1.7):1],o);
      s2.set([m.edge==='lip'?1:0,0,1,m.merge],o);
      m0.set([m.refraction,m.bezel,m.magnify,m.dispersion],o);
      m1.set([m.blur*dpr/SIGMA0,m.frost,m.vibrancy,m.brightness],o);
      const rgb=m.tint.match(/[0-9a-f]{2}/gi).map(h=>parseInt(h,16)/255);
      m2.set([...rgb,m.tintAmount],o);m3.set([m.pickup,m.specular,m.rimWidth,m.shadow],o);
    }
    drawTo(programs.glass,fb.output.fbo,canvas.width,canvas.height,L=>{
      bindTex(0,fb.scene.tex);gl.uniform1i(L.u_scene,0);bindTex(1,fb.pyr.tex);gl.uniform1i(L.u_blur,1);
      gl.uniform2f(L.u_res,canvas.width,canvas.height);gl.uniform2f(L.u_dpr,canvas.width/width,canvas.height/height);
      gl.uniform2f(L.u_texel,1/canvas.width,1/canvas.height);gl.uniform4f(L.u_map,1/width,-1/height,0,1);gl.uniform1f(L.u_sceneLod,0);
      gl.uniform1i(L.u_n,shapes.length);
      ['u_s0','u_s1','u_s2','u_m0','u_m1','u_m2','u_m3'].forEach((name,i)=>gl.uniform4fv(L[name],arrays[i]));
      gl.uniform4f(L.u_touch,touch.x,touch.y,material.interactive?touch.strength:0,46);
      gl.uniform1f(L.u_merge,material.merge);gl.uniform1f(L.u_zoom,1);
      const a=material.lightAngle*Math.PI/180;gl.uniform2f(L.u_light,Math.cos(a),Math.sin(a));
      const q=clamp((meanLum-.12)/.25,0,1);gl.uniform1f(L.u_dimK,material.dim*q*q*(3-2*q));
      gl.uniform1f(L.u_pickLod,Math.max(0,Math.log2(PICK_SIGMA*dpr/SIGMA0)));
    });
    gl.disable(gl.SCISSOR_TEST);
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER,fb.output.fbo);gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER,fb.scene.fbo);
    gl.blitFramebuffer(0,0,canvas.width,canvas.height,0,0,canvas.width,canvas.height,gl.COLOR_BUFFER_BIT,gl.NEAREST);
    bindTex(0,fb.scene.tex);gl.generateMipmap(gl.TEXTURE_2D);
  }
  function render(){
    raf=0;
    if(suspended || document.hidden || reducedTransparency.matches || contrast.matches){root.dataset.optics='fallback';return;}
    try{
      // CSS percentages exclude a reserved scrollbar gutter; innerWidth does not.
      // Use the actual painted box for both coordinates and texture resolution.
      const box=canvas.getBoundingClientRect(),w=box.width,h=box.height;
      if(!w || !h){root.dataset.optics='fallback';return;}
      left=box.left;top=box.top;
      const ratio=Math.min(devicePixelRatio||1,2);
      if(w!==width || h!==height || ratio!==dpr){width=w;height=h;dpr=ratio;canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);sourceDirty=true;}
      if(sourceDirty)uploadSource();
      rtex('scene',canvas.width,canvas.height,mipLevels(canvas.width,canvas.height));rtex('output',canvas.width,canvas.height);
      drawTo(programs.cover,fb.scene.fbo,canvas.width,canvas.height,L=>{
        bindTex(0,imageTex);gl.uniform1i(L.u_img,0);gl.uniform4f(L.u_fit,1,1,0,0);gl.uniform4f(L.u_rect,0,0,1,1);gl.uniform1i(L.u_un,0);gl.uniform2f(L.u_world,width,height);
      });
      bindTex(0,fb.scene.tex);gl.generateMipmap(gl.TEXTURE_2D);
      const layers=collect();
      for(const shapes of layers){
        // Each independent control has its own optical container. Preserve the
        // reference merge value without fusing adjacent buttons or cards.
        for(const batch of batchSurfaces(shapes,capacity)){buildPyramid();drawLayer(batch);}
      }
      updateLabelContrast();
      gl.bindFramebuffer(gl.READ_FRAMEBUFFER,fb.scene.fbo);gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER,null);
      gl.blitFramebuffer(0,0,canvas.width,canvas.height,0,0,canvas.width,canvas.height,gl.COLOR_BUFFER_BIT,gl.NEAREST);
      // Keep native text out of the floating mobile dock's reserved space. The
      // optical texture cannot rasterize DOM text that is scrolling underneath.
      const dock=document.querySelector('.tabs'),dockRect=dock.getBoundingClientRect();
      const fixed=getComputedStyle(dock).position==='fixed';
      for(const el of document.querySelectorAll('main,.foot,.masthead-in')){
        const cut=fixed?Math.max(0,el.getBoundingClientRect().bottom-dockRect.top+8):0;
        const value=cut.toFixed(1)+'px';
        if(el.style.getPropertyValue('--dock-cut')!==value)el.style.setProperty('--dock-cut',value);
      }
      root.dataset.optics='ready';
    }catch(error){console.error('Glass render:',error);root.dataset.optics='fallback';return;}
    // WAAPI transforms do not generate style mutations. Follow every frame,
    // including the final settled geometry, with or without animated rain.
    if(performance.now()<settleUntil || document.getAnimations().some(animation=>animation.playState==='running'))invalidate();
  }
  function invalidate(animate=false){if(animate && motionEnabled())settleUntil=performance.now()+450;if(!raf)raf=requestAnimationFrame(render);}
  function refreshTargets(){
    targets=[...document.querySelectorAll(selectors)];
    for(const el of targets)if(!el.hasAttribute('data-glass-surface'))el.setAttribute('data-glass-surface','');
    invalidate();
  }
  new MutationObserver(records=>{
    if(records.every(r=>r.type==='attributes' && ['data-glass-ink','data-glass-surface','data-optics'].includes(r.attributeName)))return;
    if(records.some(r=>r.type==='childList'))refreshTargets();
    invalidate();
  }).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['style','class','hidden','open','data-glass-ink','data-glass-surface']});
  window.addEventListener('wallpaperchange',event=>{photo=event.detail;rainImage?.close();rainImage=null;sourceDirty=true;invalidate();});
  window.addEventListener('rainreset',()=>{rainImage?.close();rainImage=null;sourceDirty=true;invalidate();});
  window.addEventListener('glasschange',()=>invalidate(true));
  window.addEventListener('textcolorchange',()=>invalidate());
  function requestRainBitmap(once=false){
    const frame=document.querySelector('#rain iframe');
    if(RAIN && (once || rainMotionEnabled()) && !document.hidden && !suspended && photo?.naturalWidth && frame?.style.visibility!=='hidden')
      frame?.contentWindow.postMessage({type:'rain-bitmap-request'},'*');
  }
  window.addEventListener('ambiencechange',()=>{if(!RAIN){rainImage?.close();rainImage=null;}sourceDirty=true;invalidate();requestRainBitmap();});
  // The isolated rain document transfers a full resolution bitmap. No changes
  // to particle counts, refraction, simulation speed or rain shader are needed.
  window.addEventListener('message',event=>{
    const frame=document.querySelector('#rain iframe');
    if(event.source!==frame?.contentWindow)return;
    if(event.data?.type==='rain-ready' || (event.data?.type==='rain-photo-ready' && event.data.image===photo?.src))requestRainBitmap(true);
    if(event.data?.type!=='rain-bitmap')return;
    if(event.data.photo && event.data.photo!==photo?.src){event.data.image.close();return;}
    rainImage?.close();rainImage=event.data.image;sourceDirty=true;invalidate();
    requestAnimationFrame(()=>requestRainBitmap());
  });
  window.addEventListener('resize',()=>invalidate());
  new ResizeObserver(()=>invalidate()).observe(canvas);
  window.addEventListener('scroll',()=>invalidate(),{passive:true});
  document.addEventListener('scroll',()=>invalidate(),{passive:true,capture:true});
  document.addEventListener('click',()=>invalidate(true));
  function trackPointer(event){
    if(event.isPrimary===false)return;
    touch.x=event.clientX-left;touch.y=event.clientY-top;touch.strength=1;
    invalidate();
  }
  function clearPointer(event){
    if(event?.isPrimary===false)return;
    touch.x=-1e4;touch.y=-1e4;touch.strength=0;
    invalidate();
  }
  function releasePointer(event){
    if(event.isPrimary===false)return;
    if(event.pointerType==='touch')clearPointer();else trackPointer(event);
  }
  // Mouse and pen hover keep the reference highlight under the cursor. Touch
  // has no resting cursor, so its highlight ends with contact or cancellation.
  document.addEventListener('pointermove',trackPointer,{passive:true});
  document.addEventListener('pointerdown',trackPointer,{passive:true});
  document.addEventListener('pointerup',releasePointer,{passive:true});
  document.addEventListener('pointercancel',clearPointer,{passive:true});
  document.documentElement.addEventListener('pointerleave',clearPointer,{passive:true});
  window.addEventListener('blur',clearPointer);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)clearPointer();invalidate();requestRainBitmap();});
  for(const pref of [reducedTransparency,contrast])pref.addEventListener('change',()=>invalidate());
  window.addEventListener('beforeprint',()=>{suspended=true;root.dataset.optics='fallback';});
  window.addEventListener('afterprint',()=>{suspended=false;invalidate();requestRainBitmap();});
  canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();suspended=true;root.dataset.optics='fallback';});
  canvas.addEventListener('webglcontextrestored',()=>location.reload());
  refreshTargets();
})();
