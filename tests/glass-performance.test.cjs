const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const materials=require('../glass-materials.js');
const source=fs.readFileSync(require('node:path').join(__dirname,'../glass-renderer.js'),'utf8');
const context=vm.createContext({window:{GlassMaterials:materials},root:{dataset:{material:'prism'}},targets:[]});
vm.runInContext(source.slice(source.indexOf('  function materialNeedsPyramid('),source.indexOf('  function buildPyramid(')),context);
vm.runInContext(source.slice(source.indexOf('  function sourceLuminanceNeeded('),source.indexOf('  function uploadSource(')),context);
test('only materials that use Gaussian output build its pyramid',()=>{
  assert.deepEqual(materials.presets.filter(p=>context.materialNeedsPyramid(p.p)).map(p=>p.id),['apple','apple-clear','frosted']);
  for(const key of ['blur','frost','pickup'])assert.equal(context.materialNeedsPyramid({blur:0,frost:0,pickup:0,[key]:.001}),true);
});
test('source luminance is needed only for adaptive appearance or background dimming',()=>{
  assert.deepEqual(materials.presets.filter(p=>context.materialNeedsStatistics(p.p)).map(p=>p.id),['apple','apple-clear','frosted']);
  for(const preset of materials.presets){
    context.root.dataset.material=preset.id;
    assert.equal(context.sourceLuminanceNeeded(),['apple','apple-clear','frosted'].includes(preset.id));
  }
});
test('visible material previews request fresh statistics even under a clear selected material',()=>{
  context.root.dataset.material='prism';
  const preview={dataset:{materialPreview:'apple'},checkVisibility:()=>false};
  context.targets=[preview];assert.equal(context.sourceLuminanceNeeded(),false);
  preview.checkVisibility=()=>true;assert.equal(context.sourceLuminanceNeeded(),true);
  preview.dataset.materialPreview='thick';assert.equal(context.sourceLuminanceNeeded(),false);
});
