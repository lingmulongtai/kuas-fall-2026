const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const materials=require('../glass-materials.js');
const source=fs.readFileSync(require('node:path').join(__dirname,'../glass-renderer.js'),'utf8');
const context=vm.createContext({});
vm.runInContext(source.slice(source.indexOf('  function materialNeedsPyramid('),source.indexOf('  function buildPyramid(')),context);
test('only materials that use Gaussian output build its pyramid',()=>{
  assert.deepEqual(materials.presets.filter(p=>context.materialNeedsPyramid(p.p)).map(p=>p.id),['apple','apple-clear','frosted']);
  for(const key of ['blur','frost','pickup'])assert.equal(context.materialNeedsPyramid({blur:0,frost:0,pickup:0,[key]:.001}),true);
});
