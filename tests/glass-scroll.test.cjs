const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const assert=require('node:assert/strict');
const test=require('node:test');
const vm=require('node:vm');

const source=readFileSync(join(__dirname,'../glass-renderer.js'),'utf8');
const controller=source.slice(source.indexOf('  function duringScroll('),source.indexOf('  function hoveredLabelChanged('));
const invalidation=source.slice(source.indexOf('  function invalidate('),source.indexOf('  function refreshTargets('));

test('scrolling cancels stale glass frames and waits for the latest position',()=>{
  let id=10, queued=0;
  const timers=new Map([[2,()=>{}]]),cancelled=[];
  const context=vm.createContext({
    root:{dataset:{optics:'ready'}}, scrollTimer:0, contrastTimer:2, raf:3,
    setTimeout(fn){timers.set(++id,fn);return id;}, clearTimeout(timer){timers.delete(timer);},
    requestAnimationFrame(){queued++;return ++id;}, cancelAnimationFrame(frame){cancelled.push(frame);},
    layoutChanged(){context.invalidate();}, render(){},
  });
  vm.runInContext(controller+invalidation,context);
  context.duringScroll();
  assert.equal(context.root.dataset.optics,'scrolling');
  assert.deepEqual(cancelled,[3]);
  assert.equal(timers.has(2),false);
  const first=context.scrollTimer;
  context.invalidate();
  assert.equal(queued,0,'Animated background frames wait while scrolling');
  context.duringScroll();
  assert.equal(timers.has(first),false);
  timers.get(context.scrollTimer)();
  assert.equal(queued,1);
  assert.equal(context.root.dataset.optics,'scrolling','CSS glass stays visible until the redraw');
  context.duringScroll();
  assert.equal(cancelled.length,2,'A new scroll cancels the queued redraw');
});
