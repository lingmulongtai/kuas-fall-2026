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
test('batch clips keep the full shadow, dimming, and smooth-merge reach',()=>{
  const c=vm.createContext({canvas:{width:2000,height:1600},width:1000,height:800,clamp:(n,min,max)=>Math.max(min,Math.min(max,n))});
  vm.runInContext(source.slice(source.indexOf('  function batchRegion('),source.indexOf('  function hasPixels(')),c);
  const rect={left:200,top:200,width:40,height:40},m={merge:20};
  const batch=[{rect,m},{rect:{...rect,left:265},m}];
  assert.deepEqual({...c.batchRegion(batch,0)},{x:327,y:327,right:683,bottom:553});
  assert.deepEqual({...c.batchRegion(batch,0.2)},{x:197,y:197,right:813,bottom:683});
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
  const viewport={pixelWidth:786,pixelHeight:1704};
  const gl={texImage2D(...args){assert.equal(args.at(-1),sourceCanvas);calls.allocate++;},texSubImage2D(...args){assert.equal(args.at(-1),sourceCanvas);calls.update++;},generateMipmap(){calls.mipmap++;},pixelStorei(){},texParameteri(){}};
  const c=vm.createContext({viewport,source:sourceCanvas,gl,cx:{fillRect(){calls.paint++;},drawImage(){}},asciiActive:false,RAIN:false,photo:null,root:{dataset:{theme:'dark'}},bindTex(){},imageTex:{},imageWidth:0,imageHeight:0,sourceStatisticsCurrent:true,sourceDirty:true});
  vm.runInContext(source.slice(source.indexOf('  function uploadSource('),source.indexOf('  function updateSourceStatistics(')),c);
  c.uploadSource();c.uploadSource();
  assert.deepEqual(calls,{allocate:1,update:1,mipmap:2,resize:2,paint:2});
  assert.equal(c.sourceStatisticsCurrent,false);
  viewport.pixelWidth=1704;viewport.pixelHeight=786;c.uploadSource();
  assert.deepEqual(calls,{allocate:2,update:1,mipmap:3,resize:4,paint:3});
});
