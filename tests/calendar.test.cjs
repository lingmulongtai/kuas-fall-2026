const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const app = fs.readFileSync(path.join(__dirname,'../app.js'),'utf8');
const context = vm.createContext({});
vm.runInContext(app.slice(0,app.indexOf('/* ---------- UI 文言'))+
  ';globalThis.calendar={COURSES,DATES,BREAKS,CALENDAR_WEEKS,OCCURRENCES,addDays,mondayOf,calendarWeekFor,sessionsOn,courseDates};',context);
const {COURSES,DATES,BREAKS,CALENDAR_WEEKS,OCCURRENCES,addDays,mondayOf,calendarWeekFor,sessionsOn,courseDates} = context.calendar;
const ids = date=>Array.from(sessionsOn(date),item=>item.c.id+'-'+item.n);

test('18 real Monday-to-Sunday weeks cover the complete semester exactly once',()=>{
  assert.equal(CALENDAR_WEEKS.length,18);
  assert.equal(CALENDAR_WEEKS[0],'2026-09-21');
  assert.equal(CALENDAR_WEEKS.at(-1),'2027-01-18');
  assert.equal(mondayOf('2027-01-01'),'2026-12-28');
  assert.equal(addDays('2026-12-31',1),'2027-01-01');
  for(const occurrence of OCCURRENCES){
    const week = calendarWeekFor(occurrence.date);
    assert.ok(occurrence.date>=CALENDAR_WEEKS[week-1]);
    assert.ok(occurrence.date<=addDays(CALENDAR_WEEKS[week-1],6));
  }
  assert.equal(calendarWeekFor('2026-01-01'),1);
  assert.equal(calendarWeekFor('2028-01-01'),18);
});

test('all 173 existing course sessions preserve their assigned date, topic, mode and slot',()=>{
  assert.equal(OCCURRENCES.length,173);
  assert.equal(new Set(OCCURRENCES.map(item=>item.c.id+'-'+item.n)).size,173);
  for(const c of COURSES){
    const occurrences = OCCURRENCES.filter(item=>item.c===c);
    assert.equal(occurrences.length,c.schedule.length,c.id);
    for(const item of occurrences){
      assert.equal(item.session,c.schedule.find(s=>s.n===item.n));
      assert.ok(item.s.pick(item.teachingWeek).includes(item.n));
      assert.ok(item.c.slots.includes(item.s));
      assert.equal(item.date,Object.values(DATES)[item.s.day][item.teachingWeek-1]);
    }
  }
});

test('opening Thursday, the cancelled Friday, and January adjustments use real dates',()=>{
  assert.equal(sessionsOn('2026-09-21').length,0);
  assert.deepEqual(ids('2026-09-24'),['shop-1','bds-1']);
  assert.ok(ids('2026-09-25').includes('mom-2'));
  assert.ok(ids('2026-09-29').includes('mom-1'));
  assert.equal(sessionsOn('2026-10-23').length,0);
  assert.ok(ids('2026-10-30').includes('mom-10'));
  assert.equal(sessionsOn('2027-01-11').length,0);
  assert.equal(sessionsOn('2027-01-14').length,0);
  assert.ok(ids('2027-01-12').includes('calc-30'));
  assert.deepEqual(ids('2027-01-18'),['calc-29','ece-8']);
});

test('every winter closure has its own date and no classes',()=>{
  for(let i=0;i<5;i++){
    const date=addDays('2026-12-28',i);
    assert.equal(BREAKS.filter(b=>b.d===date).length,1,date);
    assert.equal(sessionsOn(date).length,0,date);
  }
});

test('exercise courses retain late starts and multi-period spans',()=>{
  const exercises=OCCURRENCES.filter(item=>item.c.id==='ece');
  assert.equal(exercises.length,8);
  assert.equal(exercises[0].date,'2026-11-16');
  assert.equal(exercises.at(-1).date,'2027-01-18');
  assert.ok(exercises.every(item=>item.s.span===2));
  assert.equal(courseDates(COURSES.find(c=>c.id==='calc')).at(-1),'2027-01-18');
});

test('course term boundaries include the earliest and latest actual lesson dates',()=>{
  for(const id of ['mom','emt']){
    const dates=courseDates(COURSES.find(c=>c.id===id));
    assert.equal(dates[0],'2026-09-25');
    assert.equal(dates.at(-1),'2027-01-15');
  }
  const calculus=courseDates(COURSES.find(c=>c.id==='calc'));
  assert.equal(calculus[0],'2026-09-28');
  assert.equal(calculus.at(-1),'2027-01-18');
});

test('changing the calendar week refreshes the lesson highlights on the course tab',()=>{
  const elements=new Map();
  const element=id=>{
    if(!elements.has(id)) elements.set(id,{innerHTML:'',addEventListener(){},focus(){}});
    return elements.get(id);
  };
  const browser=vm.createContext({
    localStorage:{getItem:()=>null},
    window:{matchMedia:()=>({matches:false,addEventListener(){}}),addEventListener(){}},
    document:{getElementById:element,addEventListener(){},querySelectorAll:()=>[],activeElement:{id:'w-select',closest:()=>true}}
  });
  vm.runInContext(app.slice(0,app.indexOf('/* ---------- 起動'))+
    ';WEEK=1;VIEW="week";COURSE="mom";renderCourse();setWeek(2);',browser);
  const highlighted=[...element('view-course').innerHTML.matchAll(/<tr class="now"><td class="n">(\d+)/g)].map(match=>Number(match[1]));
  assert.deepEqual(highlighted,[1,4]);
});
