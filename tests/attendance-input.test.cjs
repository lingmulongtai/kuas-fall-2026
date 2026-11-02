const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const app = fs.readFileSync(path.join(__dirname,'../app.js'),'utf8');
const storageKey = 'kuas-fall-2026-attendance-v1';

function setup({saved,readFails=false,writeFails=false,sharedValues,failures={}}={}){
  const savedValues=sharedValues||new Map(saved===undefined?[]:[[storageKey,saved]]);
  const elements=new Map();
  const element=id=>{
    if(!elements.has(id)) elements.set(id,{innerHTML:'',children:[],addEventListener(){},focus(){},setAttribute(){}});
    return elements.get(id);
  };
  const context=vm.createContext({
    localStorage:{
      getItem(key){ if(readFails||failures.read) throw new Error('Storage unavailable'); return savedValues.get(key)??null; },
      setItem(key,value){ if(writeFails||failures.write) throw new Error('Storage full'); savedValues.set(key,value); }
    },
    window:{matchMedia:()=>({matches:false,addEventListener(){}}),addEventListener(){},scrollTo(){}},
    document:{getElementById:element,addEventListener(){},querySelectorAll:()=>[],activeElement:{id:'w-select',closest:()=>true}}
  });
  vm.runInContext(app.slice(0,app.indexOf('/* ---------- 起動'))
    + ';globalThis.model={ATTENDANCE,COURSES,OCCURRENCES,attendancePeriods,attendanceStats,setAttendanceStatus,exportAttendanceData,importAttendanceData,'
    + 'state:()=>attendanceStorageState,updatedAt:()=>attendanceUpdatedAt};',context);
  const api=context.model;
  const course=id=>api.COURSES.find(c=>c.id===id);
  const periods=id=>Array.from(api.attendancePeriods(course(id)),item=>({...item}));
  const stats=id=>({...api.attendanceStats(course(id))});
  return {api,course,periods,stats,savedValues,run:script=>vm.runInContext(script,context)};
}

test('each course expands to its real periods without renumbering the January calculus classes',()=>{
  const model=setup();
  for(const c of model.api.COURSES){
    const periods=model.periods(c.id);
    assert.equal(periods.length,model.api.ATTENDANCE.courses[c.id].total,c.id);
    assert.equal(new Set(periods.map(p=>p.key)).size,periods.length,c.id);
    for(let i=1;i<periods.length;i++){
      assert.ok(periods[i-1].date<periods[i].date || (periods[i-1].date===periods[i].date && periods[i-1].period<periods[i].period),c.id);
    }
  }
  assert.deepEqual(model.periods('shop').slice(0,3).map(p=>[p.date,p.period]),[
    ['2026-09-24',3],['2026-09-24',4],['2026-09-24',5]
  ]);
  assert.deepEqual(model.periods('ece').slice(0,2).map(p=>p.key),['2026-11-16:3','2026-11-16:4']);
  assert.deepEqual(model.periods('calc').slice(-2).map(p=>p.key),['2027-01-12:5','2027-01-18:2']);
  assert.deepEqual(Array.from(model.api.OCCURRENCES.filter(o=>o.c.id==='calc' && o.n>=29),o=>[o.n,o.date]),[
    [30,'2027-01-12'],[29,'2027-01-18']
  ]);
});

test('a source correction saves and restores while preserving the immutable PDF record',()=>{
  const model=setup();
  const source=JSON.stringify(model.api.ATTENDANCE);
  model.run('Object.values(ATTENDANCE.courses).forEach(c=>{Object.freeze(c.marks);Object.freeze(c);});Object.freeze(ATTENDANCE.courses);Object.freeze(ATTENDANCE);');
  const key=model.periods('ec')[1].key;
  assert.equal(model.api.setAttendanceStatus('ec',key,'present'),true);
  assert.equal(model.api.state(),'saved');
  assert.ok(Number.isFinite(Date.parse(model.api.updatedAt())));
  assert.equal(model.periods('ec')[1].sourceStatus,'late');
  assert.equal(model.periods('ec')[1].status,'present');
  assert.equal(model.stats('ec').present,2);
  assert.equal(model.stats('ec').late,0);
  assert.equal(model.stats('ec').sourceRate,20);
  assert.equal(model.stats('ec').edited,true);
  assert.equal(JSON.stringify(model.api.ATTENDANCE),source);
  const restored=setup({saved:model.savedValues.get(storageKey)});
  assert.deepEqual(restored.stats('ec'),model.stats('ec'));
  assert.equal(restored.api.updatedAt(),model.api.updatedAt());
});

test('explicitly clearing a source circle is retained as null rather than falling back to the PDF',()=>{
  const model=setup();
  const key=model.periods('ec')[0].key;
  assert.equal(model.api.setAttendanceStatus('ec',key,null),true);
  assert.equal(model.periods('ec')[0].sourceStatus,'present');
  assert.equal(model.periods('ec')[0].status,null);
  assert.equal(model.stats('ec').present,0);
  assert.equal(model.stats('ec').unmarked,2);
  const data=JSON.parse(model.api.exportAttendanceData());
  assert.equal(Object.hasOwn(data.edits.ec,key),true);
  assert.equal(data.edits.ec[key],null);
  assert.equal(setup({saved:JSON.stringify(data)}).periods('ec')[0].status,null);
});

test('entering later periods advances progress across unmarked gaps without inventing absences',()=>{
  const model=setup();
  const periods=model.periods('ec');
  model.api.setAttendanceStatus('ec',periods[6].key,'present');
  const s=model.stats('ec');
  assert.equal(s.elapsed,7);
  assert.equal(s.present,2);
  assert.equal(s.late,1);
  assert.equal(s.absent,2);
  assert.equal(s.unmarked,2);
  assert.equal(s.remaining,8);
  assert.equal(s.needed,8);
  assert.equal(s.allowance,0);
  assert.equal(s.rate,2/7*100);
  model.api.setAttendanceStatus('ec',periods[6].key,null);
  assert.equal(model.stats('ec').elapsed,7);
  assert.equal(model.stats('ec').unmarked,3);
  assert.equal(model.stats('ec').allowance,-1);
});

test('an unreachable threshold remains negative, and late marks never become attendance circles',()=>{
  const model=setup();
  const periods=model.periods('ece');
  model.api.setAttendanceStatus('ece',periods.at(-1).key,'late');
  const s=model.stats('ece');
  assert.equal(s.elapsed,16);
  assert.equal(s.present,0);
  assert.equal(s.late,1);
  assert.equal(s.unmarked,15);
  assert.equal(s.remaining,0);
  assert.equal(s.required,11);
  assert.equal(s.needed,11);
  assert.equal(s.allowance,-11);
  assert.equal(s.rate,0);
});

test('clock changes do not advance attendance or overwrite the source reporting rate',()=>{
  const model=setup();
  const before=model.stats('calc');
  model.run('nowJST=()=>({date:"2027-03-01",min:0});');
  assert.deepEqual(model.stats('calc'),before);
  assert.equal(before.elapsed,11);
  assert.equal(before.rate,45);
  assert.equal(before.sourceRate,45);
  assert.equal(before.edited,false);
});

test('export and import carry all overrides including nulls and replace the prior edit set',()=>{
  const first=setup();
  const bdsKey=first.periods('bds')[5].key;
  const shopKey=first.periods('shop')[18].key;
  first.api.setAttendanceStatus('bds',bdsKey,null);
  first.api.setAttendanceStatus('shop',shopKey,'absent');
  const exported=first.api.exportAttendanceData();
  const second=setup();
  second.api.setAttendanceStatus('ec',second.periods('ec')[0].key,'absent');
  assert.equal(second.api.importAttendanceData(exported),true);
  assert.equal(second.periods('bds')[5].status,null);
  assert.equal(second.periods('shop')[18].status,'absent');
  assert.equal(second.periods('ec')[0].status,'present');
  assert.equal(second.api.exportAttendanceData(),exported);
  assert.equal(second.savedValues.get(storageKey),exported);
});

test('invalid, foreign-term and mixed-validity imports leave all current data and saved data untouched',()=>{
  const model=setup();
  model.api.setAttendanceStatus('ec',model.periods('ec')[0].key,'absent');
  const before=model.api.exportAttendanceData();
  const base=JSON.parse(before);
  const invalid=[
    '{', 'null', '[]',
    JSON.stringify({...base,term:'2027-fall'}),
    JSON.stringify({...base,version:2}),
    JSON.stringify({...base,sourceAsOf:'2026-10-01'}),
    JSON.stringify({...base,updatedAt:'not a date'}),
    JSON.stringify({...base,unexpected:true}),
    JSON.stringify({...base,edits:{unknown:{'2026-11-03:1':'present'}}}),
    JSON.stringify({...base,edits:{ec:{'2026-11-03:9':'present'}}}),
    JSON.stringify({...base,edits:{ec:{'2026-11-03:1':'present','2026-11-10:1':'excused'}}}),
    JSON.stringify({...base,edits:{ec:[]}}),
    JSON.stringify({...base,edits:{ec:{'2026-11-03:1':false}}}),
    '{"version":1,"term":"2026-fall","sourceAsOf":"2026-11-02","updatedAt":null,"edits":{"__proto__":{"polluted":"present"}}}'
  ];
  for(const text of invalid){
    assert.throws(()=>model.api.importAttendanceData(text));
    assert.equal(model.api.exportAttendanceData(),before);
    assert.equal(model.savedValues.get(storageKey),before);
    assert.equal(model.api.state(),'saved');
  }
});

test('invalid cell updates are rejected without changing progress or storage',()=>{
  const model=setup();
  const before=model.api.exportAttendanceData();
  const key=model.periods('ec')[0].key;
  for(const args of [['missing',key,'present'],['ec','2026-11-03:9','present'],['ec',key,'excused'],['ec',key,undefined],['ec',key,1],['ec',null,'present']]){
    assert.equal(model.api.setAttendanceStatus(...args),false);
    assert.equal(model.api.exportAttendanceData(),before);
  }
  assert.equal(model.savedValues.has(storageKey),false);
});

test('corrupt saved data is not erased, while unavailable storage still allows in-memory updates and export',()=>{
  for(const saved of ['{','null',JSON.stringify({version:1,term:'2025-fall'})]){
    const model=setup({saved});
    assert.equal(model.api.state(),'invalid');
    assert.equal(model.stats('ec').present,1);
    assert.equal(model.savedValues.get(storageKey),saved);
  }
  const unavailable=setup({readFails:true,writeFails:true});
  assert.equal(unavailable.api.state(),'memory');
  const key=unavailable.periods('ec')[0].key;
  assert.equal(unavailable.api.setAttendanceStatus('ec',key,'absent'),true);
  assert.equal(unavailable.api.state(),'memory');
  assert.equal(unavailable.stats('ec').present,0);
  assert.equal(JSON.parse(unavailable.api.exportAttendanceData()).edits.ec[key],'absent');
  const full=setup({writeFails:true});
  full.api.importAttendanceData(unavailable.api.exportAttendanceData());
  assert.equal(full.api.state(),'memory');
  assert.equal(full.stats('ec').present,0);
});

test('editing after a corrupt load preserves the original raw data until an explicit valid import replaces it',()=>{
  const corrupt='{ damaged saved attendance';
  const model=setup({saved:corrupt});
  assert.equal(model.api.state(),'invalid');
  const key=model.periods('ec')[0].key;
  assert.equal(model.api.setAttendanceStatus('ec',key,'absent'),true);
  assert.equal(model.api.state(),'memory');
  assert.equal(model.stats('ec').present,0);
  assert.equal(model.savedValues.get(storageKey),corrupt);
  const recovery=model.api.exportAttendanceData();
  assert.equal(JSON.parse(recovery).edits.ec[key],'absent');
  assert.throws(()=>model.api.importAttendanceData('{invalid import'));
  assert.equal(model.savedValues.get(storageKey),corrupt);
  assert.equal(model.api.setAttendanceStatus('ec',key,null),true);
  assert.equal(model.savedValues.get(storageKey),corrupt);
  assert.equal(model.api.state(),'memory');
  assert.equal(model.api.importAttendanceData(recovery),true);
  assert.equal(model.api.state(),'saved');
  assert.equal(model.savedValues.get(storageKey),recovery);
  assert.equal(model.periods('ec')[0].status,'absent');
  assert.equal(model.api.setAttendanceStatus('ec',key,'late'),true);
  assert.equal(model.api.state(),'saved');
  assert.equal(JSON.parse(model.savedValues.get(storageKey)).edits.ec[key],'late');
});

test('stale tabs merge other courses and other cells before saving the next manual change',()=>{
  const sharedValues=new Map();
  const first=setup({sharedValues}),second=setup({sharedValues});
  const ecKey=first.periods('ec')[0].key;
  const bdsKey=second.periods('bds')[0].key;
  first.api.setAttendanceStatus('ec',ecKey,'absent');
  second.api.setAttendanceStatus('bds',bdsKey,'late');
  assert.equal(second.periods('ec')[0].status,'absent');
  const anotherEc=first.periods('ec')[1].key;
  first.api.setAttendanceStatus('ec',anotherEc,null);
  assert.equal(first.periods('bds')[0].status,'late');
  const restored=setup({sharedValues});
  assert.equal(restored.periods('ec')[0].status,'absent');
  assert.equal(restored.periods('ec')[1].status,null);
  assert.equal(restored.periods('bds')[0].status,'late');
});

test('unsaved local cells survive a later merge while successful older edits do not overwrite newer tab changes',()=>{
  const sharedValues=new Map(),failures={};
  const first=setup({sharedValues,failures}),second=setup({sharedValues});
  const ecKey=first.periods('ec')[0].key;
  first.api.setAttendanceStatus('ec',ecKey,'late');
  second.api.setAttendanceStatus('ec',ecKey,'absent');
  failures.write=true;
  const momKey=first.periods('mom')[0].key;
  first.api.setAttendanceStatus('mom',momKey,'present');
  assert.equal(first.api.state(),'memory');
  assert.equal(first.periods('ec')[0].status,'absent');
  const bdsKey=second.periods('bds')[0].key;
  second.api.setAttendanceStatus('bds',bdsKey,'absent');
  failures.write=false;
  first.api.setAttendanceStatus('career',first.periods('career')[0].key,null);
  const restored=setup({sharedValues});
  assert.equal(restored.periods('ec')[0].status,'absent');
  assert.equal(restored.periods('mom')[0].status,'present');
  assert.equal(restored.periods('bds')[0].status,'absent');
  assert.equal(restored.periods('career')[0].status,null);
  assert.equal(first.api.state(),'saved');
});

test('a storage read failure retains pending cells until a later readable merge',()=>{
  const sharedValues=new Map(),failures={};
  const first=setup({sharedValues,failures}),second=setup({sharedValues});
  second.api.setAttendanceStatus('ec',second.periods('ec')[0].key,'absent');
  const prior=sharedValues.get(storageKey);
  failures.read=true;
  first.api.setAttendanceStatus('mom',first.periods('mom')[0].key,'present');
  assert.equal(first.api.state(),'memory');
  assert.equal(sharedValues.get(storageKey),prior);
  failures.read=false;
  first.api.setAttendanceStatus('career',first.periods('career')[0].key,'late');
  const restored=setup({sharedValues});
  assert.equal(restored.periods('ec')[0].status,'absent');
  assert.equal(restored.periods('mom')[0].status,'present');
  assert.equal(restored.periods('career')[0].status,'late');
  assert.equal(first.api.state(),'saved');
});

test('a valid replacement import remains a replacement if storage fails before the next edit',()=>{
  const sharedValues=new Map(),failures={};
  const model=setup({sharedValues,failures});
  model.api.setAttendanceStatus('ec',model.periods('ec')[0].key,'absent');
  const replacement=setup();
  replacement.api.setAttendanceStatus('mom',replacement.periods('mom')[0].key,'present');
  failures.write=true;
  model.api.importAttendanceData(replacement.api.exportAttendanceData());
  assert.equal(model.api.state(),'memory');
  failures.write=false;
  model.api.setAttendanceStatus('bds',model.periods('bds')[0].key,null);
  const restored=setup({sharedValues});
  assert.equal(restored.periods('ec')[0].status,'present');
  assert.equal(restored.periods('mom')[0].status,'present');
  assert.equal(restored.periods('bds')[0].status,null);
  assert.equal(model.api.state(),'saved');
});
