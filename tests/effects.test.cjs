const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../effects.js'),'utf8');

function setup({motion=true,available=true}={}){
  const handlers=new Map(),frames=new Map(),preferences=new Map();
  let id=0,draws=0;
  const listen=(name,fn)=>{if(!handlers.has(name)) handlers.set(name,[]);handlers.get(name).push(fn);};
  const drawing=new Proxy({
    createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),
    createLinearGradient:()=>({addColorStop(){}}),
    drawImage(){draws++;}
  },{get:(object,key)=>key in object?object[key]:()=>{}});
  const makeCanvas=()=>({hidden:true,width:0,height:0,getContext:()=>available?drawing:null,toDataURL:()=> 'data:image/png;base64,test'});
  const canvas=makeCanvas(),photo={naturalWidth:3840,naturalHeight:2160};
  const document={hidden:false,documentElement:{dataset:{}},addEventListener:listen,
    getElementById:id=>id==='rain'?canvas:{setAttribute(){}},createElement:makeCanvas,querySelector:()=>photo};
  const context=vm.createContext({document,window:{addEventListener:listen},innerWidth:1440,innerHeight:810,devicePixelRatio:2,
    RAIN:true,motion, motionEnabled:()=>context.motion,
    requestAnimationFrame:fn=>{frames.set(++id,fn);return id;},cancelAnimationFrame:id=>frames.delete(id),
    setTimeout:fn=>{fn();return 0;},clearTimeout(){},
    matchMedia:query=>{const pref={matches:query.includes('pointer: fine'),addEventListener:(name,fn)=>listen(query,fn)};preferences.set(query,pref);return pref;}
  });
  vm.runInContext(source,context);
  const emit=(name,detail)=>handlers.get(name)?.forEach(fn=>fn({detail}));
  const tick=time=>{const current=[...frames.entries()];for(const [id,fn] of current){frames.delete(id);fn(time);}};
  return {canvas,context,document,frames,preferences,emit,tick,draws:()=>draws};
}

test('rain keeps one animation loop and stops for pause, hidden tabs and printing',()=>{
  const state=setup();
  assert.equal(state.frames.size,1);
  state.tick(100); state.tick(140);
  assert.equal(state.frames.size,1);
  assert.ok(state.draws()>10);
  state.context.motion=false;state.emit('ambiencechange');
  assert.equal(state.frames.size,0);
  assert.equal(state.canvas.hidden,false,'Paused rain remains a static window texture');
  state.context.motion=true;state.emit('ambiencechange');
  state.document.hidden=true;state.emit('visibilitychange');
  assert.equal(state.frames.size,0);
  state.document.hidden=false;state.emit('visibilitychange');
  assert.equal(state.frames.size,1);
  state.emit('beforeprint');assert.equal(state.frames.size,0);
  state.emit('afterprint');assert.equal(state.frames.size,1);
  state.emit('pagehide');assert.equal(state.frames.size,0);
});

test('failed or changing images and disabled rain stop rendering',()=>{
  const state=setup();
  state.emit('wallpaperchange',null);
  assert.equal(state.frames.size,0);assert.equal(state.canvas.hidden,true);
  state.emit('wallpaperchange',{naturalWidth:1920,naturalHeight:1080});
  assert.equal(state.frames.size,1);assert.equal(state.canvas.hidden,false);
  state.context.RAIN=false;state.emit('ambiencechange');
  assert.equal(state.frames.size,0);assert.equal(state.canvas.hidden,true);
});

test('reduced motion, contrast preferences and unavailable canvas degrade without loops',()=>{
  assert.equal(setup({motion:false}).frames.size,0);
  assert.equal(setup({available:false}).frames.size,0);
  const state=setup();
  const query='(prefers-contrast: more)';
  state.preferences.get(query).matches=true;state.emit(query);
  assert.equal(state.frames.size,0);assert.equal(state.canvas.hidden,true);
});
