const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync(require('node:path').join(__dirname,'../glass-renderer.js'),'utf8');
const code=source.slice(source.indexOf('  function batchSurfaces('),source.indexOf('  function collect()'));
const context=vm.createContext({Math});vm.runInContext(code,context);
const material={merge:24},clip={key:'viewport'};
const shape=(left,top,m=material,c=clip)=>({rect:{left,top,width:40,height:40},m,clip:c});
test('adjacent compact controls are rendered in separate optical containers',()=>{
  const shapes=[shape(0,0),shape(52,0),shape(104,0),shape(0,52),shape(52,52)];
  const batches=context.batchSurfaces(shapes,96);
  assert.equal(batches.flat().length,shapes.length);
  for(const batch of batches)for(const a of batch)for(const b of batch){
    if(a===b)continue;
    const dx=Math.max(a.rect.left-b.rect.left-40,b.rect.left-a.rect.left-40,0);
    const dy=Math.max(a.rect.top-b.rect.top-40,b.rect.top-a.rect.top-40,0);
    assert.ok(Math.hypot(dx,dy)>=24);
  }
  assert.ok(batches.length>1);
  assert.equal(material.merge,24,'Preserve the material parameter');
});
test('distant controls can share a pass while materials, clips and capacity stay isolated',()=>{
  assert.equal(context.batchSurfaces([shape(0,0),shape(80,0)],96).length,1);
  assert.equal(context.batchSurfaces([shape(0,0),shape(80,0)],1).length,2);
  assert.equal(context.batchSurfaces([shape(0,0),shape(80,0,{merge:24})],96).length,2);
  assert.equal(context.batchSurfaces([shape(0,0),shape(80,0,material,{key:'scroll'})],96).length,2);
});
