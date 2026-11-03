const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const app=fs.readFileSync(require('node:path').join(__dirname,'../app.js'),'utf8');
const source=app.slice(app.indexOf('/* ---------- テーマ ---------- */'),app.indexOf('/* ---------- 共通ヘルパ ---------- */'));
function setup({theme='auto',text='auto',osDark=false}={}){
  const elements={},storage=new Map(),events=[];
  const preference={matches:osDark,addEventListener(type,fn){this.change=fn;}};
  const context=vm.createContext({THEME:theme,TEXT_COLOR:text,document:{documentElement:{dataset:{}}},
    window:{matchMedia:()=>preference,dispatchEvent:event=>events.push(event.type)},
    Event:class{constructor(type){this.type=type;}},
    $:id=>elements[id]??=( {attributes:{},setAttribute(key,value){this.attributes[key]=value;},querySelector(){return {};}} ),
    t:key=>key,uiIcon:name=>'<svg>'+name+'</svg>',store:{set:(key,value)=>storage.set(key,value)},
    updateWallpaper(){},renderAll(){},moveIn(){}});
  vm.runInContext(source,context);
  context.applyTheme();
  return {context,elements,storage,events,preference,root:context.document.documentElement};
}
test('text cycles independently and persists without changing the selected theme',()=>{
  const s=setup({theme:'dark'});
  for(const value of ['white','black','auto']){
    s.context.cycleTextColor();
    assert.equal(s.root.dataset.textColor,value);
    assert.equal(s.storage.get('text-color'),value);
    assert.equal(s.root.dataset.theme,'dark');
    assert.equal(s.context.THEME,'dark');
    assert.match(s.elements['text-color-btn'].attributes['aria-label'],/changeTextColor/);
  }
  assert.ok(s.events.includes('textcolorchange'));
});
test('explicit text colour survives the complete theme cycle',()=>{
  for(const text of ['white','black']){
    const s=setup({text});
    for(const value of ['light','dark','auto']){
      s.context.cycleTheme();
      assert.equal(s.context.THEME,value);
      assert.equal(s.storage.get('theme'),value);
      assert.equal(s.root.dataset.textColor,text);
    }
  }
});
test('automatic theme follows OS changes without changing the text preference',()=>{
  const s=setup({text:'black'});
  s.preference.matches=true;s.preference.change();
  assert.equal(s.root.dataset.theme,'dark');
  assert.equal(s.root.dataset.textColor,'black');
  s.context.cycleTheme();
  s.preference.matches=false;s.preference.change();
  assert.equal(s.root.dataset.theme,'light');
  assert.equal(s.root.dataset.textColor,'black');
});
