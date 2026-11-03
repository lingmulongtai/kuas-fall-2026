const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync(require('node:path').join(__dirname,'../glass-renderer.js'),'utf8');
const luminance=source.slice(source.indexOf('  const lin='),source.indexOf('  function measure('));
const helpers=source.slice(source.indexOf('  function chooseLabelInk('),source.indexOf('  function resetLabelContrast('));
function setup(){
  const body={},colors=new Map([['clear',[0,0,0,0]],['white',[255,255,255,255]],['black',[0,0,0,255]],['half-white',[255,255,255,128]],['half-black',[0,0,0,128]]]);
  const context=vm.createContext({Math,Map,document:{body},colorCache:colors,getComputedStyle:node=>({backgroundColor:node.color||'clear'}),
    left:0,top:0,width:100,height:100,inkPixels:new Uint8Array(100*100*4),clamp:(v,a,b)=>Math.max(a,Math.min(b,v))});
  vm.runInContext(luminance+helpers,context);
  return {context,body};
}
test('auto chooses black on bright glass and white on dark glass',()=>{
  const {context:c}=setup();
  for(const value of [0,.01,.05,.1])assert.equal(c.chooseLabelInk([value]),'light');
  for(const value of [.3,.5,.8,1])assert.equal(c.chooseLabelInk([value]),'dark');
});
test('small brightness changes do not make rain alternate text colours',()=>{
  const {context:c}=setup();
  assert.equal(c.chooseLabelInk([.19],'dark'),'dark');
  assert.equal(c.chooseLabelInk([.20],'light'),'light');
  assert.equal(c.chooseLabelInk([.65],'light'),'dark');
  assert.equal(c.chooseLabelInk([.02],'dark'),'light');
});
test('transient rain changes are ignored while scene resets take effect immediately',()=>{
  const {context:c}=setup();
  assert.equal(c.stabiliseLabelInk('dark',undefined,undefined,0).color,'dark');
  let state=c.stabiliseLabelInk('light','dark',undefined,100);
  assert.equal(state.color,'dark');
  state=c.stabiliseLabelInk('dark','dark',state.pending,230);
  assert.equal(state.pending,null);
  state=c.stabiliseLabelInk('light','dark',state.pending,400);
  assert.equal(c.stabiliseLabelInk('light','dark',state.pending,899).color,'dark');
  assert.equal(c.stabiliseLabelInk('light','dark',state.pending,900).color,'light');
});
test('automatic reversals must each sustain the new colour for 500ms',()=>{
  const {context:c}=setup();
  let state=c.stabiliseLabelInk('dark','light',undefined,100);
  state=c.stabiliseLabelInk('dark','light',state.pending,600);
  assert.equal(state.color,'dark');
  state=c.stabiliseLabelInk('light','dark',undefined,610);
  assert.equal(c.stabiliseLabelInk('light','dark',state.pending,1000).color,'dark');
  assert.equal(c.stabiliseLabelInk('light','dark',state.pending,1110).color,'light');
});
test('the harder-to-read parts of mixed backgrounds influence the result',()=>{
  const {context:c}=setup();
  assert.equal(c.chooseLabelInk([...Array(70).fill(.1),...Array(30).fill(.6)]),'dark');
});
test('sampling follows individual text positions and the framebuffer Y axis',()=>{
  const {context:c}=setup();
  for(let y=0;y<100;y++)for(let x=0;x<100;x++){
    const i=((99-y)*100+x)*4;c.inkPixels.fill(y<50?255:0,i,i+4);
  }
  const backdrop=[0,0,0,0];
  const top=c.sampleLabel([{left:10,top:5,right:90,bottom:25}],backdrop,100,100);
  const bottom=c.sampleLabel([{left:10,top:75,right:90,bottom:95}],backdrop,100,100);
  assert.equal(c.chooseLabelInk(top),'dark');
  assert.equal(c.chooseLabelInk(bottom),'light');
});
test('opaque DOM badges override the glass behind them',()=>{
  const {context:c,body}=setup();
  c.inkPixels.fill(255);
  const el={color:'black',parentElement:body};
  const backdrop=c.labelBackdrop(el,new Map());
  assert.deepEqual(Array.from(backdrop),[0,0,0,1]);
  assert.equal(c.chooseLabelInk(c.sampleLabel([{left:0,top:0,right:80,bottom:30}],backdrop,100,100)),'light');
});
test('translucent nested fills composite in paint order and exclude the body behind WebGL',()=>{
  const {context:c,body}=setup();
  body.color='white';
  const parent={color:'half-white',parentElement:body},el={color:'half-black',parentElement:parent};
  const rgba=c.labelBackdrop(el,new Map());
  assert.ok(Math.abs(rgba[0]-84.7774869)<.001);
  assert.ok(Math.abs(rgba[3]-.75195694)<.00001);
  assert.deepEqual(Array.from(c.labelBackdrop({parentElement:body},new Map())),[0,0,0,0]);
});
test('throttled updates schedule one trailing measurement when cursor movement stops',()=>{
  const timers=new Map();let id=0,invalidations=0;
  const context=vm.createContext({root:{dataset:{textColor:'auto'}},document:{getAnimations:()=>[]},performance:{now:()=>50},
    contrastUrgent:false,lastContrast:0,contrastTimer:0,Math,
    setTimeout(fn,delay){assert.equal(delay,70);timers.set(++id,fn);return id;},clearTimeout:key=>timers.delete(key),invalidate:()=>invalidations++});
  vm.runInContext(source.slice(source.indexOf('  function updateLabelContrast('),source.indexOf('  function drawLayer(')),context);
  context.updateLabelContrast();context.updateLabelContrast();
  assert.equal(timers.size,1);
  timers.values().next().value();
  assert.equal(context.contrastTimer,0);assert.equal(invalidations,1);
  context.contrastTimer=42;timers.set(42,()=>assert.fail('Manual colour must cancel auto work'));
  context.root.dataset.textColor='white';context.updateLabelContrast();
  assert.equal(timers.has(42),false);
});
test('pending colours continue evaluating without rain or further pointer events',()=>{
  let now=100,id=0;const timers=new Map(),el={dataset:{autoInk:'light'}},history=new WeakMap([[el,'light']]);
  const context=vm.createContext({root:{dataset:{textColor:'auto'}},document:{getAnimations:()=>[]},performance:{now:()=>now},
    contrastUrgent:true,lastContrast:0,contrastTimer:0,labelLayoutDirty:false,labelLayout:[{el}],inkHistory:history,inkCandidates:new WeakMap(),
    inkPixels:null,width:1,height:1,programs:{cover:{}},rtex:()=>({}),drawTo(){},gl:{readPixels(){}},
    sampleLabel:()=>[.8],chooseLabelInk:()=> 'dark',
    setTimeout(fn){timers.set(++id,fn);return id;},clearTimeout:key=>timers.delete(key),invalidate(){}});
  vm.runInContext(source.slice(source.indexOf('  function stabiliseLabelInk('),source.indexOf('  function labelBackdrop('))+source.slice(source.indexOf('  function updateLabelContrast('),source.indexOf('  function drawLayer(')),context);
  context.updateLabelContrast();
  assert.equal(el.dataset.autoInk,'light');assert.equal(timers.size,1);
  now=700;context.updateLabelContrast();
  assert.equal(el.dataset.autoInk,'dark');assert.equal(timers.size,0);
});
test('the first rain image resets colour history while subsequent water frames retain it',()=>{
  let handler,resets=0,closed=0;const sender={},photo={src:'https://images.unsplash.com/photo-test'};
  const context=vm.createContext({window:{addEventListener(type,fn){handler=fn;}},document:{querySelector:()=>({contentWindow:sender})},photo,
    rainImage:null,sourceDirty:false,resetLabelContrast:()=>resets++,invalidate(){},requestAnimationFrame(){}});
  vm.runInContext(source.slice(source.indexOf("  window.addEventListener('message'"),source.indexOf('  function layoutChanged(')),context);
  const image=()=>({close(){closed++;}});
  handler({source:sender,data:{type:'rain-bitmap',photo:photo.src,image:image()}});
  assert.equal(resets,1);
  handler({source:sender,data:{type:'rain-bitmap',photo:photo.src,image:image()}});
  assert.equal(resets,1);assert.equal(closed,1);
  handler({source:sender,data:{type:'rain-bitmap',photo:'https://images.unsplash.com/stale',image:image()}});
  assert.equal(resets,1);assert.equal(closed,2);
});
