const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../effects.js'),'utf8');
const frameSource=fs.readFileSync(path.join(__dirname,'../rain.html'),'utf8').match(/<script>([\s\S]*?)<\/script>/)[1];

function setup({motion=true}={}){
  const handlers=new Map(),frames=new Map(),timers=new Map(),preferences=new Map(),created=[];
  let id=0;
  const listen=(name,fn)=>{if(!handlers.has(name)) handlers.set(name,[]);handlers.get(name).push(fn);};
  const drawing={createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),putImageData(){}};
  const layer={hidden:true,children:[],replaceChildren(child){this.children=[child];}};
  const photo={naturalWidth:3840,naturalHeight:2160,src:'https://images.unsplash.com/photo-test?w=3840'};
  const document={hidden:false,documentElement:{dataset:{}},addEventListener:listen,
    getElementById:id=>id==='rain'?layer:{setAttribute(){}},querySelector:()=>photo,
    createElement(tag){
      if(tag==='canvas') return {getContext:()=>drawing,toDataURL:()=> 'data:image/png;base64,test'};
      const messages=[],attributes={};
      const frame={contentWindow:{postMessage:message=>messages.push(message)},messages,attributes,
        setAttribute:(key,value)=>attributes[key]=value,remove(){layer.children=layer.children.filter(child=>child!==frame);}};
      created.push(frame);return frame;
    }
  };
  const context=vm.createContext({document,window:{addEventListener:listen},RAIN:true,motion,motionEnabled:()=>context.motion,
    requestAnimationFrame:fn=>{frames.set(++id,fn);return id;},cancelAnimationFrame:id=>frames.delete(id),
    setTimeout:fn=>{timers.set(++id,fn);return id;},clearTimeout:id=>timers.delete(id),
    matchMedia:query=>{const pref={matches:query.includes('pointer: fine'),addEventListener:(name,fn)=>listen(query,fn)};preferences.set(query,pref);return pref;}
  });
  vm.runInContext(source,context);
  const emit=(name,event={})=>handlers.get(name)?.forEach(fn=>fn(event));
  const resize=()=>{emit('resize');for(const [id,fn] of timers){timers.delete(id);fn();}};
  return {context,document,layer,created,preferences,emit,resize};
}

test('the reference renderer gets one isolated background frame and the current photograph',()=>{
  const state=setup(),frame=state.created[0];
  assert.equal(state.layer.hidden,false);
  assert.equal(frame.src,'rain.html');
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

test('rain off and unavailable photographs remove the rendering document',()=>{
  const state=setup();
  state.context.RAIN=false;state.emit('ambiencechange');
  assert.equal(state.layer.children.length,0);assert.equal(state.layer.hidden,true);
  state.context.RAIN=true;state.emit('ambiencechange');
  assert.equal(state.layer.children.length,1);
  state.emit('wallpaperchange',{detail:null});
  assert.equal(state.layer.children.length,0);
  state.emit('wallpaperchange',{detail:{naturalWidth:1920,src:'https://images.unsplash.com/photo-next'}});
  assert.equal(state.layer.children.length,1);
  assert.equal(state.layer.children[0].messages.at(-1).image,'https://images.unsplash.com/photo-next');
});

test('resize rebuilds dimensions, contrast hides rain, and only the active frame can report failure',()=>{
  const state=setup(),old=state.created[0];
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

function setupFrame({webgl=true}={}){
  const handlers=new Map(),nativeFrames=new Map(),scripts=[],messages=[];
  let id=0;
  const listen=(name,fn)=>{if(!handlers.has(name)) handlers.set(name,[]);handlers.get(name).push(fn);};
  const photo={complete:true,src:'https://images.unsplash.com/photo-forest',addEventListener:listen};
  const canvas={addEventListener:listen,getContext(type,options){
    this.viewport=[this.width,this.height];this.options=options;return webgl?{options}:null;
  }};
  const parent={postMessage:message=>messages.push(message)};
  const window={addEventListener:listen,innerWidth:1440,innerHeight:810,devicePixelRatio:2,
    requestAnimationFrame:fn=>{nativeFrames.set(++id,fn);return id;},cancelAnimationFrame:id=>nativeFrames.delete(id)};
  const document={getElementById:id=>id==='bg-canvas'?canvas:photo,addEventListener:listen,
    createElement:()=>({}),head:{appendChild:script=>scripts.push(script)},dispatchEvent(){}};
  vm.runInNewContext(frameSource,{window,document,parent,URL,console,MouseEvent:class{}});
  const message=data=>handlers.get('message').forEach(fn=>fn({source:parent,data}));
  const tick=()=>{for(const [id,fn] of [...nativeFrames]){nativeFrames.delete(id);fn(100);}};
  return {window,photo,canvas,parent,scripts,messages,nativeFrames,message,tick,handlers};
}

test('both external animation loops freeze, resume without duplication, and support cancellation',()=>{
  const state=setupFrame();let calls=0;
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
