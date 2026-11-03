const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const app = fs.readFileSync(path.join(__dirname,'../app.js'),'utf8');

/* Keep the PDF snapshot independent of the date on which the page is opened. */
function setup(date='2026-11-02',lang='ja'){
  const elements = new Map();
  const element = id=>{
    if(!elements.has(id)) elements.set(id,{innerHTML:'',children:[],addEventListener(){},focus(){},setAttribute(){}});
    return elements.get(id);
  };
  const context = vm.createContext({
    localStorage:{getItem:()=>null},
    window:{matchMedia:()=>({matches:false,addEventListener(){}}),addEventListener(){},scrollTo(){}},
    document:{getElementById:element,addEventListener(){},querySelectorAll:()=>[],activeElement:{id:'w-select',closest:()=>true}}
  });
  vm.runInContext(app.slice(0,app.indexOf('/* ---------- 起動'))
    + ';LANG='+JSON.stringify(lang)+';nowJST=()=>({date:'+JSON.stringify(date)+',min:18*60});'
    + ';globalThis.attendanceAPI={ATTENDANCE,COURSES,attendanceStats,renderAttendance,byId,renderHome,renderCourse};',context);
  return {api:context.attendanceAPI,run:script=>vm.runInContext(script,context),html:id=>element(id).innerHTML};
}

test('the attendance snapshot retains its issued date and all nine PDF courses',()=>{
  const {api:{ATTENDANCE,COURSES}}=setup();
  assert.equal(ATTENDANCE.asOf,'2026-11-02');
  assert.equal(ATTENDANCE.issuedAt,'17:54');
  assert.deepEqual(Object.keys(ATTENDANCE.courses).sort(),Array.from(COURSES,c=>c.id).sort());
});

test('remaining attendance requirements use confirmed circles and the full PDF period totals',()=>{
  const {api:{attendanceStats,byId}}=setup();
  const expected={
    calc:  {total:30,elapsed:11,present:5,late:0,absent:4,unmarked:2,remaining:19,required:20,needed:15,allowance:4,rate:45},
    ec:    {total:15,elapsed:5,present:1,late:1,absent:2,unmarked:1,remaining:10,required:10,needed:9,allowance:1,rate:20},
    mom:   {total:30,elapsed:10,present:5,late:1,absent:4,unmarked:0,remaining:20,required:20,needed:15,allowance:5,rate:50},
    emt:   {total:30,elapsed:10,present:7,late:0,absent:3,unmarked:0,remaining:20,required:20,needed:13,allowance:7,rate:70},
    qol:   {total:15,elapsed:5,present:4,late:0,absent:0,unmarked:1,remaining:10,required:10,needed:6,allowance:4,rate:80},
    bds:   {total:15,elapsed:6,present:3,late:0,absent:0,unmarked:3,remaining:9,required:10,needed:7,allowance:2,rate:50},
    career:{total:15,elapsed:5,present:4,late:0,absent:1,unmarked:0,remaining:10,required:10,needed:6,allowance:4,rate:80},
    shop:  {total:45,elapsed:18,present:18,late:0,absent:0,unmarked:0,remaining:27,required:30,needed:12,allowance:15,rate:100},
    ece:   {total:16,elapsed:0,present:0,late:0,absent:0,unmarked:0,remaining:16,required:11,needed:11,allowance:5,rate:null}
  };
  for(const [id,values] of Object.entries(expected)){
    const actual=attendanceStats(byId(id));
    for(const [key,value] of Object.entries(values)) assert.equal(actual[key],value,id+' '+key);
  }
});

test('a late arrival and unmarked past classes remain distinct from recorded absences',()=>{
  const {api:{ATTENDANCE}}=setup();
  assert.deepEqual(Array.from(ATTENDANCE.courses.ec.marks),['present','late','absent','absent',null]);
  assert.deepEqual(Array.from(ATTENDANCE.courses.calc.marks.slice(8)),[null,null,'absent']);
  assert.deepEqual(Array.from(ATTENDANCE.courses.bds.marks),['present','present',null,null,null,'present']);
  assert.equal(ATTENDANCE.courses.mom.marks[0],'late');
});

test('multi-period practicals count periods, including the upward rounding for 16 periods',()=>{
  const {api:{attendanceStats,byId}}=setup();
  const shop=attendanceStats(byId('shop'));
  const ece=attendanceStats(byId('ece'));
  assert.equal(shop.total,45);
  assert.equal(shop.present,18);
  assert.equal(shop.required,30);
  assert.equal(ece.total,16);
  assert.equal(ece.required,11);
  assert.ok(10/ece.total<2/3);
  assert.ok(ece.required/ece.total>=2/3);
});

test('opening the page later does not silently turn scheduled classes into snapshot absences',()=>{
  for(const lang of ['ja','en']){
    const current=setup('2026-11-02',lang);
    const later=setup('2027-02-01',lang);
    assert.equal(later.api.renderAttendance(),current.api.renderAttendance(),lang);
    for(const c of current.api.COURSES){
      const actual=later.api.attendanceStats(later.api.byId(c.id));
      const expected=current.api.attendanceStats(c);
      assert.deepEqual(JSON.parse(JSON.stringify(actual)),JSON.parse(JSON.stringify(expected)),c.id);
    }
  }
});

test('both languages explain the dated snapshot, late arrivals, blank entries and the assumed threshold',()=>{
  for(const lang of ['ja','en']){
    const {api}=setup('2026-11-02',lang);
    const html=api.renderAttendance();
    assert.equal(typeof html,'string');
    assert.match(html,/2026[/-]11[/-]0?2/);
    assert.match(html,/17:54/);
    assert.match(html,lang==='ja'?/出欠|出席/:/attendance/i);
    assert.match(html,lang==='ja'?/遅刻/:/late/i);
    assert.match(html,lang==='ja'?/空欄|未記録/:/blank|unmarked|not recorded/i);
    assert.match(html,lang==='ja'?/仮|目安|要確認|未確認/:/assum|guide|confirm|provisional/i);
    assert.match(html,/2\/3|66\.7|two.thirds/i);
    const qol=api.byId('qol');
    const qolRow=Array.from(html.matchAll(/<tr>[^]*?<\/tr>/g),match=>match[0]).find(row=>row.includes(qol[lang]));
    assert.ok(qolRow,'QOL row '+lang);
    assert.match(qolRow,lang==='ja'?/独自条件を要確認/:/Confirm course requirements/);
    assert.doesNotMatch(qolRow,/<td[^>]*>4(?:コマ| periods)<\/td>/);
    assert.match(html,lang==='ja'?/全回出席・各回課題/:/attendance at every lecture and completion of each assignment/);
    assert.doesNotMatch(html,/undefined|NaN|\[object Object\]/);
  }
});

test('home and course pages include the same attendance calculation in Japanese and English',()=>{
  for(const lang of ['ja','en']){
    const {api,run,html}=setup('2026-11-02',lang);
    api.renderHome();
    assert.ok(html('view-home').includes(api.renderAttendance()),'home '+lang);
    for(const id of ['ec','bds','qol','shop','ece']){
      run('COURSE='+JSON.stringify(id)+';renderCourse();');
      const detail=api.renderAttendance(api.byId(id));
      assert.ok(detail,'attendance detail '+id+' '+lang);
      assert.ok(html('view-course').includes(detail),'course '+id+' '+lang);
      assert.doesNotMatch(detail,/undefined|NaN|\[object Object\]/);
    }
  }
});
