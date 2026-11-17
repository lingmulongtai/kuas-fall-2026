const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const assert=require('node:assert/strict');
const test=require('node:test');
const vm=require('node:vm');

const source=readFileSync(join(__dirname,'../glass-renderer.js'),'utf8');
const bounds=source.slice(source.indexOf('  function pixelBounds('),source.indexOf('  function planeFor('));

test('the padded glass buffer crops to the scroller without extending its native range',()=>{
  const context=vm.createContext({
    canvas:{width:1193,height:2738},width:596.5,height:1369,left:-102.5,top:-256,
    clamp:(value,min,max)=>Math.max(min,Math.min(max,value)),
  });
  vm.runInContext(bounds,context);
  const crop=context.pixelBounds(10.3,-44.8,298.1,1550);
  assert.deepEqual({...crop},{x:226,y:423,right:801,bottom:2738});
  assert.ok(context.left+crop.x/2>=10.3);
  assert.ok(context.left+crop.right/2<=298.1);
});

test('a resized calendar uses the new content width instead of the previous canvas extent',()=>{
  const context=vm.createContext({getComputedStyle:()=>({paddingRight:'3px',paddingBottom:'24px'})});
  const content=source.slice(source.indexOf('  function scrollContent('),source.indexOf('  function presentGroups('));
  vm.runInContext(content,context);
  const host={
    clientLeft:0,clientTop:0,clientWidth:662,clientHeight:420,scrollWidth:863,
    querySelector:()=>({getBoundingClientRect:()=>({right:659,bottom:390})}),
  };
  const extent=context.scrollContent(host,{left:0,top:0},{left:0,top:0});
  assert.deepEqual({...extent},{right:662,bottom:420});
});

test('nested glass restores only the pixels it painted outside the scrollport',()=>{
  const context=vm.createContext({});
  vm.runInContext(source.slice(source.indexOf('  function hasPixels('),source.indexOf('  function drawRegion('))+
    source.slice(source.indexOf('  function outsideVisible('),source.indexOf('  function pixelBounds(')),context);
  const region={x:10,y:20,right:110,bottom:120};
  const visible={x:40,y:30,right:70,bottom:90};
  assert.deepEqual(Array.from(context.outsideVisible(region,visible),r=>({...r})),[
    {x:10,y:20,right:110,bottom:30},
    {x:10,y:90,right:110,bottom:120},
    {x:10,y:30,right:40,bottom:90},
    {x:70,y:30,right:110,bottom:90}
  ]);
  assert.equal(context.outsideVisible(visible,region).length,0);
  assert.equal(context.outsideVisible(region,{...visible,y:130,bottom:140})[0],region);
});
