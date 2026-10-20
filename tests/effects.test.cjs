const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../effects.js'),'utf8');
const frameHTML=fs.readFileSync(path.join(__dirname,'../rain.html'),'utf8');
const frameSource=frameHTML.match(/<script>([\s\S]*?)<\/script>/)[1];

function setup({motion=true,photoReady=true,rain=true}={}){
  const handlers=new Map(),frames=new Map(),timers=new Map(),preferences=new Map(),created=[];
  let id=0;
  const listen=(name,fn)=>{if(!handlers.has(name)) handlers.set(name,[]);handlers.get(name).push(fn);};
  const drawing={createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),putImageData(){}};
  const layer={hidden:true,clientWidth:375,clientHeight:812,children:[],replaceChildren(child){this.children=[child];}};
  const photo={naturalWidth:3840,naturalHeight:2160,src:'https://images.unsplash.com/photo-test?w=3840'};
  const document={hidden:false,documentElement:{dataset:{}},addEventListener:listen,
    getElementById:id=>id==='rain'?layer:{setAttribute(){}},querySelector:()=>photoReady?photo:null,
    createElement(tag){
      if(tag==='canvas') return {getContext:()=>drawing,toDataURL:()=> 'data:image/png;base64,test'};
      const messages=[],attributes={};
      const frame={contentWindow:{postMessage:message=>messages.push(message)},messages,attributes,style:{},
        setAttribute:(key,value)=>attributes[key]=value,remove(){layer.children=layer.children.filter(child=>child!==frame);}};
      created.push(frame);return frame;
    }
  };
  const context=vm.createContext({document,window:{addEventListener:listen,innerWidth:375,innerHeight:812,devicePixelRatio:2},RAIN:rain,motion,motionEnabled:()=>context.motion,
    requestAnimationFrame:fn=>{frames.set(++id,fn);return id;},cancelAnimationFrame:id=>frames.delete(id),
    setTimeout:fn=>{timers.set(++id,fn);return id;},clearTimeout:id=>timers.delete(id),
    matchMedia:query=>{const pref={matches:query.includes('pointer: fine'),addEventListener:(name,fn)=>listen(query,fn)};preferences.set(query,pref);return pref;}
  });
  vm.runInContext(source,context);
  const emit=(name,event={})=>handlers.get(name)?.forEach(fn=>fn(event));
  const flushTimers=()=>{for(const [id,fn] of timers){timers.delete(id);fn();}};
  const resize=()=>{emit('resize');flushTimers();};
  return {context,document,layer,created,photo,preferences,emit,resize,flushTimers};
}

test('the reference renderer gets one isolated background frame and the current photograph',()=>{
  const state=setup(),frame=state.created[0];
  assert.equal(state.layer.hidden,false);
  assert.equal(frame.src,'rain.html?v=photo-ready');
  assert.equal(frame.attributes.sandbox,'allow-scripts');
  assert.equal(frame.tabIndex,-1);
  state.emit('message',{source:frame.contentWindow,data:{type:'rain-ready'}});
  state.emit('ambiencechange');
  assert.equal(state.created.length,1);
  assert.equal(frame.messages.at(-1).image,'https://images.unsplash.com/photo-test?w=3840');
  assert.equal(frame.messages.at(-1).running,true);
});

test('pause, hidden tabs and printing suspend the existing frame and resume it once',()=>{
  const state=setup(),frame=state.created[0];
  state.context.motion=false;state.emit('ambiencechange');
  assert.equal(frame.messages.at(-1).running,false);
  assert.equal(state.layer.hidden,false);
  state.context.motion=true;state.emit('ambiencechange');
  for(const [stop,start] of [['beforeprint','afterprint'],['pagehide','pageshow']]){
    state.emit(stop);assert.equal(frame.messages.at(-1).running,false);
    state.emit(start);assert.equal(frame.messages.at(-1).running,true);
  }
  state.document.hidden=true;state.emit('visibilitychange');
  assert.equal(frame.messages.at(-1).running,false);
  state.document.hidden=false;state.emit('visibilitychange');
  assert.equal(frame.messages.at(-1).running,true);
  assert.equal(state.created.length,1);
  assert.equal(setup({motion:false}).created[0].messages.at(-1).running,false);
});

test('rain off removes the document while a temporary photo gap keeps its preloaded frame paused',()=>{
  const state=setup();
  state.context.RAIN=false;state.emit('ambiencechange');
  assert.equal(state.layer.children.length,0);assert.equal(state.layer.hidden,true);
  state.context.RAIN=true;state.emit('ambiencechange');
  assert.equal(state.layer.children.length,1);
  const frame=state.layer.children[0];
  state.emit('wallpaperchange',{detail:null});
  assert.equal(state.layer.children[0],frame);
  assert.equal(frame.style.visibility,'hidden');
  assert.equal(frame.messages.at(-1).running,false);
  state.emit('wallpaperchange',{detail:{naturalWidth:1920,src:'https://images.unsplash.com/photo-next'}});
  assert.equal(state.layer.children.length,1);
  assert.equal(state.layer.children[0].messages.at(-1).image,'https://images.unsplash.com/photo-next');
});

test('the permitted rain document starts before asynchronous scenery arrives and retains its layout',()=>{
  const state=setup({photoReady:false}),frame=state.created[0];
  assert.equal(state.created.length,1,'Create the child while effects.js initializes, before wallpaper decoding finishes');
  assert.equal(state.layer.children[0],frame);
  assert.equal(state.layer.hidden,false,'Retain a full viewport layout instead of display:none');
  assert.deepEqual([state.layer.clientWidth,state.layer.clientHeight],[375,812]);
  assert.equal(frame.style.visibility,'hidden');
  assert.equal(frame.messages.at(-1).running,false);
  assert.equal(frame.messages.at(-1).image,undefined);
  assert.equal(setup({photoReady:false,rain:false}).created.length,0,'Respect a stored rain-off preference');
});

test('photo readiness works whether the chosen scenery arrives before or after the child handshake',()=>{
  for(const order of [['child','photo'],['photo','child']]){
    const state=setup({photoReady:false}),frame=state.created[0];
    for(const event of order){
      if(event==='child') state.emit('message',{source:frame.contentWindow,data:{type:'rain-ready'}});
      else state.emit('wallpaperchange',{detail:state.photo});
      assert.equal(state.layer.children[0],frame);
      assert.equal(frame.style.visibility,'hidden','Keep the child concealed until it confirms the selected photograph');
    }
    assert.equal(state.created.length,1);
    assert.equal(frame.messages.at(-1).image,state.photo.src,'The handshake resends the latest selected image');
    assert.equal(frame.messages.at(-1).running,true);
    state.emit('message',{source:frame.contentWindow,data:{type:'rain-photo-ready',image:state.photo.src}});
    assert.equal(frame.style.visibility,'');
    state.emit('message',{source:frame.contentWindow,data:{type:'rain-ready'}});
    assert.equal(frame.messages.at(-1).image,state.photo.src);
    assert.equal(state.layer.children[0],frame);
  }
});

test('photo changes reject stale and detached-frame confirmations and permit selecting the same image again',()=>{
  const state=setup(),frame=state.created[0],first=state.photo;
  const ready=(from,image)=>state.emit('message',{source:from,data:{type:'rain-photo-ready',image}});
  ready(frame.contentWindow,first.src);
  assert.equal(frame.style.visibility,'');
  state.emit('wallpaperchange',{detail:null});
  assert.equal(frame.style.visibility,'hidden');
  assert.equal(frame.messages.at(-1).running,false);
  const next={naturalWidth:1920,src:'https://images.unsplash.com/photo-next'};
  state.emit('wallpaperchange',{detail:next});
  ready(frame.contentWindow,first.src);
  ready({},next.src);
  assert.equal(frame.style.visibility,'hidden');
  ready(frame.contentWindow,next.src);
  assert.equal(frame.style.visibility,'');
  state.emit('wallpaperchange',{detail:null});
  state.emit('wallpaperchange',{detail:next});
  ready(frame.contentWindow,next.src);
  assert.equal(frame.style.visibility,'');
  assert.equal(state.created.length,1,'A missing photo and same-image reselection never recreate the rain document');
  state.context.RAIN=false;state.emit('ambiencechange');
  state.context.RAIN=true;state.emit('ambiencechange');
  const replacement=state.layer.children[0];
  assert.notEqual(replacement,frame);
  ready(frame.contentWindow,next.src);
  assert.equal(replacement.style.visibility,'hidden','An old document cannot reveal its replacement');
  ready(replacement.contentWindow,next.src);
  assert.equal(replacement.style.visibility,'');
});

test('reselecting an earlier photograph waits for a fresh confirmation after another image starts loading',()=>{
  const state=setup(),frame=state.created[0],first=state.photo;
  const second={naturalWidth:1920,src:'https://images.unsplash.com/photo-second'};
  const ready=image=>state.emit('message',{source:frame.contentWindow,data:{type:'rain-photo-ready',image}});
  ready(first.src);
  assert.equal(frame.style.visibility,'');
  state.emit('wallpaperchange',{detail:null});
  state.emit('wallpaperchange',{detail:second});
  // The child may already display B while its confirmation is still queued.
  // Selecting A again must not reuse A's confirmation from before that change.
  state.emit('wallpaperchange',{detail:first});
  assert.equal(frame.style.visibility,'hidden');
  ready(second.src);
  assert.equal(frame.style.visibility,'hidden','The delayed B confirmation cannot reveal the frame selected for A');
  assert.equal(frame.messages.at(-1).image,first.src);
  ready(first.src);
  assert.equal(frame.style.visibility,'');
  assert.equal(state.created.length,1);
});

test('resize rebuilds dimensions, contrast hides rain, and only the active frame can report failure',()=>{
  const state=setup(),old=state.created[0];
  state.layer.clientWidth=812;state.layer.clientHeight=375;
  state.resize();
  const current=state.layer.children[0];assert.notEqual(current,old);
  state.emit('message',{source:old.contentWindow,data:{type:'rain-error'}});
  assert.equal(state.layer.hidden,false);
  state.emit('message',{source:current.contentWindow,data:{type:'rain-error'}});
  assert.equal(state.layer.hidden,true);
  state.emit('ambiencechange');assert.equal(state.layer.hidden,false);
  const query='(prefers-contrast: more)';
  state.preferences.get(query).matches=true;state.emit(query);
  assert.equal(state.layer.hidden,true);assert.equal(state.layer.children.length,0);
});

test('mobile toolbar and keyboard resizes preserve the existing rain simulation',()=>{
  const state=setup(),frame=state.created[0];
  for(const height of [740,690,500,812,740,812]){
    state.context.window.innerHeight=height;
    state.resize();
    assert.equal(state.layer.children[0],frame);
  }
  assert.equal(state.created.length,1);
});

test('desktop height changes and rendering density changes still resize rain',()=>{
  const state=setup();
  state.layer.clientHeight=900;state.resize();
  assert.equal(state.created.length,2);
  state.context.window.devicePixelRatio=3;state.resize();
  assert.equal(state.created.length,2,'The supplied renderer caps density at 2');
  state.context.window.devicePixelRatio=1;state.resize();
  assert.equal(state.created.length,3);
});

test('a resize burst creates only one frame and returning to the original size creates none',()=>{
  const state=setup();
  state.layer.clientWidth=600;state.emit('resize');
  state.layer.clientWidth=800;state.emit('resize');
  state.layer.clientWidth=375;state.emit('resize');state.flushTimers();
  assert.equal(state.created.length,1);
  state.layer.clientWidth=600;state.emit('resize');
  state.layer.clientWidth=800;state.emit('resize');state.flushTimers();
  assert.equal(state.created.length,2);
});

function setupFrame({webgl=true,width=1440,height=810,dpr=2,photoComplete=true,standalone=false}={}){
  const handlers=new Map(),photoHandlers=new Map(),nativeFrames=new Map(),scripts=[],messages=[],shaders=[];
  const uploads=[],uniforms=[],draws=[],painted=[],bindings=new Map();
  let id=0;
  const listen=(name,fn)=>{if(!handlers.has(name)) handlers.set(name,[]);handlers.get(name).push(fn);};
  const photo={complete:photoComplete,naturalWidth:photoComplete?2400:0,naturalHeight:photoComplete?1600:0,
    dataset:{defaultSrc:'https://images.unsplash.com/photo-1448375240586-882707db888b?w=1920&q=80'},
    currentSrc:'https://images.unsplash.com/photo-forest',
    get src(){return this.currentSrc;},
    set src(value){this.currentSrc=value;this.complete=false;this.naturalWidth=0;this.naturalHeight=0;},
    addEventListener(name,fn){if(!photoHandlers.has(name)) photoHandlers.set(name,[]);photoHandlers.get(name).push(fn);},
    load(naturalWidth=2400,naturalHeight=1600){
      this.complete=true;this.naturalWidth=naturalWidth;this.naturalHeight=naturalHeight;
      photoHandlers.get('load')?.forEach(fn=>fn());
    }
  };
  let active=0x84C0;
  const gl={ACTIVE_TEXTURE:0x84E0,TEXTURE_BINDING_2D:0x8069,TEXTURE_2D:0x0DE1,
    TEXTURE0:0x84C0,TEXTURE1:0x84C1,TEXTURE2:0x84C2,TEXTURE3:0x84C3,RGBA:0x1908,UNSIGNED_BYTE:0x1401,TRIANGLES:4,
    shaderSource(shader,source){assert.equal(this,gl);shaders.push({shader,source});},
    texImage2D(...args){assert.equal(this,gl);uploads.push({unit:active,texture:bindings.get(active)||null,args});},
    getParameter(name){
      if(name===this.ACTIVE_TEXTURE) return active;
      if(name===this.TEXTURE_BINDING_2D) return bindings.get(active)||null;
      assert.fail('Unexpected GL query '+name);
    },
    activeTexture(unit){active=unit;},
    bindTexture(target,texture){assert.equal(target,this.TEXTURE_2D);bindings.set(active,texture);},
    getUniformLocation(program,name){return name==='missing'?null:{program,name};},
    uniform1f(location,value){assert.equal(this,gl);uniforms.push({location,value});},
    drawArrays(...args){assert.equal(this,gl);draws.push(args);}
  };
  const canvas={hidden:true,addEventListener:listen,getContext(type,options){
    this.viewport=[this.width,this.height];this.options=options;return webgl?gl:null;
  }};
  const window={addEventListener:listen,innerWidth:width,innerHeight:height,devicePixelRatio:dpr,
    postMessage:message=>messages.push(message),
    requestAnimationFrame:fn=>{nativeFrames.set(++id,fn);return id;},cancelAnimationFrame:id=>nativeFrames.delete(id)};
  const parent=standalone?window:{postMessage:message=>messages.push(message)};
  const document={getElementById:id=>id==='bg-canvas'?canvas:photo,addEventListener:listen,
    createElement(tag){
      if(tag!=='canvas') return {};
      const drawing={filter:'none',clears:[],draws:[],
        clearRect(...args){this.clears.push(args);},
        drawImage(...args){this.draws.push({args,src:args[0].src,filter:this.filter});}};
      const image={width:0,height:0,drawing,getContext(type){assert.equal(type,'2d');return drawing;}};
      painted.push(image);return image;
    },head:{appendChild:script=>scripts.push(script)},dispatchEvent(){}};
  vm.runInNewContext(frameSource,{window,document,parent,URL,console,MouseEvent:class{}});
  const message=(data,from=parent)=>handlers.get('message').forEach(fn=>fn({source:from,data}));
  const tick=()=>{for(const [id,fn] of [...nativeFrames]){nativeFrames.delete(id);fn(100);}};
  const boot=()=>handlers.get('DOMContentLoaded').forEach(fn=>fn());
  const texture=(unit,image,bound={unit})=>{
    gl.activeTexture(unit);gl.bindTexture(gl.TEXTURE_2D,bound);
    const args=[gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image];
    gl.texImage2D(...args);return {args,bound};
  };
  return {window,photo,canvas,parent,scripts,messages,nativeFrames,message,tick,handlers,gl,shaders,
    uploads,uniforms,draws,painted,bindings,boot,texture};
}

test('both external animation loops freeze, resume without duplication, and support cancellation',()=>{
  const state=setupFrame();let calls=0;
  state.message({type:'rain-state',running:true});
  const loop=()=>{calls++;state.window.requestAnimationFrame(loop);};
  state.window.requestAnimationFrame(loop);state.window.requestAnimationFrame(loop);
  state.tick();assert.equal(calls,2);assert.equal(state.nativeFrames.size,2);
  state.message({type:'rain-state',running:false});
  assert.equal(state.nativeFrames.size,0);
  state.tick();assert.equal(calls,2);
  const cancelled=state.window.requestAnimationFrame(()=>assert.fail('Cancelled frame executed'));
  state.window.cancelAnimationFrame(cancelled);
  state.message({type:'rain-state',running:true});
  state.message({type:'rain-state',running:true});
  assert.equal(state.nativeFrames.size,2);
  state.tick();assert.equal(calls,4);assert.equal(state.nativeFrames.size,2);
});

test('the frame loads the requested external URL and reports a network failure for fallback',()=>{
  const state=setupFrame();
  state.handlers.get('DOMContentLoaded').forEach(fn=>fn());
  assert.equal(state.scripts.length,1);
  assert.equal(state.scripts[0].src,'https://fyildiz1974.github.io/web/files/raindrops.js');
  assert.deepEqual(state.canvas.viewport,[2880,1620]);
  assert.equal(state.canvas.options.preserveDrawingBuffer,true);
  assert.equal(state.messages.at(-1).type,'rain-ready');
  state.scripts[0].onload(); // The live script self-boots and exports no Raindrops constructor.
  state.scripts[0].onerror();assert.equal(state.messages.at(-1).type,'rain-error');
  state.message({type:'rain-state',running:true,image:'https://images.unsplash.com/photo-next'});
  assert.equal(state.photo.src,'https://images.unsplash.com/photo-next');
  state.message({type:'rain-state',running:true,image:'https://example.com/unrelated'});
  assert.equal(state.photo.src,'https://images.unsplash.com/photo-next');
});

test('WebGL unavailable falls back to the photograph without starting external loops',()=>{
  const state=setupFrame({webgl:false});
  state.handlers.get('DOMContentLoaded').forEach(fn=>fn());
  assert.equal(state.scripts.length,0);
  assert.ok(state.messages.some(message=>message.type==='rain-error'));
  assert.equal(state.nativeFrames.size,0);
});

test('photo textures retain the original alpha, refraction and background shader source unchanged',()=>{
  const state=setupFrame();
  state.boot();
  const foreground='vec4 tex=texture2D(u_textureFg,texturePos);\nvec4 fg=vec4(tex.rgb*u_brightness,a);';
  const background='vec4 bg=texture2D(u_textureBg,scaledTexCoord()+parallax(5.));';
  const output='gl_FragColor = blend(bg,fg);';
  const fragment=foreground+'\n'+background+'\n'+output;
  const shader={type:'fragment'};
  state.gl.shaderSource(shader,fragment);
  assert.equal(state.shaders[0].shader,shader);
  assert.equal(state.shaders[0].source,fragment);
  const vertex='void main(){gl_Position=vec4(0.,0.,0.,1.);}';
  state.gl.shaderSource({},vertex);
  assert.equal(state.shaders[1].source,vertex);
  assert.equal(state.nativeFrames.size,0,'The photo adapter creates no animation loops');
});

test('water and shine textures pass through exactly while both photo samplers use the selected scenery',()=>{
  const state=setupFrame();state.boot();
  for(const unit of [state.gl.TEXTURE0,state.gl.TEXTURE1]){
    const image={width:2880,height:1620,name:unit===state.gl.TEXTURE0?'water map':'shine'};
    const original=state.texture(unit,image);
    assert.deepEqual(state.uploads.at(-1).args,original.args);
    assert.equal(state.uploads.at(-1).args[5],image);
  }
  for(const [unit,width,height] of [[state.gl.TEXTURE2,192,128],[state.gl.TEXTURE3,384,256]]){
    const embedded={width,height,name:'embedded street photo'};
    state.texture(unit,embedded);
    const image=state.uploads.at(-1).args[5];
    assert.notEqual(image,embedded);
    assert.deepEqual([image.width,image.height],[width,height]);
    assert.equal(image.drawing.draws.length,1);
    const drawing=image.drawing.draws[0];
    assert.equal(drawing.args[0],state.photo);
    assert.equal(drawing.src,'https://images.unsplash.com/photo-forest');
    assert.deepEqual(drawing.args.slice(5),[0,0,width,height]);
    const [left,top,cropWidth,cropHeight]=drawing.args.slice(1,5);
    assert.ok(Math.abs(cropWidth/cropHeight-16/9)<1e-12,'Crop follows the displayed viewport, not 3:2 storage');
    assert.ok(Math.abs(left-(2400-cropWidth)/2)<1e-10);
    assert.ok(Math.abs(top-(1600-cropHeight)/2)<1e-10);
    assert.ok(Math.abs(cropWidth-2400/1.05)<1e-10,'Keep the background\'s 1.05 zoom');
    assert.equal(drawing.filter,unit===state.gl.TEXTURE2?'brightness(.45)':'brightness(.45) blur('+(4*width/1440)+'px)');
  }
  const allocation=[state.gl.TEXTURE_2D,0,state.gl.RGBA,16,16,0,state.gl.RGBA,state.gl.UNSIGNED_BYTE,null];
  state.gl.texImage2D(...allocation);
  assert.deepEqual(state.uploads.at(-1).args,allocation,'Allocation overloads are never treated as scenery');
});

test('photo loading never falls back to the unrelated embedded image',()=>{
  const state=setupFrame({photoComplete:false});state.boot();
  for(const unit of [state.gl.TEXTURE2,state.gl.TEXTURE3]){
    const embedded={width:192,height:128};state.texture(unit,embedded);
    const blank=state.uploads.at(-1).args[5];
    assert.notEqual(blank,embedded);
    assert.equal(blank.drawing.draws.length,0);
  }
  state.gl.drawArrays(state.gl.TRIANGLES,0,6);
  assert.equal(state.canvas.hidden,true,'An early draw with blank placeholders must not expose an opaque black frame');
  state.photo.load();
  assert.equal(state.uploads.length,4,'Both samplers refresh after the actual photo loads');
  for(const upload of state.uploads.slice(-2)) assert.equal(upload.args[5].drawing.draws.at(-1).args[0],state.photo);
  assert.equal(state.draws.length,1,'Photo loading does not draw an uninitialized hidden frame');
  assert.equal(state.canvas.hidden,true);
  assert.equal(state.nativeFrames.size,0);
});

test('changing scenery refreshes both GPU textures while paused and restores texture bindings',()=>{
  const state=setupFrame();state.boot();
  const foreground=state.texture(state.gl.TEXTURE2,{width:192,height:128}).bound;
  const background=state.texture(state.gl.TEXTURE3,{width:384,height:256}).bound;
  state.gl.drawArrays(state.gl.TRIANGLES,0,6);
  const drawsBefore=state.draws.length;
  const otherForeground={name:'other texture2'},otherBackground={name:'other texture3'};
  state.gl.activeTexture(state.gl.TEXTURE2);state.gl.bindTexture(state.gl.TEXTURE_2D,otherForeground);
  state.gl.activeTexture(state.gl.TEXTURE3);state.gl.bindTexture(state.gl.TEXTURE_2D,otherBackground);
  state.gl.activeTexture(state.gl.TEXTURE1);
  state.message({type:'rain-state',running:false,image:'https://images.unsplash.com/photo-next'});
  assert.equal(state.uploads.length,2,'Retain the last valid textures while the new photograph loads');
  assert.equal(state.draws.length,drawsBefore);
  state.photo.load(3600,2400);
  assert.equal(state.uploads.length,4);
  assert.deepEqual(state.uploads.slice(-2).map(upload=>upload.texture),[foreground,background]);
  for(const upload of state.uploads.slice(-2)) assert.equal(upload.args[5].drawing.draws.at(-1).src,'https://images.unsplash.com/photo-next');
  assert.equal(state.gl.getParameter(state.gl.ACTIVE_TEXTURE),state.gl.TEXTURE1);
  assert.equal(state.bindings.get(state.gl.TEXTURE2),otherForeground);
  assert.equal(state.bindings.get(state.gl.TEXTURE3),otherBackground);
  assert.equal(state.draws.length,drawsBefore+1,'Refresh the retained frame once without advancing simulation');
  assert.equal(state.nativeFrames.size,0);
});

test('viewport aspect prevents extra landscape and portrait cropping without changing other uniforms',()=>{
  for(const [width,height] of [[1440,810],[375,812]]){
    const state=setupFrame({width,height});state.boot();
    const program={};
    const ratio=state.gl.getUniformLocation(program,'u_textureRatio');
    state.gl.uniform1f(ratio,1.5);
    assert.equal(state.uniforms.at(-1).value,state.canvas.width/state.canvas.height);
    const brightness=state.gl.getUniformLocation(program,'u_brightness');
    state.gl.uniform1f(brightness,1.04);
    assert.equal(state.uniforms.at(-1).value,1.04);
    state.gl.uniform1f(null,12);
    assert.equal(state.uniforms.at(-1).value,12);
    state.texture(state.gl.TEXTURE3,{width:384,height:256});
    const drawing=state.uploads.at(-1).args[5].drawing.draws[0];
    assert.ok(Math.abs(drawing.args[3]/drawing.args[4]-width/height)<1e-12);
  }
});

test('a paused startup keeps the photograph visible until the renderer produces its first frame',()=>{
  const state=setupFrame();state.boot();
  state.message({type:'rain-state',running:false});
  state.texture(state.gl.TEXTURE2,{width:192,height:128});
  state.texture(state.gl.TEXTURE3,{width:384,height:256});
  assert.equal(state.canvas.hidden,true);
  state.photo.load();
  assert.equal(state.draws.length,0);
  assert.equal(state.canvas.hidden,true);
  state.gl.drawArrays(state.gl.TRIANGLES,0,6);
  assert.equal(state.canvas.hidden,false);
  assert.equal(state.draws.length,1);
  assert.equal(state.nativeFrames.size,0);
});

test('the selected photograph is CORS enabled and the complete rain frame uses normal composition',()=>{
  assert.match(frameHTML,/<img\b[^>]*id="custom-bg"[^>]*crossorigin="anonymous"/);
  assert.match(frameHTML,/<canvas\b[^>]*id="bg-canvas"[^>]*\bhidden\b/);
  const canvasStyle=frameHTML.match(/#bg-canvas\{[^]*?\}/)[0];
  assert.match(canvasStyle,/opacity:\.95/);
  assert.equal(canvasStyle.match(/mix-blend-mode\s*:\s*([^;}\s]+)/)?.[1]||'normal','normal');
});

test('an embedded child waits without advancing animation until its parent supplies state',()=>{
  const state=setupFrame({photoComplete:false});
  state.photo.currentSrc='';
  let calls=0;
  state.window.requestAnimationFrame(()=>calls++);
  state.boot();state.tick();
  assert.equal(state.nativeFrames.size,0);
  assert.equal(calls,0);
  assert.equal(state.photo.src,'','Embedded mode does not request its standalone fallback photograph');
  assert.equal(state.messages.at(-1).type,'rain-ready');
  const image='https://images.unsplash.com/photo-selected';
  state.message({type:'rain-state',running:false,image});
  assert.equal(state.photo.src,image);
  assert.equal(state.messages.filter(message=>message.type==='rain-photo-ready').length,0);
  state.photo.load();
  assert.equal(state.messages.at(-1).type,'rain-photo-ready');
  assert.equal(state.messages.at(-1).image,image);
  state.tick();assert.equal(calls,0);
  state.message({type:'rain-state',running:true,image});
  assert.equal(state.nativeFrames.size,1);
  state.tick();assert.equal(calls,1);
});

test('photo loading on either side of the child boot reports the chosen image and repeats same-src confirmation',()=>{
  for(const order of [['boot','select','load'],['select','load','boot']]){
    const state=setupFrame({photoComplete:false}),image='https://images.unsplash.com/photo-selected';
    state.photo.currentSrc='';
    for(const event of order){
      if(event==='boot') state.boot();
      if(event==='select') state.message({type:'rain-state',running:false,image});
      if(event==='load') state.photo.load();
    }
    const acknowledgements=()=>state.messages.filter(message=>message.type==='rain-photo-ready');
    assert.equal(acknowledgements().length,1,order.join(' -> '));
    assert.equal(acknowledgements()[0].image,image);
    assert.ok(state.messages.some(message=>message.type==='rain-ready'));
    state.message({type:'rain-state',running:false,image});
    assert.equal(state.photo.complete,true,'Same-src confirmation does not restart the image request');
    assert.equal(acknowledgements().length,2,'A parent that hides and reselects a cached image receives another confirmation');
    assert.equal(acknowledgements()[1].image,image);
    assert.equal(state.nativeFrames.size,0);
  }
});

test('unrelated senders and unsupported photo origins cannot replace or start the embedded scenery',()=>{
  const state=setupFrame({photoComplete:false});
  state.photo.currentSrc='';
  state.window.requestAnimationFrame(()=>assert.fail('An untrusted message resumed the animation'));
  state.message({type:'rain-state',running:true,image:'https://images.unsplash.com/photo-untrusted'},{});
  assert.equal(state.photo.src,'');
  assert.equal(state.nativeFrames.size,0);
  for(const image of ['http://images.unsplash.com/photo-insecure','https://images.unsplash.com.evil.example/photo','https://example.com/unrelated']){
    state.message({type:'rain-state',running:false,image});
    assert.equal(state.photo.src,'');
  }
  assert.equal(state.messages.filter(message=>message.type==='rain-photo-ready').length,0);
});

test('standalone rain selects its default photograph and can animate without a parent handshake',()=>{
  const state=setupFrame({photoComplete:false,standalone:true});
  assert.equal(state.photo.src,state.photo.dataset.defaultSrc);
  let calls=0;
  state.window.requestAnimationFrame(()=>calls++);
  assert.equal(state.nativeFrames.size,1);
  state.tick();assert.equal(calls,1);
  const imageTag=frameHTML.match(/<img\b[^>]*id="custom-bg"[^>]*>/)[0];
  assert.doesNotMatch(imageTag,/\ssrc\s*=/,'The HTML itself must not start a fallback request in embedded mode');
  assert.match(imageTag,/data-default-src=/);
});
