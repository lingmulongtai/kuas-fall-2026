const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const app = fs.readFileSync(path.join(__dirname,'../app.js'),'utf8');
const start = app.indexOf('/* Curated Unsplash');
const end = app.indexOf('/* Motion never');
assert.ok(start>=0 && end>start,'The wallpaper module is present');
const source = app.slice(start,end);

function setup(storage=new Map()){
  const pending = [];
  const timers = new Map();
  const elements = {wallpaper:{hidden:true,replaceChildren(image){this.image=image;}},'photo-credit':{hidden:true,innerHTML:''},'shuffle-btn':{disabled:false},'background-status':{textContent:''}};
  let timerId = 0;
  const context = vm.createContext({
    store:{get:key=>storage.get(key)||null,set:(key,value)=>storage.set(key,value)},
    window:{innerWidth:375,innerHeight:812,devicePixelRatio:3,dispatchEvent(){}},
    CustomEvent:class{constructor(type,options){this.type=type;this.detail=options.detail;}},
    Image:class{set src(value){this.url=value;pending.push(this);}removeAttribute(){this.url=null;}},
    setTimeout:callback=>{timers.set(++timerId,callback);return timerId;},
    clearTimeout:id=>timers.delete(id),
    theme:'light',lang:'ja',
    resolvedTheme:()=>context.theme,
    $:id=>elements[id],
    t:()=>context.lang==='ja'?'背景写真：{name} / Unsplash':'Photo: {name} / Unsplash',
    fill:(text,values)=>text.replace('{name}',values.name),
    esc:text=>text.replace(/&/g,'&amp;')
  });
  vm.runInContext(source+'\nglobalThis.background = {WALLPAPERS,nextWallpaper,updateWallpaper,wallpaperSize};',context);
  return {context,api:context.background,pending,timers,elements,storage};
}
const flush = ()=>new Promise(resolve=>setImmediate(resolve));

test('each theme cycles through its photographs and never immediately repeats across reloads',()=>{
  const storage = new Map();
  for(const theme of ['light','dark']){
    const ids=[];
    const size=setup().api.WALLPAPERS[theme].length;
    for(let i=0;i<size*4;i++) ids.push(setup(storage).api.nextWallpaper(theme).id);
    assert.equal(new Set(ids.slice(0,size)).size,size);
    for(let i=1;i<ids.length;i++) assert.notEqual(ids[i],ids[i-1]);
  }
});

test('invalid storage and stale photo IDs are repaired',()=>{
  for(const value of ['not json','null','42','{"remaining":"bad"}','{"remaining":["missing","missing"]}']){
    const {api}=setup(new Map([['wallpaper-light',value]]));
    assert.ok(api.WALLPAPERS.light.includes(api.nextWallpaper('light')));
  }
});

test('a slow old theme cannot replace the latest theme, and loaded images are reused',async()=>{
  const {context,api,pending,elements}=setup();
  const light=api.updateWallpaper();
  context.theme='dark';
  const dark=api.updateWallpaper();
  assert.equal(pending.length,2);
  pending[1].onload();await dark;
  const darkImage=elements.wallpaper.image;
  pending[0].onload();await light;
  assert.equal(elements.wallpaper.image,darkImage);
  context.theme='light';await api.updateWallpaper();
  assert.equal(elements.wallpaper.image,pending[0]);
  assert.equal(pending.length,2);
  context.lang='en';await api.updateWallpaper();
  assert.match(elements['photo-credit'].innerHTML,/Photo:/);
  assert.equal(pending.length,2);
  assert.match(pending[0].url,/w=938&h=2030&q=90/);
  assert.equal(pending[0].referrerPolicy,'no-referrer');
});

test('high-density and ultrawide displays retain their aspect ratio within the 4K budget',()=>{
  const {api,context}=setup();
  for(const [width,height,dpr] of [[1920,1080,2],[3440,1440,2],[375,812,3],[1080,1920,2]]){
    Object.assign(context.window,{innerWidth:width,innerHeight:height,devicePixelRatio:dpr});
    const size=api.wallpaperSize();
    assert.ok(Math.max(size.width,size.height)<=3840);
    assert.ok(size.width*size.height<=8294400+3840);
    assert.ok(Math.abs(size.width/size.height-width/height)<0.002);
  }
  Object.assign(context.window,{innerWidth:1920,innerHeight:1080,devicePixelRatio:2});
  assert.equal(api.wallpaperSize().width,3840);
  assert.equal(api.wallpaperSize().height,2160);
});

test('manual shuffle gets a new photograph and stale requests cannot overwrite it',async()=>{
  const {api,pending,elements}=setup();
  const first=api.updateWallpaper();
  const shuffle=api.updateWallpaper(true);
  assert.notEqual(pending[0].url,pending[1].url);
  assert.equal(elements['shuffle-btn'].disabled,true);
  pending[1].onload();await shuffle;
  pending[0].onload();await first;
  assert.equal(elements.wallpaper.image,pending[1]);
  assert.equal(elements['shuffle-btn'].disabled,false);
});

test('manual shuffle can recover after provider failures without reloading',async()=>{
  const {api,pending,elements}=setup();
  const update=api.updateWallpaper();
  for(let i=0;i<3;i++){pending[i].onerror();await flush();}
  await update;
  const retry=api.updateWallpaper(true);
  pending[3].onload();await retry;
  assert.equal(elements.wallpaper.hidden,false);
  assert.equal(elements['background-status'].textContent,'');
});

test('three failed or timed-out images leave a usable solid background',async()=>{
  const {api,pending,timers,elements}=setup();
  const update=api.updateWallpaper();
  pending[0].onerror();await flush();
  const timeout=[...timers.values()][0];timeout();await flush();
  pending[2].onerror();await update;
  assert.equal(pending.length,3);
  assert.equal(timers.size,0);
  assert.equal(elements.wallpaper.hidden,true);
  assert.equal(elements['photo-credit'].hidden,true);
  await api.updateWallpaper();
  assert.equal(pending.length,3,'Re-rendering does not repeatedly hit a failed provider');
});

test('a successful retry displays the matching credit',async()=>{
  const {api,pending,elements}=setup();
  const update=api.updateWallpaper();
  pending[0].onerror();await flush();
  pending[1].onload();await update;
  const photo=api.WALLPAPERS.light.find(photo=>pending[1].url.includes(photo.id));
  assert.equal(elements.wallpaper.hidden,false);
  assert.equal(elements.wallpaper.image,pending[1]);
  assert.ok(elements['photo-credit'].innerHTML.includes(photo.author));
  assert.ok(elements['photo-credit'].innerHTML.includes(photo.page));
});
