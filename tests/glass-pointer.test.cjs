const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync(require('node:path').join(__dirname,'../glass-renderer.js'),'utf8');
const code=source.slice(source.indexOf('  function trackPointer('),source.indexOf('  for(const pref'));
function setup(){
  const handlers=new Map();
  const listen=target=>(type,fn)=>handlers.set(target+':'+type,fn);
  const touch={x:-1e4,y:-1e4,strength:0};
  const document={hidden:false,addEventListener:listen('document'),documentElement:{addEventListener:listen('root')}};
  vm.runInNewContext(code,{touch,left:15,top:20,document,window:{addEventListener:listen('window')},invalidate(){},requestRainBitmap(){}});
  const emit=(type,options={},target='document')=>handlers.get(target+':'+type)?.({isPrimary:true,pointerType:'mouse',clientX:100,clientY:120,...options});
  return {touch,document,emit};
}
test('hover follows the pointer without a click and remains after mouse or pen release',()=>{
  for(const pointerType of ['mouse','pen']){
    const s=setup();s.emit('pointermove',{pointerType});
    assert.deepEqual(s.touch,{x:85,y:100,strength:1});
    s.emit('pointerdown',{pointerType,clientX:120});
    s.emit('pointerup',{pointerType,clientX:140});
    assert.deepEqual(s.touch,{x:125,y:100,strength:1});
  }
});
test('touch starts at the actual contact and clears on release or cancellation',()=>{
  for(const ending of ['pointerup','pointercancel']){
    const s=setup();s.emit('pointerdown',{pointerType:'touch'});
    assert.deepEqual(s.touch,{x:85,y:100,strength:1});
    s.emit('pointermove',{pointerType:'touch',clientX:130});
    assert.equal(s.touch.x,115);
    s.emit(ending,{pointerType:'touch'});
    assert.deepEqual(s.touch,{x:-1e4,y:-1e4,strength:0});
  }
});
test('secondary contacts cannot move or clear the primary highlight',()=>{
  const s=setup();s.emit('pointermove');
  for(const type of ['pointerdown','pointermove','pointerup','pointercancel'])s.emit(type,{isPrimary:false,pointerType:'touch',clientX:999});
  s.emit('pointerleave',{isPrimary:false,pointerType:'touch'},'root');
  assert.deepEqual(s.touch,{x:85,y:100,strength:1});
});
test('leaving the page, losing focus and hiding the document clear stale highlights',()=>{
  for(const [event,target] of [['pointerleave','root'],['blur','window'],['visibilitychange','document']]){
    const s=setup();s.emit('pointermove');
    s.document.hidden=true;s.emit(event,{},target);
    assert.equal(s.touch.strength,0);
    s.document.hidden=false;s.emit('visibilitychange');
    assert.equal(s.touch.strength,0);
    s.emit('pointermove');assert.equal(s.touch.strength,1);
  }
});
