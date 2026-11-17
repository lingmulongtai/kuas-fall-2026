/* DOM geometry adapter for the unmodified Good Machines optical shaders.
 * Text and native controls stay in the DOM. One WebGL2 context renders the
 * material behind them; each nesting level samples the preceding level.
 */
(()=>{
  'use strict';
  const root=document.documentElement;
  const canvas=document.createElement('canvas');
  const asciiCanvas=document.getElementById('ascii-background');
  canvas.id='glass-canvas'; canvas.setAttribute('aria-hidden','true');
  const reducedTransparency=matchMedia('(prefers-reduced-transparency: reduce)');
  const contrast=matchMedia('(prefers-contrast: more)');
  const textControls = 'select,input:not([type="file"]):not([type="hidden"]):not([type="range"])';
  const selectors='.masthead-in,.sec,.weekbar,.dayrow,.chead,.box,.foot p,#view-week>.sec-head,.tabs,.langswitch,.picker button,.day-switch,.timetable-switch,.iconbtn,.nav-w,.panel,.blk,.tt .empty,.now-panel,.now-item,.course-live,.exam-card,.notice-list li,.handouts,.wk,.notice,.sidenote,.preset-card,.preset-lens,.attendance-editor,summary,'+textControls;
  const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
  let gl,programs,photo=document.querySelector('#wallpaper img'),rainImage=null,raf=0,settleUntil=0,suspended=false;
  let width=0,height=0,left=0,top=0,dpr=1,sourceDirty=true,targets=[],capacity=8;
  let asciiActive=false;
  let viewport, textureLimit, dock;
  let preparedBase, preparedCrop;
  const fb={};
  try{ gl=canvas.getContext('webgl2',{antialias:false,alpha:true,premultipliedAlpha:true,preserveDrawingBuffer:false}); }catch(_){}
  if(!gl){ root.dataset.optics='fallback'; return; }
  document.body.prepend(canvas);
  textureLimit=Math.min(gl.getParameter(gl.MAX_TEXTURE_SIZE),...gl.getParameter(gl.MAX_VIEWPORT_DIMS));
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
  // Encode the smallest premultiplied overlay that recreates the existing
  // optical result over its backdrop. Unchanged scenery stays transparent.
  const overlayShader=`#version 300 es
precision highp float;
uniform sampler2D u_result,u_under;
uniform vec4 u_plate;
uniform float u_radius;
in vec2 v_uv;
out vec4 o;
void main(){
  vec3 before=texture(u_under,v_uv).rgb;
  vec3 after=texture(u_result,v_uv).rgb;
  vec3 diff=after-before;
  vec3 limit=max(max(diff,0.0)/max(1.0-before,0.001),max(-diff,0.0)/max(before,0.001));
  float alpha=max(limit.r,max(limit.g,limit.b));
  if(u_radius>0.0){
    vec2 q=abs(gl_FragCoord.xy-u_plate.xy)-u_plate.zw+u_radius;
    float distance=length(max(q,0.0))+min(max(q.x,q.y),0.0)-u_radius;
    alpha=max(alpha,1.0-smoothstep(-0.5,0.5,distance));
  }
  o=vec4(clamp(after-before*(1.0-alpha),0.0,alpha),alpha);
}`;
  try{ programs={cover:compile(shaders.COVER),blur:compile(shaders.BLUR),glass:compile(shaders.GLASS),overlay:compile(overlayShader)}; }
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
  function materialNeedsPyramid(material){return material.blur>0 || material.frost>0 || material.pickup>0;}
  function materialNeedsStatistics(material){return material.appearance==='auto' || material.dim>0;}
  function sampledPyramidLevels(material,density,levels){
    const maxLod=Math.max(0,Math.log2(Math.max(material.blur,PICK_SIGMA)*density/SIGMA0));
    // Include both levels of the trilinear lookup, including its upper neighbor
    // at an integer LOD so rounding in the shader cannot expose stale pixels.
    return Math.min(levels,Math.floor(maxLod)+2);
  }
  function blurSampleRegion(shapes){
    const {m}=shapes[0];
    // A magnifying lens can sample toward a distant shape in the same batch.
    // The current blurred presets have unit magnification.
    if(m.magnify!==1)return {x:0,y:0,right:canvas.width,bottom:canvas.height};
    // The refracted ray has |T.z| >= 2/3 at IOR 1.5, so its displacement
    // per unit of thickness is at most sqrt(5)/2. Include dispersion, size
    // scale and the antialiased coverage outside the smooth-min field.
    const reach=Math.sqrt(5)/2*m.refraction*(m.sizeScale?1.7:1)*(1+0.45*m.dispersion);
    return batchRegion(shapes,false,reach+0.75/(canvas.width/width));
  }
  function pyramidRegions(region,bw,bh,levels){
    const regions=[];
    function scaleRect(rect,fromW,fromH,toW,toH){
      // Include both texels of every bilinear lookup, including at clamped edges.
      return {x:Math.max(0,Math.floor(rect.x*toW/fromW)-1),y:Math.max(0,Math.floor(rect.y*toH/fromH)-1),
        right:Math.min(toW,Math.ceil(rect.right*toW/fromW)+1),bottom:Math.min(toH,Math.ceil(rect.bottom*toH/fromH)+1)};
    }
    function union(a,b){
      return {x:Math.min(a.x,b.x),y:Math.min(a.y,b.y),right:Math.max(a.right,b.right),bottom:Math.max(a.bottom,b.bottom)};
    }
    let dependency;
    for(let i=levels-1;i>=0;i--){
      const w=Math.max(1,bw>>i),h=Math.max(1,bh>>i);
      const output=scaleRect(region,canvas.width,canvas.height,w,h);
      const vertical=dependency?union(output,scaleRect(dependency.rect,dependency.w,dependency.h,w,h)):output;
      const halo=i?4:5; // ceil(3 × sigma) on either side of a same-level output texel.
      const horizontal={x:vertical.x,y:Math.max(0,vertical.y-halo),right:vertical.right,bottom:Math.min(h,vertical.bottom+halo)};
      regions[i]={w,h,horizontal,vertical};
      dependency={rect:{...horizontal,x:horizontal.x-halo,right:horizontal.right+halo},w,h};
    }
    return regions;
  }
  function buildPyramid(shapes){
    const material=shapes[0].m;
    const cw=canvas.width,ch=canvas.height,bw=Math.max(1,Math.ceil(cw/2)),bh=Math.max(1,Math.ceil(ch/2));
    const levels=Math.min(PYR_MAX,mipLevels(bw,bh)),P=rtex('pyr',bw,bh,levels),T=rtex('pyrTmp',bw,bh,levels);
    const sampled=sampledPyramidLevels(material,dpr,levels);
    let i=0;
    for(const {w,h,horizontal,vertical} of pyramidRegions(blurSampleRegion(shapes),bw,bh,sampled)){
      const sig=i?1.3:1.5;
      drawRegion(horizontal,programs.blur,T.fbos[i],L=>{bindTex(0,i?P.tex:fb.scene.tex);gl.uniform1i(L.u_tex,0);gl.uniform2f(L.u_step,1/w,0);gl.uniform1f(L.u_sigma,sig);gl.uniform1f(L.u_lod,i?i-1:1);},w,h);
      drawRegion(vertical,programs.blur,P.fbos[i],L=>{bindTex(0,T.tex);gl.uniform1i(L.u_tex,0);gl.uniform2f(L.u_step,0,1/h);gl.uniform1f(L.u_sigma,sig);gl.uniform1f(L.u_lod,i);},w,h);
      i++;
    }
  }
  const source=document.createElement('canvas'),cx=source.getContext('2d',{willReadFrequently:true});
  source.id='glass-background';source.setAttribute('aria-hidden','true');
  const pageLayer=document.createElement('div');
  pageLayer.className='glass-page-layer';pageLayer.setAttribute('aria-hidden','true');
  document.body.prepend(source,pageLayer);
  const presentations=new Map();
  const imageTex=gl.createTexture();
  let meanLum=.6,pixels=null,sourceStatisticsCurrent=false,imageWidth=0,imageHeight=0;
  function sourceLuminanceNeeded(){
    const presets=window.GlassMaterials.presets;
    const selected=presets.find(p=>p.id===root.dataset.material)?.p||presets[5].p;
    if(materialNeedsStatistics(selected))return true;
    return targets.some(el=>el.dataset.materialPreview && el.checkVisibility({checkOpacity:true,checkVisibilityCSS:true}) &&
      materialNeedsStatistics(presets.find(p=>p.id===el.dataset.materialPreview)?.p||presets[5].p));
  }
  function uploadSource(){
    if(source.width!==viewport.pixelWidth)source.width=viewport.pixelWidth;
    if(source.height!==viewport.pixelHeight)source.height=viewport.pixelHeight;
    cx.fillStyle=root.dataset.theme==='dark'?'#171f2b':'#dce6eb';cx.fillRect(0,0,source.width,source.height);
    const image=asciiActive ? asciiCanvas : RAIN && rainImage ? rainImage : photo;
    if(image && (image.width || image.naturalWidth)){
      const iw=image.naturalWidth||image.width,ih=image.naturalHeight||image.height;
      const scale=Math.max(source.width/iw,source.height/ih);
      cx.drawImage(image,(source.width-iw*scale)/2,(source.height-ih*scale)/2,iw*scale,ih*scale);
    }
    bindTex(0,imageTex);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);
    if(imageWidth!==source.width || imageHeight!==source.height){
      gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,source);
      imageWidth=source.width;imageHeight=source.height;
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.MIRRORED_REPEAT);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.MIRRORED_REPEAT);
    }else gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,gl.RGBA,gl.UNSIGNED_BYTE,source);
    gl.generateMipmap(gl.TEXTURE_2D);
    sourceStatisticsCurrent=false;sourceDirty=false;
  }
  function updateSourceStatistics(){
    pixels=cx.getImageData(0,0,source.width,source.height).data;
    let sum=0;
    for(let y=0;y<24;y++)for(let x=0;x<24;x++){
      const i=(Math.floor((y+.5)*source.height/24)*source.width+Math.floor((x+.5)*source.width/24))*4;
      sum+=luminance(pixels.subarray(i,i+3));
    }
    meanLum=sum/(24*24);sourceStatisticsCurrent=true;
  }
  const lin=c=>{c/=255;return c<=.04045?c/12.92:((c+.055)/1.055)**2.4;};
  const luminance=c=>.2126*lin(c[0])+.7152*lin(c[1])+.0722*lin(c[2]);
  function measure(rect){
    // The reference measures linear luminance on a 10×10 grid, with hysteresis.
    let sum=0;
    for(let y=0;y<10;y++)for(let x=0;x<10;x++){
      const px=clamp(Math.floor((rect.left+left-viewport.left+(x+.5)*rect.width/10)*dpr),0,source.width-1);
      const py=clamp(Math.floor((rect.top+top-viewport.top+(y+.5)*rect.height/10)*dpr),0,source.height-1);
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
      const batch=batches.find(batch=>batch.length<limit && batch[0].m===shape.m && batch.every(other=>{
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
    const groups=new Map([[pageLayer,new Map()]]);
    for(const el of targets){
      const bounds=el.getBoundingClientRect();
      if(!bounds.width || !bounds.height || bounds.bottom<top-96 || bounds.top>top+height+96 || bounds.right<left-96 || bounds.left>left+width+96 || !el.checkVisibility({checkOpacity:true,checkVisibilityCSS:true}))continue;
      const rect={left:bounds.left-left,top:bounds.top-top,width:bounds.width,height:bounds.height};
      const host=dock?.contains(el)?dock:el.parentElement?.closest('.calendar-scroll,.attendance-editor-scroll')||pageLayer;
      if(!groups.has(host))groups.set(host,new Map());
      const layers=groups.get(host);
      let depth=0,parent=el.parentElement;
      while(parent){if(parent.matches(selectors))depth++;parent=parent.parentElement;}
      if(el.closest('.tabs'))depth+=30;
      if(!layers.has(depth))layers.set(depth,[]);
      const style=getComputedStyle(el),m=window.GlassMaterials.presets.find(p=>p.id===(el.dataset.materialPreview||root.dataset.material))?.p||window.GlassMaterials.presets[5].p;
      const L=m.appearance==='auto'?measure(rect):0,old=toneMemory.get(el)||0;
      const tone=m.appearance==='light'?0:m.appearance==='dark'?1:Math.min(rect.width,rect.height)<=96?(old>.5?(L<.22?1:0):(L<.14?1:0)):0;
      toneMemory.set(el,tone);
      layers.get(depth).push({rect,r:parseFloat(style.borderTopLeftRadius)||0,m,tone});
      if(el.classList.contains('segmented')){
        const selected=el.querySelector('[aria-selected="true"],[aria-pressed="true"]');
        if(selected){
          const level=depth+1;
          if(!layers.has(level))layers.set(level,[]);
          const selectedRect=selected.getBoundingClientRect();
          layers.get(level).push({rect:{left:selectedRect.left-left,top:selectedRect.top-top,width:selectedRect.width,height:selectedRect.height},r:parseFloat(getComputedStyle(selected).borderTopLeftRadius)||24,m,tone});
        }
      }
    }
    return groups;
  }
  const touch={x:-1e4,y:-1e4,strength:0};
  let inkPixels=null,labels=[],labelLayout=[],labelLayoutDirty=true,inkHistory=new WeakMap(),inkCandidates=new WeakMap(),contrastUrgent=true,lastContrast=-Infinity,contrastTimer=0;
  let inkRevision=0,inkTransfer=null,inkBuffer=null,inkBufferBytes=0,inkReadbackFailed=false;
  const colorCache=new Map(),colorCanvas=document.createElement('canvas');
  colorCanvas.width=colorCanvas.height=1;
  const colorContext=colorCanvas.getContext('2d',{willReadFrequently:true});
  function chooseLabelInk(samples,previous){
    const black=luminance([17,17,17]),scores={};
    for(const color of ['dark','light']){
      const ratios=samples.map(L=>color==='light'?1.05/(L+.05):(L+.05)/(black+.05)).sort((a,b)=>a-b);
      // Protect the harder-to-read part of a label, not just its median pixel.
      scores[color]=ratios[Math.floor((ratios.length-1)*.2)];
    }
    const best=scores.dark>=scores.light?'dark':'light';
    return previous && previous!==best && scores[previous]>=3 && scores[best]<scores[previous]*1.15?previous:best;
  }
  function stabiliseLabelInk(candidate,previous,pending,now){
    if(!previous || candidate===previous)return {color:candidate,pending:null};
    if(pending?.color!==candidate)pending={color:candidate,since:now};
    return now-pending.since>=500?{color:candidate,pending:null}:{color:previous,pending};
  }
  function labelBackdrop(el,styles){
    // The GPU image excludes native DOM fills, such as status badges and rows.
    // Composite these over the glass before measuring their text contrast.
    const layers=[];
    for(let node=el;node && node!==document.body;node=node.parentElement){
      if(!styles.has(node))styles.set(node,getComputedStyle(node));
      const color=styles.get(node).backgroundColor;
      if(!colorCache.has(color)){
        colorContext.clearRect(0,0,1,1);colorContext.fillStyle=color; colorContext.fillRect(0,0,1,1);
        colorCache.set(color,[...colorContext.getImageData(0,0,1,1).data]);
      }
      const rgba=colorCache.get(color);
      if(rgba[3])layers.push(rgba);
      if(rgba[3]===255)break;
    }
    const result=[0,0,0,0];
    for(const rgba of layers.reverse()){
      const alpha=rgba[3]/255,out=alpha+result[3]*(1-alpha);
      for(let i=0;i<3;i++)result[i]=(rgba[i]*alpha+result[i]*result[3]*(1-alpha))/out;
      result[3]=out;
    }
    return result;
  }
  function measureLabels(){
    const range=document.createRange(),styles=new Map();
    const previousBackdrops=new Map(labelLayout.map(label=>[label.el,label.backdrop]));
    labelLayout=[];
    for(const label of labels){
      const {el,nodes}=label;
      if(!el.checkVisibility({checkOpacity:true,checkVisibilityCSS:true}))continue;
      const rects=[];
      if(nodes.length)for(const node of nodes){range.selectNodeContents(node);rects.push(...range.getClientRects());}
      else rects.push(el.getBoundingClientRect());
      const scroller=el.closest('.calendar-scroll,.attendance-editor-scroll');
      const clip=scroller?scroller.getBoundingClientRect():{left,top,right:left+width,bottom:top+height};
      const visible=rects.map(rect=>({left:Math.max(rect.left,left,clip.left),top:Math.max(rect.top,top,clip.top),right:Math.min(rect.right,left+width,clip.right),bottom:Math.min(rect.bottom,top+height,clip.bottom)}))
        .filter(rect=>rect.right>rect.left && rect.bottom>rect.top);
      if(visible.length){
        const backdrop=labelBackdrop(el,styles),previous=previousBackdrops.get(el);
        if(previous && backdrop.some((value,i)=>value!==previous[i])){inkHistory.delete(el);inkCandidates.delete(el);}
        labelLayout.push({el,rects:visible,backdrop});
      }
    }
    labelLayoutDirty=false;
  }
  function sampleLabel(rects,backdrop,w,h){
    const samples=[];
    for(const rect of rects){
      const columns=clamp(Math.ceil((rect.right-rect.left)/10),2,32);
      for(let y=0;y<3;y++)for(let x=0;x<columns;x++){
        const px=clamp(Math.floor((rect.left-left+(rect.right-rect.left)*(.1+.8*(x+.5)/columns))*w/width),0,w-1);
        const py=clamp(Math.floor((rect.top-top+(rect.bottom-rect.top)*(.15+.7*(y+.5)/3))*h/height),0,h-1);
        const i=((h-1-py)*w+px)*4;
        samples.push(luminance([0,1,2].map(c=>backdrop[c]*backdrop[3]+inkPixels[i+c]*(1-backdrop[3]))));
      }
    }
    return samples;
  }
  function resetLabelContrast(){
    inkRevision++;
    labelLayoutDirty=true;contrastUrgent=true;inkHistory=new WeakMap();inkCandidates=new WeakMap();
  }
  function updateLabelContrast(){
    if(['white','black'].includes(root.dataset.textColor)){clearTimeout(contrastTimer);contrastTimer=0;return;}
    if(inkTransfer)return;
    const moving=document.getAnimations().some(animation=>animation.playState==='running');
    const elapsed=performance.now()-lastContrast;
    if(!contrastUrgent && !moving && elapsed<120){
      if(!contrastTimer)contrastTimer=setTimeout(()=>{contrastTimer=0;invalidate();},Math.ceil(120-elapsed));
      return;
    }
    clearTimeout(contrastTimer);contrastTimer=0;
    // Sample the finished glass at each actual text line, in either theme.
    const w=Math.min(1024,Math.ceil(width)),h=Math.max(1,Math.round(height*w/width));
    const ink=rtex('ink',w,h);
    drawTo(programs.cover,ink.fbo,w,h,L=>{
      bindTex(0,fb.scene.tex);gl.uniform1i(L.u_img,0);gl.uniform4f(L.u_fit,1,-1,0,0);gl.uniform4f(L.u_rect,0,0,1,1);gl.uniform1i(L.u_un,0);gl.uniform2f(L.u_world,width,height);
    });
    if(labelLayoutDirty || moving)measureLabels();
    if(!inkPixels || inkPixels.length!==w*h*4)inkPixels=new Uint8Array(w*h*4);
    const first=lastContrast===-Infinity;
    contrastUrgent=false;lastContrast=performance.now();
    const frame={w,h,layout:labelLayout,revision:inkRevision,left,top,width,height};
    if(!first && !inkReadbackFailed && queueInkReadback(frame))return;
    gl.readPixels(0,0,w,h,gl.RGBA,gl.UNSIGNED_BYTE,inkPixels);
    applyInkReadback(frame);
  }
  function queueInkReadback(frame){
    inkBuffer??=gl.createBuffer();
    if(!inkBuffer)return false;
    // The sample moves to a GPU buffer. The next glass frame need not wait
    // for the GPU to finish producing it or for the CPU to read it back.
    gl.bindBuffer(gl.PIXEL_PACK_BUFFER,inkBuffer);
    if(inkBufferBytes!==inkPixels.byteLength){
      inkBufferBytes=inkPixels.byteLength;
      gl.bufferData(gl.PIXEL_PACK_BUFFER,inkBufferBytes,gl.STREAM_READ);
    }
    gl.readPixels(0,0,frame.w,frame.h,gl.RGBA,gl.UNSIGNED_BYTE,0);
    gl.bindBuffer(gl.PIXEL_PACK_BUFFER,null);
    const sync=gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE,0);
    if(!sync)return false;
    inkTransfer={frame,sync};
    gl.flush();
    requestAnimationFrame(finishInkReadback);
    return true;
  }
  function finishInkReadback(){
    const {frame,sync}=inkTransfer;
    const status=gl.clientWaitSync(sync,0,0);
    if(status===gl.TIMEOUT_EXPIRED){requestAnimationFrame(finishInkReadback);return;}
    gl.deleteSync(sync);inkTransfer=null;
    if(status===gl.WAIT_FAILED){inkReadbackFailed=true;contrastUrgent=true;}
    else if(frame.revision===inkRevision && frame.left===left && frame.top===top && frame.width===width && frame.height===height &&
      root.dataset.optics==='ready' && !['white','black'].includes(root.dataset.textColor)){
      gl.bindBuffer(gl.PIXEL_PACK_BUFFER,inkBuffer);
      gl.getBufferSubData(gl.PIXEL_PACK_BUFFER,0,inkPixels);
      gl.bindBuffer(gl.PIXEL_PACK_BUFFER,null);
      applyInkReadback(frame);
    }
    if(contrastUrgent || labelLayoutDirty)invalidate();
  }
  function applyInkReadback({w,h,layout}){
    let waiting=false;
    const now=performance.now();
    for(const {el,rects,backdrop} of layout){
      const previous=inkHistory.get(el),candidate=chooseLabelInk(sampleLabel(rects,backdrop,w,h),previous);
      const {color,pending}=stabiliseLabelInk(candidate,previous,inkCandidates.get(el),now);
      if(pending){inkCandidates.set(el,pending);waiting=true;}else inkCandidates.delete(el);
      inkHistory.set(el,color);
      if(el.dataset.autoInk!==color)el.dataset.autoInk=color;
    }
    if(waiting&&!contrastTimer)contrastTimer=setTimeout(()=>{contrastTimer=0;invalidate();},120);
  }
  function drawLayer(shapes){
    const [s0,s1,s2,m0,m1,m2,m3]=arrays,material=shapes[0].m;
    const q=clamp((meanLum-.12)/.25,0,1);
    const dim=material.dim*q*q*(3-2*q);
    const region=batchRegion(shapes,dim);
    if(!hasPixels(region))return;
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
    drawRegion(region,programs.glass,fb.output.fbo,L=>{
      bindTex(0,fb.scene.tex);gl.uniform1i(L.u_scene,0);bindTex(1,materialNeedsPyramid(material)?fb.pyr.tex:fb.scene.tex);gl.uniform1i(L.u_blur,1);
      gl.uniform2f(L.u_res,canvas.width,canvas.height);gl.uniform2f(L.u_dpr,canvas.width/width,canvas.height/height);
      gl.uniform2f(L.u_texel,1/canvas.width,1/canvas.height);gl.uniform4f(L.u_map,1/width,-1/height,0,1);gl.uniform1f(L.u_sceneLod,0);
      gl.uniform1i(L.u_n,shapes.length);
      ['u_s0','u_s1','u_s2','u_m0','u_m1','u_m2','u_m3'].forEach((name,i)=>gl.uniform4fv(L[name],arrays[i]));
      gl.uniform4f(L.u_touch,touch.x,touch.y,material.interactive?touch.strength:0,46);
      gl.uniform1f(L.u_merge,material.merge);gl.uniform1f(L.u_zoom,1);
      const a=material.lightAngle*Math.PI/180;gl.uniform2f(L.u_light,Math.cos(a),Math.sin(a));
      gl.uniform1f(L.u_dimK,dim);
      gl.uniform1f(L.u_pickLod,Math.max(0,Math.log2(PICK_SIGMA*dpr/SIGMA0)));
    });
    copyFrame(fb.output,fb.scene,region);
    bindTex(0,fb.scene.tex);gl.generateMipmap(gl.TEXTURE_2D);
  }
  function batchRegion(shapes,dim,reach=dim>0?96:Math.max(31,0.75/(canvas.width/width))){
    const sx=canvas.width/width,sy=canvas.height/height;
    // The unchanged shader stops affecting pixels 96 CSS px outside its field.
    // Without dimming, only the antialiased rim and the 26 px shadow offset by
    // 5 px contribute. Each smooth-min can extend that field by at most k/4.
    const margin=reach+shapes.slice(1).reduce((sum,shape)=>sum+shape.m.merge/4,0);
    let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
    for(const {rect} of shapes){
      minX=Math.min(minX,rect.left);minY=Math.min(minY,rect.top);
      maxX=Math.max(maxX,rect.left+rect.width);maxY=Math.max(maxY,rect.top+rect.height);
    }
    return {
      x:clamp(Math.floor((minX-margin)*sx)-1,0,canvas.width),
      y:clamp(Math.floor((minY-margin)*sy)-1,0,canvas.height),
      right:clamp(Math.ceil((maxX+margin)*sx)+1,0,canvas.width),
      bottom:clamp(Math.ceil((maxY+margin)*sy)+1,0,canvas.height)
    };
  }
  function hasPixels({x,y,right,bottom}){return right>x&&bottom>y;}
  function drawRegion(region,program,fbo,setup,w=canvas.width,h=canvas.height){
    const {x,y,right,bottom}=region;
    if(x===0&&y===0&&right===w&&bottom===h){
      drawTo(program,fbo,w,h,setup);
      return;
    }
    gl.enable(gl.SCISSOR_TEST);
    gl.scissor(x,h-bottom,right-x,bottom-y);
    try{drawTo(program,fbo,w,h,setup);}
    finally{gl.disable(gl.SCISSOR_TEST);}
  }
  function copyFrame(from,to,rect={x:0,y:0,right:canvas.width,bottom:canvas.height}){
    const {x,y,right,bottom}=rect;
    if(right<=x || bottom<=y)return;
    const low=canvas.height-bottom,high=canvas.height-y;
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER,from.fbo);
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER,to.fbo);
    gl.blitFramebuffer(x,low,right,high,x,low,right,high,gl.COLOR_BUFFER_BIT,gl.NEAREST);
  }
  function renderGroup(layers){
    for(const [,shapes] of [...layers].sort((a,b)=>a[0]-b[0])){
      for(const batch of batchSurfaces(shapes,capacity)){
        if(materialNeedsPyramid(batch[0].m))buildPyramid(batch);
        drawLayer(batch);
      }
    }
  }
  function pixelBounds(l,t,r,b){
    const sx=canvas.width/width,sy=canvas.height/height;
    return {
      x:clamp(Math.ceil((l-left)*sx),0,canvas.width),
      y:clamp(Math.ceil((t-top)*sy),0,canvas.height),
      right:clamp(Math.floor((r-left)*sx),0,canvas.width),
      bottom:clamp(Math.floor((b-top)*sy),0,canvas.height)
    };
  }
  function planeFor(host){
    let plane=presentations.get(host);
    if(!plane){
      const surface=document.createElement('canvas');
      surface.className='glass-plane';surface.setAttribute('aria-hidden','true');
      host.prepend(surface);
      plane={surface,context:surface.getContext('2d')};
      presentations.set(host,plane);
    }
    return plane;
  }
  function present(host,under,region,origin,plate){
    const {x,y,right,bottom}=region;
    const w=right-x,h=bottom-y;
    if(w<=0 || h<=0)return;
    const plane=planeFor(host),{surface,context}=plane;
    const sx=canvas.width/width,sy=canvas.height/height;
    drawRegion(region,programs.overlay,null,L=>{
      bindTex(0,fb.scene.tex);gl.uniform1i(L.u_result,0);
      bindTex(1,under.tex);gl.uniform1i(L.u_under,1);
      if(plate){
        gl.uniform4f(L.u_plate,(plate.left-left+plate.width/2)*sx,canvas.height-(plate.top-top+plate.height/2)*sy,plate.width*sx/2,plate.height*sy/2);
        gl.uniform1f(L.u_radius,Math.min(parseFloat(getComputedStyle(host).borderTopLeftRadius),plate.height/2)*sy);
      }else gl.uniform1f(L.u_radius,0);
    });
    if(surface.width!==w)surface.width=w;
    if(surface.height!==h)surface.height=h;
    context.globalCompositeOperation='copy';
    context.drawImage(canvas,x,y,w,h,0,0,w,h);
    const position=`left:${left+x/sx-origin.left}px;top:${top+y/sy-origin.top}px;width:${w/sx}px;height:${h/sy}px`;
    if(plane.position!==position){surface.style.cssText=position;plane.position=position;}
    surface.hidden=false;
  }
  function scrollContent(host,rect,origin){
    // Size to the real table or calendar board. Counting the previous canvas
    // in scrollWidth/Height would keep an old extent after the content shrinks.
    const content=host.querySelector(':scope > table,:scope > .week-board');
    const bounds=content?.getBoundingClientRect(),style=getComputedStyle(host);
    return {
      right:Math.max(rect.left+host.clientLeft+host.clientWidth,(bounds?.right??origin.left)+parseFloat(style.paddingRight)),
      bottom:Math.max(rect.top+host.clientTop+host.clientHeight,(bounds?.bottom??origin.top)+parseFloat(style.paddingBottom))
    };
  }
  function presentGroups(groups,base){
    const {left:x,top:y,width:w,height:h}=viewport;
    renderGroup(groups.get(pageLayer));
    present(pageLayer,base,pixelBounds(x,top,x+w,top+height),pageLayer.getBoundingClientRect());
    // Keep the dock above document content even when its labels stay fixed.
    const hosts=[...groups.keys()].filter(host=>host!==pageLayer&&host!==dock);
    if(dock&&groups.has(dock))hosts.push(dock);
    for(const host of hosts){
      const rect=host.getBoundingClientRect();
      const under=rtex('under',canvas.width,canvas.height);
      copyFrame(fb.scene,under);
      renderGroup(groups.get(host));
      const origin={left:rect.left+host.clientLeft-host.scrollLeft,top:rect.top+host.clientTop-host.scrollTop};
      if(host===dock){
        const region=pixelBounds(Math.max(x,rect.left-96),Math.max(y,rect.top-96),Math.min(x+w,rect.right+96),Math.min(y+h,rect.bottom+96));
        present(host,under,region,origin,rect);
      }else{
        const content=scrollContent(host,rect,origin);
        const region=pixelBounds(origin.left,origin.top,content.right,content.bottom);
        present(host,under,region,origin);
        // Shapes carried outside the scrollport are buffered in the DOM canvas.
        // Only the visible portion participates in subsequent glass and ink.
        const visible=pixelBounds(rect.left+host.clientLeft,rect.top+host.clientTop,rect.left+host.clientLeft+host.clientWidth,rect.top+host.clientTop+host.clientHeight);
        copyFrame(fb.scene,under,visible);
        copyFrame(under,fb.scene);
        bindTex(0,fb.scene.tex);gl.generateMipmap(gl.TEXTURE_2D);
      }
    }
    for(const [host,{surface}] of presentations){
      if(!host.isConnected)presentations.delete(host);
      else if(!groups.has(host))surface.hidden=true;
    }
  }
  function render(){
    raf=0;
    if(suspended || document.hidden || reducedTransparency.matches || contrast.matches){root.dataset.optics='fallback';return;}
    try{
      // CSS percentages exclude a reserved scrollbar gutter; innerWidth does not.
      // Use the actual painted box for both coordinates and texture resolution.
      const box=source.getBoundingClientRect();
      if(!box.width || !box.height){root.dataset.optics='fallback';return;}
      const ratio=Math.min(devicePixelRatio||1,2,textureLimit/Math.max(box.width,box.height));
      const pixelWidth=Math.round(box.width*ratio),pixelHeight=Math.round(box.height*ratio);
      if(source.width!==pixelWidth || source.height!==pixelHeight)sourceDirty=true;
      viewport={left:box.left,top:box.top,width:box.width,height:box.height,pixelWidth,pixelHeight};
      const tabs=document.querySelector('.tabs');
      dock=getComputedStyle(tabs).position==='fixed'?tabs:null;
      const horizontal=[...document.querySelectorAll('.calendar-scroll,.attendance-editor-scroll')].some(el=>{
        if(!el.clientWidth)return false;
        const rect=el.getBoundingClientRect();
        const origin={left:rect.left+el.clientLeft-el.scrollLeft,top:rect.top+el.clientTop-el.scrollTop};
        return scrollContent(el,rect,origin).right-origin.left>el.clientWidth+0.5;
      });
      const padX=horizontal?Math.min(192,Math.floor((textureLimit/ratio-box.width)/2)):0;
      const padY=Math.min(256,Math.floor((textureLimit/ratio-box.height)/2));
      const newLeft=box.left-padX,newTop=box.top-padY;
      if(touch.strength){touch.x+=left-newLeft;touch.y+=top-newTop;}
      left=newLeft;top=newTop;dpr=ratio;
      width=box.width+padX*2;height=box.height+padY*2;
      const bufferWidth=Math.round(width*ratio),bufferHeight=Math.round(height*ratio);
      if(canvas.width!==bufferWidth)canvas.width=bufferWidth;
      if(canvas.height!==bufferHeight)canvas.height=bufferHeight;
      const changedSource=sourceDirty;
      if(changedSource)uploadSource();
      if(!sourceStatisticsCurrent && sourceLuminanceNeeded())updateSourceStatistics();
      rtex('scene',canvas.width,canvas.height,mipLevels(canvas.width,canvas.height));rtex('output',canvas.width,canvas.height);
      const base=rtex('base',canvas.width,canvas.height);
      const crop=[-padX/box.width,-padY/box.height,width/box.width,height/box.height];
      if(changedSource || base!==preparedBase || crop.some((value,i)=>value!==preparedCrop[i])){
        drawTo(programs.cover,base.fbo,canvas.width,canvas.height,L=>{
          bindTex(0,imageTex);gl.uniform1i(L.u_img,0);gl.uniform4f(L.u_fit,1,1,0,0);gl.uniform1i(L.u_un,0);gl.uniform2f(L.u_world,width,height);
          gl.uniform4f(L.u_rect,...crop);
        });
        preparedBase=base;preparedCrop=crop;
      }
      copyFrame(base,fb.scene);
      bindTex(0,fb.scene.tex);gl.generateMipmap(gl.TEXTURE_2D);
      presentGroups(collect(),base);
      root.dataset.optics='ready';
      updateLabelContrast();
    }catch(error){console.error('Glass render:',error);root.dataset.optics='fallback';return;}
    // WAAPI transforms do not generate style mutations. Follow every frame,
    // including the final settled geometry, with or without animated rain.
    if(performance.now()<settleUntil || document.getAnimations().some(animation=>animation.playState==='running'))invalidate();
  }
  function invalidate(animate=false){
    if(animate && motionEnabled())settleUntil=performance.now()+450;
    if(!raf)raf=requestAnimationFrame(render);
  }
  function refreshTargets(){
    targets=[...document.querySelectorAll(selectors)];
    for(const el of targets)if(!el.hasAttribute('data-glass-surface'))el.setAttribute('data-glass-surface','');
    const text=new Map(),walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
    while(walker.nextNode()){
      const node=walker.currentNode,el=node.parentElement;
      if(!node.textContent.trim() || el.closest('script,style,svg,option,textarea'))continue;
      if(!text.has(el))text.set(el,{el,nodes:[]});
      text.get(el).nodes.push(node);
    }
    for(const el of document.querySelectorAll('.ui-icon,'+textControls))text.set(el,{el,nodes:[]});
    labels=[...text.values()];resetLabelContrast();
    invalidate();
  }
  new MutationObserver(records=>{
    records=records.filter(r=>!r.target.matches?.('.glass-plane') &&
      !(r.type==='childList'&&r.addedNodes.length>0&&!r.removedNodes.length&&[...r.addedNodes].every(node=>node.matches?.('.glass-plane'))));
    if(records.every(r=>r.type==='attributes' && ['data-auto-ink','data-glass-surface','data-optics'].includes(r.attributeName)))return;
    if(records.some(r=>r.type==='childList'))refreshTargets();
    else if(records.some(r=>['class','hidden','open'].includes(r.attributeName)))resetLabelContrast();
    labelLayoutDirty=true;contrastUrgent=true;
    invalidate();
  }).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['style','class','hidden','open','data-auto-ink','data-glass-surface']});
  window.addEventListener('wallpaperchange',event=>{photo=event.detail;rainImage?.close();rainImage=null;sourceDirty=true;resetLabelContrast();invalidate();});
  window.addEventListener('rainreset',()=>{rainImage?.close();rainImage=null;sourceDirty=true;resetLabelContrast();invalidate();});
  window.addEventListener('asciiframe',()=>{
    const active=!asciiCanvas.hidden;
    if(active!==asciiActive)resetLabelContrast();
    asciiActive=active;sourceDirty=true;invalidate();
  });
  window.addEventListener('glasschange',()=>{resetLabelContrast();invalidate(true);});
  window.addEventListener('textcolorchange',()=>{resetLabelContrast();invalidate();});
  function requestRainBitmap(once=false){
    const frame=document.querySelector('#rain iframe');
    if(RAIN && (once || rainMotionEnabled()) && !document.hidden && !suspended && photo?.naturalWidth && frame?.style.visibility!=='hidden')
      frame?.contentWindow.postMessage({type:'rain-bitmap-request'},'*');
  }
  window.addEventListener('ambiencechange',()=>{if(!RAIN){rainImage?.close();rainImage=null;}sourceDirty=true;resetLabelContrast();invalidate();requestRainBitmap();});
  // The isolated rain document transfers a full resolution bitmap. No changes
  // to particle counts, refraction, simulation speed or rain shader are needed.
  window.addEventListener('message',event=>{
    const frame=document.querySelector('#rain iframe');
    if(event.source!==frame?.contentWindow)return;
    if(event.data?.type==='rain-ready' || (event.data?.type==='rain-photo-ready' && event.data.image===photo?.src))requestRainBitmap(true);
    if(event.data?.type!=='rain-bitmap')return;
    if(event.data.photo && event.data.photo!==photo?.src){event.data.image.close();return;}
    if(!rainImage)resetLabelContrast();
    rainImage?.close();rainImage=event.data.image;sourceDirty=true;invalidate();
    requestAnimationFrame(()=>requestRainBitmap());
  });
  function layoutChanged(){resetLabelContrast();invalidate();}
  function hoveredLabelChanged(){labelLayoutDirty=true;contrastUrgent=true;invalidate();}
  window.addEventListener('resize',layoutChanged);
  new ResizeObserver(layoutChanged).observe(source);
  document.addEventListener('scroll',()=>{labelLayoutDirty=true;invalidate();},{passive:true,capture:true});
  document.addEventListener('pointerover',hoveredLabelChanged,{passive:true});
  document.addEventListener('pointerout',hoveredLabelChanged,{passive:true});
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
