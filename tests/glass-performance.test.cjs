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
test('successive full-resolution frames reuse storage and reallocate only after resize',()=>{
  const calls={allocate:0,update:0,mipmap:0,resize:0,paint:0};let width=0,height=0;
  const sourceCanvas={get width(){return width;},set width(value){width=value;calls.resize++;},get height(){return height;},set height(value){height=value;calls.resize++;}};
  const canvas={width:786,height:1704};
  const gl={texImage2D(...args){assert.equal(args.at(-1),sourceCanvas);calls.allocate++;},texSubImage2D(...args){assert.equal(args.at(-1),sourceCanvas);calls.update++;},generateMipmap(){calls.mipmap++;},pixelStorei(){},texParameteri(){}};
  const c=vm.createContext({canvas,source:sourceCanvas,gl,cx:{fillRect(){calls.paint++;},drawImage(){}},RAIN:false,photo:null,root:{dataset:{theme:'dark'}},bindTex(){},imageTex:{},imageWidth:0,imageHeight:0,sourceStatisticsCurrent:true,sourceDirty:true});
  vm.runInContext(source.slice(source.indexOf('  function uploadSource('),source.indexOf('  function updateSourceStatistics(')),c);
  c.uploadSource();c.uploadSource();
  assert.deepEqual(calls,{allocate:1,update:1,mipmap:2,resize:2,paint:2});
  assert.equal(c.sourceStatisticsCurrent,false);
  canvas.width=1704;canvas.height=786;c.uploadSource();
  assert.deepEqual(calls,{allocate:2,update:1,mipmap:3,resize:4,paint:3});
});
