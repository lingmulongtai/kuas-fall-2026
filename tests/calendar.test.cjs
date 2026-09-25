const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const app = fs.readFileSync(path.join(__dirname,'../app.js'),'utf8');
const context = vm.createContext({});
vm.runInContext(app.slice(0,app.indexOf('/* ---------- UI 文言'))+
  ';globalThis.calendar={COURSES,DATES,BREAKS,CALENDAR_WEEKS,OCCURRENCES,addDays,mondayOf,calendarWeekFor,sessionsOn,courseDates,marksFor,markedSessions};',context);
const {COURSES,DATES,BREAKS,CALENDAR_WEEKS,OCCURRENCES,addDays,mondayOf,calendarWeekFor,sessionsOn,courseDates,marksFor,markedSessions} = context.calendar;
const ids = date=>Array.from(sessionsOn(date),item=>item.c.id+'-'+item.n);
const course = id=>COURSES.find(c=>c.id===id);
/* Runs the page code against a minimal DOM and returns the rendered element lookup. */
function render(script){
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
  vm.runInContext(app.slice(0,app.indexOf('/* ---------- 起動'))+';todayISO=()=>"2026-09-25";'+script,browser);
  return id=>element(id).innerHTML;
}

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
  assert.ok(ids('2026-09-25').includes('mom-1'));
  assert.ok(ids('2026-09-29').includes('mom-2'));
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
  const html=render('WEEK=1;VIEW="week";COURSE="mom";renderCourse();setWeek(2);');
  const highlighted=[...html('view-course').matchAll(/<tr class="now"><td class="n">(\d+)/g)].map(match=>Number(match[1]));
  assert.deepEqual(highlighted,[2,3]);
});

test('twice-weekly Tuesday/Friday courses number their classes in real date order',()=>{
  for(const id of ['mom','emt']){
    const dates=Array.from(OCCURRENCES.filter(item=>item.c.id===id),item=>item.date);
    assert.deepEqual(dates,[...dates].sort(),id);
    const numbers=Array.from(OCCURRENCES.filter(item=>item.c.id===id),item=>item.n);
    assert.deepEqual(numbers,Array.from({length:30},(_,i)=>i+1),id);
  }
  assert.ok(ids('2026-10-16').includes('emt-7'));
  assert.ok(ids('2026-10-20').includes('emt-8'));
  assert.ok(ids('2026-10-27').includes('emt-9'));
  assert.ok(ids('2026-11-24').includes('emt-17'));
});

test('the Mechanics of Materials midterm is session 14 on Friday 13 November and fills the 27% share',()=>{
  const mom=COURSES.find(c=>c.id==='mom');
  const midterm=mom.marks.find(m=>m.kind==='midterm');
  const sessions=markedSessions(mom,midterm);
  assert.deepEqual(Array.from(sessions,item=>[item.date,item.n,item.s.period]),[['2026-11-13',14,1]]);
  assert.equal(sessions[0].session.en,'Midterm exam');
  const share=mom.evals.find(e=>e.mark==='midterm');
  assert.equal(share.pct,27);
  assert.equal(share.en,'Midterm exam');
  assert.equal(mom.evals.reduce((sum,e)=>sum+e.pct,0),100);
});

test('Mechanics of Materials quizzes fall on every Tuesday class and never on Fridays',()=>{
  const mom=COURSES.find(c=>c.id==='mom');
  const quiz=mom.marks.find(m=>m.kind==='quiz');
  const dates=markedSessions(mom,quiz).map(item=>item.date);
  assert.deepEqual(dates,DATES.tue);
  assert.ok(!dates.includes('2026-09-25'));
  assert.equal(dates[0],'2026-09-29');
  assert.equal(marksFor(sessionsOn('2026-09-25').find(item=>item.c===mom)).length,0);
  assert.equal(mom.evals.find(e=>e.mark==='quiz').pct,33);
});

test('possible midpoints in other courses point at their wrap-up and interim sessions',()=>{
  const check=id=>{
    const c=COURSES.find(course=>course.id===id);
    return Array.from(c.marks).flatMap(m=>Array.from(markedSessions(c,m),item=>[m.kind,item.date,item.n]));
  };
  assert.deepEqual(check('emt'),[['midterm','2026-11-24',17],['pc','2026-10-16',7]]);
  assert.deepEqual(check('bds'),[['check','2026-11-26',10]]);
  const marked=Array.from(COURSES.filter(c=>c.marks),c=>c.id).sort();
  assert.deepEqual(marked,['bds','emt','mom']);
});

test('the home page lists the midterm date and flags it in the calendar',()=>{
  const html=render('WEEK=calendarWeekFor("2026-11-13");renderHome();renderWeek();');
  const home=html('view-home');
  assert.match(home,/class="exam-card is-midterm"[^]*?11\/13\(金\)[^]*?あと49日/);
  assert.match(home,/class="exam-card is-quiz"[^]*?次回[^]*?9\/29\(火\)/);
  assert.ok(home.indexOf('exams')<home.indexOf('class="stats"'));
  assert.match(html('view-week'),/class="wk is-exam"[^>]*data-session="mom-14"/);
});

test('Electromagnetic Theory reflects the grading, midterm, MATLAB class and on-demand day announced in class',()=>{
  const emt=course('emt');
  assert.deepEqual(Array.from(emt.evals,e=>e.pct),[35,25,40]);
  assert.equal(emt.evals.find(e=>e.mark==='midterm').pct,25);
  assert.equal(emt.schedule[16].en,'Midterm exam');
  const onDemand=sessionsOn('2026-10-27').find(item=>item.c===emt);
  assert.equal(onDemand.session.mode,'ondemand');
  assert.equal(OCCURRENCES.filter(item=>item.c===emt && item.session.mode!=='f2f').length,1);
  assert.equal(emt.location.ja,'S307教室（満員時はS306）');
  assert.deepEqual(Array.from(emt.phases,p=>[p.from,p.to,p.teacher.ja]),[[1,13,'今井先生'],[14,24,'堀井先生'],[25,30,'今井先生']]);
  const home=render('renderHome();')('view-home');
  assert.match(home,/class="exam-card is-midterm"[^]*?11\/24\(火\)[^]*?電磁気学/);
  assert.match(home,/class="notice-list"[^]*?10\/16\(金\)[^]*?PC持参必須[^]*?10\/27\(火\)[^]*?オンデマンド/);
});

test('Career Design follows the handout: dates, instructors, showcase guests and class format',()=>{
  const career=course('career');
  const items=OCCURRENCES.filter(item=>item.c===career);
  assert.deepEqual(Array.from(items,item=>item.date),[
    '2026-09-25','2026-10-02','2026-10-09','2026-10-16','2026-10-30','2026-11-06','2026-11-13','2026-11-20',
    '2026-11-27','2026-12-04','2026-12-11','2026-12-18','2026-12-25','2027-01-08','2027-01-15']);
  assert.equal(career.schedule[0].ja,'ガイダンス');
  assert.equal(career.schedule[9].ja,'人生100年時代のマネーリテラシー');
  const teacher=n=>career.phases.find(p=>n>=p.from && n<=p.to).teacher.ja;
  assert.deepEqual([1,5,6,9,10,13,14,15].map(teacher),['西先生','西先生','今井先生','今井先生','的場先生','的場先生','西先生（講座は外部講師）','西先生（講座は外部講師）']);
  const withShowcase=Array.from(career.schedule.filter(s=>s.showcase),s=>s.n);
  assert.deepEqual(withShowcase,[6,7,8,9,10,11,12,13]);
  for(const s of career.schedule.filter(s=>s.format)){
    assert.match(s.format.ja,s.n%2 ? /GW発表30分/ : /講義25分/,String(s.n));
  }
  for(const handout of career.handouts) assert.ok(fs.statSync(path.join(__dirname,'..',handout.src)).size<400000,handout.src);
  const page=render('COURSE="career";renderCourse();')('view-course');
  assert.match(page,/第6〜9回 ・ 担当：今井先生/);
  assert.match(page,/キャリアショーケース（45分）：OB／Nidec Group（予定）/);
  assert.match(page,/<details class="handout"><summary>配布スケジュール（全15回）/);
  assert.doesNotMatch(page,/\[object Object\]/);
});

test('class notes appear on their date and in the course summary',()=>{
  const html=render('WEEK=1;COURSE="mom";renderWeek();renderCourse();');
  assert.match(html('view-week'),/data-session="mom-1"[^]*?メモ<\/b> 実際の内容は応力とひずみ/);
  assert.match(html('view-course'),/class="box memo-box"[^]*?9\/25\(金\)<\/b> 実際の内容は応力とひずみ/);
});
