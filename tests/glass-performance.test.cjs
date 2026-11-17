const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const materials=require('../glass-materials.js');
const source=fs.readFileSync(require('node:path').join(__dirname,'../glass-renderer.js'),'utf8');
const context=vm.createContext({window:{GlassMaterials:materials},root:{dataset:{material:'prism'}},targets:[],PICK_SIGMA:12,SIGMA0:3});
vm.runInContext(source.slice(source.indexOf('  function materialNeedsPyramid('),source.indexOf('  function buildPyramid(')),context);
vm.runInContext(source.slice(source.indexOf('  function sourceLuminanceNeeded('),source.indexOf('  function uploadSource(')),context);
test('only materials that use Gaussian output build its pyramid',()=>{
  assert.deepEqual(materials.presets.filter(p=>context.materialNeedsPyramid(p.p)).map(p=>p.id),['apple','apple-clear','frosted']);
  for(const key of ['blur','frost','pickup'])assert.equal(context.materialNeedsPyramid({blur:0,frost:0,pickup:0,[key]:.001}),true);
});
test('the pyramid keeps the highest sampled LOD and its interpolation neighbor',()=>{
  const apple=materials.presets.find(p=>p.id==='apple').p;
  const frosted=materials.presets.find(p=>p.id==='frosted').p;
  assert.equal(context.sampledPyramidLevels(apple,1,10),4);
  assert.equal(context.sampledPyramidLevels(apple,2,10),5);
  assert.equal(context.sampledPyramidLevels(frosted,2,10),5);
  assert.equal(context.sampledPyramidLevels(frosted,2,2),2);
});
test('batch clips keep the full shadow, dimming, and smooth-merge reach',()=>{
  const c=vm.createContext({canvas:{width:2000,height:1600},width:1000,height:800,clamp:(n,min,max)=>Math.max(min,Math.min(max,n))});
  vm.runInContext(source.slice(source.indexOf('  function batchRegion('),source.indexOf('  function hasPixels(')),c);
  const rect={left:200,top:200,width:40,height:40},m={merge:20};
  const batch=[{rect,m},{rect:{...rect,left:265},m}];
  assert.deepEqual({...c.batchRegion(batch,0)},{x:327,y:327,right:683,bottom:553});
  assert.deepEqual({...c.batchRegion(batch,0.2)},{x:197,y:197,right:813,bottom:683});
});
test('clipped Gaussian levels include lookup halos and all finer-level dependencies',()=>{
  const c=vm.createContext({canvas:{width:1001,height:703}});
  vm.runInContext(source.slice(source.indexOf('  function pyramidRegions('),source.indexOf('  function buildPyramid(')),c);
  const levels=c.pyramidRegions({x:423,y:511,right:532,bottom:601},501,352,4);
  assert.equal(levels.length,4);
  for(let i=0;i<levels.length;i++){
    const {w,h,horizontal,vertical}=levels[i];
    assert.ok(vertical.x<=423*w/1001 && vertical.right>=532*w/1001);
    assert.ok(vertical.y<=511*h/703 && vertical.bottom>=601*h/703);
    assert.equal(horizontal.y,Math.max(0,vertical.y-(i?4:5)));
    assert.equal(horizontal.bottom,Math.min(h,vertical.bottom+(i?4:5)));
    if(i){
      const previous=levels[i-1];
      assert.ok(previous.vertical.x<=Math.max(0,(horizontal.x-4)*previous.w/w));
      assert.ok(previous.vertical.right>=Math.min(previous.w,(horizontal.right+4)*previous.w/w));
      assert.ok(previous.vertical.y<=horizontal.y*previous.h/h);
      assert.ok(previous.vertical.bottom>=horizontal.bottom*previous.h/h);
    }
  }
  assert.ok((levels[0].horizontal.right-levels[0].horizontal.x)<501);
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

test('animated statistics gather the original global and local texels from the same uploaded frame',()=>{
  const reads=[];let coords;
  const c=vm.createContext({
    sampleRows:0,sampleWidth:256,samplePoints:{},source:{width:787,height:1703},sourceStatisticsCurrent:false,meanLum:0,
    left:-192,top:-256,dpr:2,viewport:{left:0,top:0},clamp:(n,min,max)=>Math.max(min,Math.min(max,n)),
    bindTex(){},rtex:()=>({}),drawTo(){},programs:{samples:{}},gl:{
      texImage2D(){},texParameteri(){},texSubImage2D(...args){coords=args.at(-1).slice();},
      readPixels(x,y,w,h,format,type,pixels){
        reads.push(w*h);
        for(let i=0;i<w*h;i++){
          const white=coords[i*2]>300?255:0;
          pixels.set([white,white,white,255],i*4);
        }
      },
    },
  });
  vm.runInContext(source.slice(source.indexOf('  function readAnimatedSourceStatistics('),source.indexOf('  const toneMemory=')),c);
  const adaptive=[{rect:{left:350,top:290,width:30,height:28}}];
  c.readAnimatedSourceStatistics(adaptive);
  assert.deepEqual([...coords.slice(0,4)],[16,35,49,35]);
  assert.deepEqual([...coords.slice(24*24*2,24*24*2+4)],[319,70,325,70]);
  assert.ok(c.meanLum>.5&&c.meanLum<.7);
  assert.equal(adaptive[0].lum,1);
  c.readAnimatedSourceStatistics(adaptive);
  assert.deepEqual(reads,[768,256],'Only local tones need a read when the current source is unchanged');
  assert.equal(adaptive[0].lum,1);
});
