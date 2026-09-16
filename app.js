/* =========================================================
   2026年度 秋学期 履修ダッシュボード
   内容は先端なびのシラバス9件と学生時間割表にもとづく。
   ========================================================= */

/* ---------- 時限 ---------- */
const PERIODS = {
  1:"9:00–10:30", 2:"10:40–12:10", 3:"13:00–14:30",
  4:"14:40–16:10", 5:"16:20–17:50", 6:"18:00–19:00"
};

const DAYS = [
  {key:"mon", ja:"月曜日", en:"Monday",    s:{ja:"月",en:"Mon"}},
  {key:"tue", ja:"火曜日", en:"Tuesday",   s:{ja:"火",en:"Tue"}},
  {key:"wed", ja:"水曜日", en:"Wednesday", s:{ja:"水",en:"Wed"}},
  {key:"thu", ja:"木曜日", en:"Thursday",  s:{ja:"木",en:"Thu"}},
  {key:"fri", ja:"金曜日", en:"Friday",    s:{ja:"金",en:"Fri"}}
];

/* 第1〜15週の実施日。休講日（10/23・12/28〜1/1・1/11・1/14）は除いてある。 */
const DATES = {
  mon:["2026-09-28","2026-10-05","2026-10-12","2026-10-19","2026-10-26","2026-11-02","2026-11-09","2026-11-16","2026-11-23","2026-11-30","2026-12-07","2026-12-14","2026-12-21","2027-01-04","2027-01-18"],
  tue:["2026-09-29","2026-10-06","2026-10-13","2026-10-20","2026-10-27","2026-11-03","2026-11-10","2026-11-17","2026-11-24","2026-12-01","2026-12-08","2026-12-15","2026-12-22","2027-01-05","2027-01-12"],
  wed:["2026-09-30","2026-10-07","2026-10-14","2026-10-21","2026-10-28","2026-11-04","2026-11-11","2026-11-18","2026-11-25","2026-12-02","2026-12-09","2026-12-16","2026-12-23","2027-01-06","2027-01-13"],
  thu:["2026-09-24","2026-10-01","2026-10-08","2026-10-15","2026-10-22","2026-10-29","2026-11-05","2026-11-12","2026-11-19","2026-11-26","2026-12-03","2026-12-10","2026-12-17","2026-12-24","2027-01-07"],
  fri:["2026-09-25","2026-10-02","2026-10-09","2026-10-16","2026-10-30","2026-11-06","2026-11-13","2026-11-20","2026-11-27","2026-12-04","2026-12-11","2026-12-18","2026-12-25","2027-01-08","2027-01-15"]
};

const BREAKS = [
  {d:"2026-10-23", ja:"休講（金曜授業なし）",        en:"No Friday classes"},
  {d:"2026-12-28", ja:"年末年始（12/28〜1/1）",      en:"Winter break (Dec 28 - Jan 1)"},
  {d:"2027-01-11", ja:"休講（月曜授業なし）",        en:"No Monday classes"},
  {d:"2027-01-14", ja:"休講（木曜授業なし）",        en:"No Thursday classes"}
];

const MODES = {
  f2f:      {ja:"対面",         en:"Face-to-face", cls:"b-f2f"},
  live:     {ja:"遠隔ライブ",   en:"Live online",  cls:"b-live"},
  ondemand: {ja:"オンデマンド", en:"On-demand",    cls:"b-ondemand"}
};

const S = (arr, mode, offset) => arr.map((x,i)=>({n:i+1+(offset||0), ja:x[0], en:x[1], mode:x[2]||mode||"f2f"}));

/* ---------- 科目 ---------- */
const COURSES = [
{
  id:"mom", color:"#8C5A3C", colorD:"#D9A077",
  ja:"材料力学", en:"Mechanics of Materials",
  teachers:{ja:"生津 資大、Amit BANERJEE", en:"NAMAZU Takahiro, Amit BANERJEE"},
  credits:4, lang:{ja:"英語", en:"English"},
  code:"MM214411", ttcode:"JM0001401", classMode:"f2f",
  slots:[{day:1,period:2,span:1,pick:w=>[2*w-1]},{day:4,period:1,span:1,pick:w=>[2*w]}],
  total:30, perWeek:2, firstWeek:1, lastWeek:15,
  outline:{
    ja:"機械やその構造物の破損は人命や経済に大きな損害を与える。この授業では、十分な強度と妥当な重さを両立させるために、適切な材料を選び構造部材の寸法を決める力を身につける。まず材料力学の基本概念と基礎的な仮定を学び、外力を受ける棒やはりの応力・変形の計算へと進む。",
    en:"Breakages in machine systems and structures endanger lives and cause economic losses. The course builds the skills to choose an appropriate material and define the dimensions of a structural member with both sufficient strength and reasonable weight, starting from basic concepts and moving to stress and deformation of bars and beams under external loads."},
  goals:[
    {ja:"応力とひずみの定義とその関係を理解する", en:"Understand the definition of stress and strain and their relationship"},
    {ja:"引張・圧縮・ねじりを受ける棒の応力と変形を計算できる", en:"Calculate stress and deformation of a bar under tension, compression or torsion"},
    {ja:"曲げを受ける単純はりのせん断応力・曲げモーメント・曲げ応力を求められる", en:"Examine shear stress, bending moment and bending stress of a simple beam"},
    {ja:"曲げを受ける単純はりのたわみ曲線を描ける", en:"Draw the deflection curve of a simple beam under bending"}],
  evals:[
    {pct:40, ja:"期末試験", en:"Final exam", note:{ja:"総合的な理解を評価", en:"Comprehensive understanding is evaluated"}},
    {pct:33, ja:"小テスト", en:"Quiz", note:{ja:"おおむね2回の授業ごとに実施", en:"Provided every ~two classes"}},
    {pct:27, ja:"総合演習", en:"Comprehensive exercise", note:{ja:"中間期に実施", en:"Provided at midterm"}}],
  prep:{ja:"予習120分／復習120分（毎回）", en:"120 min prep / 120 min review per class"},
  homework:{ja:"予習：指定教材を読む・視聴する　復習：授業内容の復習と課題", en:"Prep: read or watch assigned materials. Review: review class contents and work on assignments"},
  materials:{
    text:[{t:"Mechanics of Materials, International Adaptation, 5th Edition", a:"Timothy A. Philpot; Jeffery S. Thomas", p:"Wiley", i:"978-1-119-85997-0", m:{ja:"電子教科書", en:"eTextbook"}}],
    ref:[{t:"Mechanics of Materials: An Integrated Learning System, Enhanced eText, 5th Edition", a:"Timothy A. Philpot; Jeffery S. Thomas", p:"Wiley", i:"978-1-119-60301-6", m:{ja:"電子教科書", en:"eTextbook"}}]},
  feedback:{ja:"小テストの解答は次回授業で配布。試験のフィードバックは必要に応じて先端なびの掲示板などで行う。", en:"Quiz solutions are given in the next class. Exam feedback is provided via the Sentan-navi bulletin board if necessary."},
  req:{ja:"微分積分学・線形代数1と2、工学物理1と2、基礎力学を履修済みであること。", en:"Students should have taken Calculus and Linear Algebra 1 and 2, Engineering Physics 1 and 2, and Fundamental Mechanics."},
  schedule:S([
    ["材料力学入門：基礎概念の復習(1)","Introduction to mechanics of materials; review of basic concepts (1)"],
    ["材料力学入門：基礎概念の復習(2)","Introduction to mechanics of materials; review of basic concepts (2)"],
    ["各種の荷重と支持条件、力のつり合いと反力(1)","Various loads and support conditions; equilibrium of forces and reactions (1)"],
    ["各種の荷重と支持条件、力のつり合いと反力(2)","Various loads and support conditions; equilibrium of forces and reactions (2)"],
    ["応力とひずみ：応力–ひずみ線図(1)","Stress and strain: the stress-strain curve (1)"],
    ["応力とひずみ：応力–ひずみ線図(2)","Stress and strain: the stress-strain curve (2)"],
    ["単軸応力：引張と圧縮(1)","Uniaxial stress: tension and compression (1)"],
    ["単軸応力：引張と圧縮(2)","Uniaxial stress: tension and compression (2)"],
    ["単軸応力：物体力と熱応力(1)","Uniaxial stress: body force and thermal stress (1)"],
    ["単軸応力：物体力と熱応力(2)","Uniaxial stress: body force and thermal stress (2)"],
    ["単軸応力：トラス構造(1)","Uniaxial stress: truss structures (1)"],
    ["単軸応力：トラス構造(2)","Uniaxial stress: truss structures (2)"],
    ["棒のねじり(1)","Torsion of bars (1)"],
    ["棒のねじり(2)","Torsion of bars (2)"],
    ["はりの曲げ：せん断力図(SFD)と曲げモーメント図(BMD) (1)","Bending of beams: shear force diagrams (SFD) and bending moment diagrams (BMD) (1)"],
    ["はりの曲げ：SFDとBMD (2)","Bending of beams: SFD and BMD (2)"],
    ["はりの曲げ：SFDとBMD (3)","Bending of beams: SFD and BMD (3)"],
    ["はりの曲げ：SFDとBMD (4)","Bending of beams: SFD and BMD (4)"],
    ["はりの曲げ：曲げ応力と断面係数(1)","Bending of beams: bending stress and section modulus (1)"],
    ["はりの曲げ：曲げ応力と断面係数(2)","Bending of beams: bending stress and section modulus (2)"],
    ["はりの曲げ：曲げ応力と断面係数(3)","Bending of beams: bending stress and section modulus (3)"],
    ["はりの曲げ：曲げ応力と断面係数(4)","Bending of beams: bending stress and section modulus (4)"],
    ["はりの曲げ：はりのたわみ(1)","Bending of beams: deflections of beams (1)"],
    ["はりの曲げ：はりのたわみ(2)","Bending of beams: deflections of beams (2)"],
    ["はりの曲げ：はりのたわみ(3)","Bending of beams: deflections of beams (3)"],
    ["はりの曲げ：はりのたわみ(4)","Bending of beams: deflections of beams (4)"],
    ["主応力と最大せん断応力(1)","Principal stress and maximum shear stress (1)"],
    ["主応力と最大せん断応力(2)","Principal stress and maximum shear stress (2)"],
    ["エネルギー法(1)","Energy methods (1)"],
    ["エネルギー法(2)","Energy methods (2)"]],"f2f")
},
{
  id:"emt", color:"#2F5D8C", colorD:"#7FB3E0",
  ja:"電磁気学", en:"Electromagnetic Theory",
  teachers:{ja:"今井 欽之、堀井 滋", en:"IMAI Tadayuki, HORII Shigeru"},
  credits:4, lang:{ja:"英語", en:"English"},
  code:"MM314415", ttcode:"JM0001601", classMode:"f2f",
  slots:[{day:1,period:3,span:1,pick:w=>[2*w-1]},{day:4,period:3,span:1,pick:w=>[2*w]}],
  total:30, perWeek:2, firstWeek:1, lastWeek:15,
  outline:{
    ja:"電磁気学は電気現象と磁気現象を合わせて扱う分野で、物理学とメカトロニクス技術の基礎をなす。この授業では電磁現象の基本方程式であるマクスウェル方程式を理解し、現象を定性的にも定量的にも解析する力を身につける。電界・磁界の空間分布の計算方法と電磁波の基礎も扱う。",
    en:"Electromagnetic theory deals with electric phenomena in combination with magnetic phenomena. Students gain an understanding of Maxwell's equations and the skills to analyse such phenomena qualitatively and quantitatively, including methods for calculating spatial distributions of electric and magnetic fields and the basis of electromagnetic waves."},
  goals:[
    {ja:"マクスウェル方程式とガウスの法則・アンペールの周回積分の法則との関係を、微分演算子の役割を含めて理解する", en:"Understand the relationships of Maxwell's equations with Gauss's law and Ampere's circuital law, including the role of differential operators"},
    {ja:"電気部品に電圧を加えたとき電界・磁界がどう生じるかを定性的に説明できる", en:"Explain qualitatively how electric and magnetic fields are generated when a voltage is applied to a component"},
    {ja:"電磁誘導の法則とメカトロニクスの基本的な関係を理解する", en:"Understand the fundamental relationship between the law of electromagnetic induction and mechatronics"}],
  evals:[
    {pct:60, ja:"期末試験", en:"Final examination", note:null},
    {pct:40, ja:"授業の理解度", en:"Degree of understanding of lecture", note:{ja:"授業内の小テストで評価", en:"Evaluated by in-class quizzes"}}],
  prep:{ja:"予習120分／復習120分（毎回）", en:"120 min prep / 120 min review per class"},
  homework:{ja:"予習：次回の内容に目を通す　復習：授業内容と配布資料を理解する", en:"Prep: look over contents to be learned in class. Review: understand contents learned and distributed materials."},
  materials:{
    text:[],
    ref:[{t:"Fundamentals of Physics", a:"David Halliday, Robert Resnick, Jearl Walker", p:"John Wiley & Sons", i:"1119801141", m:{ja:"第12版", en:"12th Edition"}},
         {t:"電気磁気学", a:"山田 直平、桂井 誠", p:"電気学会", i:"4886862314", m:{ja:"3版改訂", en:"3rd rev. ed."}}]},
  feedback:{ja:"必要に応じて次回授業でコメントする。", en:"Comments are provided according to necessity in the next class."},
  req:{ja:"工学物理2および工学物理2演習を履修済みであること。微分積分の基礎知識と計算力が必要。教材は必要に応じて授業内で紹介。毎回、筆記用具と自分のPCを持参すること。", en:"Engineering Physics 2 and its Exercises must be taken beforehand. Basic knowledge and computational skills of calculus are required. Bring writing materials and your own PC to every class."},
  schedule:S([
    ["電磁気学の概要","Overview of electromagnetic theory"],
    ["場の量と線積分","Field values and line integral"],
    ["ナブラ演算子と勾配","Operator nabla and gradient"],
    ["面積分とガウスの法則","Surface integral and Gauss's law"],
    ["ガウスの法則を使った電界の計算","Calculating electric field with Gauss's law"],
    ["ベクトル場の発散とポアソン方程式","Divergence of vector field and Poisson's equation"],
    ["電位の数値計算","Numerical calculation of potential"],
    ["導体とコンデンサ","Conductors and capacitors"],
    ["双極子・分極・誘電体","Dipole, polarization and dielectrics"],
    ["誘電体があるときのガウスの法則","Gauss's law with dielectrics"],
    ["誘電体に蓄えられるエネルギー","Energy stored in dielectrics"],
    ["電流・電圧・電力","Current, voltage and electric power"],
    ["電気現象のまとめ","Review of electric phenomena"],
    ["ベクトル演算(1)：発散","Vector calculations (1): Divergence"],
    ["ベクトル演算(2)：回転、ガウスの発散定理","Vector calculations (2): Rotation, Gauss divergence theorem"],
    ["ベクトル演算(3)：ストークスの定理","Vector calculations (3): Stokes theorem"],
    ["ビオ・サバールの法則","Biot-Savart's law"],
    ["アンペールの法則","Ampere's law"],
    ["ベクトルポテンシャル","Vector potential"],
    ["アンペールの法則とガウスの法則の微分形（磁界）","Differential forms of Ampere's and Gauss' laws (for magnetic field)"],
    ["電磁誘導（ファラデーの法則、レンツの法則）","Electromagnetic induction (Faraday's law, Lenz's law)"],
    ["磁性材料","Magnetic materials"],
    ["磁性材料があるときの磁界","Magnetic field with magnetic materials"],
    ["磁気回路","Magnetic circuits"],
    ["場と電荷","Fields and charges"],
    ["変位電流、マクスウェル方程式と波動方程式","Displacement current, Maxwell's equations and wave equation"],
    ["電磁波","Electromagnetic wave"],
    ["電磁波の性質","Properties of electromagnetic wave"],
    ["ポインティングベクトル","Poynting vector"],
    ["まとめと復習","Summary and review"]],"f2f")
},
{
  id:"calc", color:"#4C6B3C", colorD:"#9CC47F",
  ja:"微分積分学続論 I", en:"Advanced Calculus 1",
  teachers:{ja:"Martin SERA、中村 浩一", en:"Martin SERA, NAKAMURA Koichi"},
  credits:3, lang:{ja:"英語", en:"English"},
  code:"MC221306", ttcode:"JM0000401", classMode:"f2f",
  slots:[{day:0,period:2,span:1,pick:w=>[2*w-1]},{day:1,period:5,span:1,pick:w=>[2*w]}],
  total:30, perWeek:2, firstWeek:1, lastWeek:15,
  outline:{
    ja:"微分積分学・線形代数1と2で学んだ内容を土台に、機械工学・電気工学で広く使われる常微分方程式(ODE)とベクトル解析を扱う。工学に関わるODEとベクトル解析を理解するための知識と実践的な計算技術の両方を身につけ、1階・2階のODEとベクトル解析の基礎に関する新しい技能を養う。",
    en:"Building on Calculus and Linear Algebra 1 and 2, this course introduces ordinary differential equations (ODE) and vector calculus widely used in mechanical and electrical engineering, developing both knowledge and practical calculation techniques."},
  goals:[
    {ja:"常微分方程式の原理に習熟する", en:"Be proficient in the principles of ordinary differential equations"},
    {ja:"常微分方程式で簡単な物理系をモデル化できる", en:"Use ODEs to model simple physical systems"},
    {ja:"線形・非線形の常微分方程式を手計算でもコンピュータでも解ける", en:"Solve linear and non-linear ODEs both manually and with a computer"},
    {ja:"スカラー場・ベクトル場の微分計算に習熟する", en:"Be proficient in differential calculus of scalar and vector fields"},
    {ja:"ベクトル解析で物理系や現象を記述できる", en:"Use vector calculus to describe physical systems and phenomena"}],
  evals:[
    {pct:70, ja:"期末試験", en:"Final exam", note:null},
    {pct:30, ja:"課題", en:"Assignments", note:{ja:"内容は授業内で解説", en:"Reviewed in class"}}],
  prep:{ja:"予習75分／復習75分（毎回）", en:"75 min prep / 75 min review per class"},
  homework:{ja:"予習：該当箇所の教科書・参考書を読む　復習：授業内容と課題を教科書・参考書で確認", en:"Prep: read the textbook and references for the corresponding sections. Review: review the lecture contents and assignments."},
  materials:{
    text:[{t:"Advanced Engineering Mathematics, 10th Ed. International Student Vers.", a:"E. Kreyszig", p:"John Wiley & Sons", i:"978-0470646137", m:null}],
    ref:[{t:{ja:"必要に応じて授業内で紹介・配布", en:"Introduced/provided in class, as required"}, a:"", p:"", i:"", m:null}]},
  feedback:{ja:"課題の内容は授業内で解説する。", en:"Contents of the assignments are reviewed in class."},
  req:{ja:"履修前に微分積分学・線形代数1および2を修得していること。第29・30回の遠隔回はオンデマンドと双方向を併用したバーチャル教室で実施し、出席は授業内容に関する小テストで確認する。", en:"Calculus and Linear Algebra 1 and 2 must be completed before registration. Remote classes (29-30) use virtual classrooms; attendance is verified by quizzes."},
  schedule:S([
    ["常微分方程式入門、モデル化","Introduction to ordinary differential equations, modelling"],
    ["常微分方程式の解","Solutions of ODE"],
    ["常微分方程式の幾何学的な意味","Geometric meaning behind ODE"],
    ["常微分方程式の数値解析","Numerical analysis of ODE"],
    ["1階線形常微分方程式","Linear ODE of 1st order"],
    ["1階非同次線形常微分方程式","Non-homogeneous linear ODE of 1st order"],
    ["変数分離法","Separation of variables"],
    ["ベルヌーイの微分方程式","Bernoulli differential equation"],
    ["2階線形常微分方程式","Linear ODE of second order"],
    ["2階同次線形常微分方程式","Homogeneous linear ODE of 2nd order"],
    ["2階非同次線形常微分方程式","Non-homogeneous linear ODE of 2nd order"],
    ["未定係数法","Method of undetermined coefficients"],
    ["強制力のあるばね–質量系","Mass-spring systems with driving force"],
    ["定数変化法","Variation of parameters"],
    ["ラプラス変換","Laplace transform"],
    ["ラプラス変換による線形常微分方程式の解法","Application of LT to solve linear ODE"],
    ["曲線の導入","Introduction to curves"],
    ["滑らかな曲線 I","Smooth curves I"],
    ["滑らかな曲線 II","Smooth curves II"],
    ["曲線の曲率とねじれ率","Curvature and torsion of curves"],
    ["微分演算子の導入","Introduction to differential operators"],
    ["ベクトル場の発散と回転","Divergence and rotation of vector fields"],
    ["線積分","Line integrals"],
    ["線積分の近似","Approximation of line integrals"],
    ["保存ベクトル場 I","Conservative vector fields I"],
    ["保存ベクトル場 II","Conservative vector fields II"],
    ["グリーンの定理","Green's theorem"],
    ["グリーンの定理の応用","Applications of Green's theorem"],
    ["扱った内容の総復習","Review of the topics covered","ondemand"],
    ["演習による内容の復習","Review of contents by solving exercises","ondemand"]],"f2f")
},
{
  id:"ec", color:"#6B4C8C", colorD:"#B69AD8",
  ja:"電気回路", en:"Electric Circuits",
  teachers:{ja:"今井 欽之", en:"IMAI Tadayuki"},
  credits:2, lang:{ja:"英語", en:"English"},
  code:"MM311223", ttcode:"JMS525402", classMode:"f2f",
  slots:[{day:1,period:1,span:1,pick:w=>[w]}],
  total:15, perWeek:1, firstWeek:1, lastWeek:15,
  outline:{
    ja:"産業プラントから携帯電話のような小型家電まで、電力を使う機器はすべて電気・電子回路で制御されている。抵抗・コンデンサ・コイルといった受動素子で構成される基本回路を学び、方程式を用いた回路解析とインピーダンス（抵抗の拡張）の概念を通して解析力を養う。最後に過渡現象を学んで基礎を完成させる。",
    en:"All devices that use electric power are controlled by electric and electronic circuits. This course covers basic circuits built from passive components, circuit analysis using equations, the concept of impedance, and finally transient phenomena."},
  goals:[
    {ja:"キルヒホッフの法則を使って受動回路を解析できる", en:"Analyze passive circuits using Kirchhoff's laws"},
    {ja:"複素数計算を用いて回路の周波数応答を解析できる", en:"Analyze the frequency response of a circuit using complex arithmetic"},
    {ja:"受動電気回路の過渡現象を解析できる", en:"Analyze transient phenomena in passive electric circuits"}],
  evals:[
    {pct:70, ja:"期末試験", en:"Final examination", note:null},
    {pct:30, ja:"授業の理解度", en:"Degree of understanding of lecture", note:{ja:"授業内の小テストで評価", en:"Evaluated with in-class quizzes"}}],
  prep:{ja:"予習120分／復習120分（毎回）", en:"120 min prep / 120 min review per class"},
  homework:{ja:"予習：次回の内容に目を通す　復習：授業内容と配布資料を理解する", en:"Prep: look over contents to be learned in class. Review: understand contents learned and distributed materials."},
  materials:{
    text:[],
    ref:[{t:"The Electronics Companion", a:"A. C. Fischer-Cripps", p:"CRC Press", i:"9781466552661", m:null},
         {t:"電気回路論", a:"平山 博、大附 辰夫", p:"電気学会", i:"978-4886862655", m:null}]},
  feedback:{ja:"必要に応じて次回授業でコメントする。", en:"Comments are provided according to necessity in the next class."},
  req:{ja:"授業前に配布資料で予習しておくこと。教材は必要に応じて授業内で紹介。毎回、筆記用具と自分のPCを持参すること。", en:"Study the provided materials before class. Bring writing materials and your own PC to every class."},
  schedule:S([
    ["電気回路の概要","Overview of electric circuits"],
    ["キルヒホッフの法則","Kirchhoff's laws"],
    ["回路解析の方法","Circuit analysis methods"],
    ["交流と周期信号","Alternating currents and periodic signals"],
    ["フーリエ級数","The Fourier series"],
    ["複素フーリエ級数","The complex Fourier series"],
    ["インピーダンスとアドミタンス","Impedance and admittance"],
    ["複素振幅による交流回路の解析","Analysis of AC circuits with complex amplitudes"],
    ["交流の電力","The power of an alternating current"],
    ["受動素子で構成される回路","Circuits consisting of passive components"],
    ["電気回路の諸定理","Electrical circuit theorems"],
    ["過渡現象(1)：線形微分方程式","Transient phenomena (1): linear differential equations"],
    ["過渡現象(2)：ラプラス変換","Transient phenomena (2): the Laplace transform"],
    ["過渡現象(3)：ラプラス変換を用いた解析","Transient phenomena (3): analyses using the Laplace transform"],
    ["まとめと復習","Summary and review"]],"f2f")
},
{
  id:"ece", color:"#B4452F", colorD:"#E89A85",
  ja:"電気回路演習", en:"Electric Circuits Exercises",
  teachers:{ja:"Alberto Castellazzi", en:"Alberto Castellazzi"},
  credits:1, lang:{ja:"英語", en:"English"},
  code:"MM334124", ttcode:"JM0001701", classMode:"f2f",
  note:{ja:"「電気回路」とは別科目", en:"A separate subject from Electric Circuits"},
  slots:[{day:0,period:3,span:2,pick:w=>(w>=8?[w-7]:[])}],
  total:8, perWeek:1, unit:"week", firstWeek:8, lastWeek:15,
  outline:{
    ja:"電気回路（および一部アナログ電子回路）の理論を、実際に回路を作って測定することで補完・定着させる演習。オペアンプ・受動部品・アナログICを使って、オーディオアンプとその電源（リニアレギュレータ）を設計・製作・試験する。反転／非反転／差動構成のオペアンプによる信号増幅、ロー・ハイ・バンドパスフィルタ、コンデンサの種類（電解・セラミック・フィルム）、誘導性負荷の駆動、リニアレギュレータ／電源が主な学習項目。CAD手法とツール、技術レポートと議論の練習も行う。",
    en:"A hands-on module complementing Electric Circuits through circuit development and testing. Students design, assemble and test an audio amplifier and its linear-regulator power supply, covering op-amps, filters, capacitor technologies, inductive loads and linear regulators, plus CAD tools and technical reporting."},
  goals:[
    {ja:"回路設計理論を応用する実践", en:"Practice in the application of circuit design theory"},
    {ja:"実際の回路組立と測定手法", en:"Practical circuit building and test methods"},
    {ja:"実験データを収集・解析・評価する力", en:"Ability to collect, analyze and evaluate experimental data"},
    {ja:"実験データと考察を文書・口頭で発表する力", en:"Presentation of experimental data and lab findings through written and oral reports"}],
  evals:[
    {pct:40, ja:"ハードウェアのデモ", en:"Hardware demonstration", note:{ja:"チーム評価（メンバー全員同じ点）", en:"Team mark, same for all members"}},
    {pct:30, ja:"個別の技術質疑(Q&A)", en:"Individual technical discussion (Q&A)", note:{ja:"個人評価。議論の長さは評価に無関係", en:"Individual mark; duration is not relevant"}},
    {pct:20, ja:"ショートレポート", en:"Short report", note:{ja:"チーム評価。指定テンプレートで1通提出", en:"Team mark; single report using the provided template"}},
    {pct:10, ja:"取り組み姿勢", en:"Engagement", note:{ja:"個人評価。出席・コミットメント・チームへの貢献", en:"Individual mark for attendance, commitment and fairness"}}],
  prep:{ja:"予習60分／復習60分（毎回）", en:"60 min prep / 60 min review per class"},
  homework:{ja:"Teams上の共有資料で準備・復習", en:"Preparation and review using shared resources on Teams"},
  materials:{
    text:[{t:"The Electronics Companion", a:"A. C. Fischer-Cripps", p:"CRC Press", i:"978-1466552661", m:null},
          {t:"電気回路論", a:"平山 博、大附 辰夫", p:"電気学会", i:"978-4886862655", m:null}],
    ref:[{t:{ja:"講義ノートと演習課題は授業内配布＋TeamsチャネルにPost。シミュレーションソフトとファイルも提供。", en:"Lecture notes and exercises are provided in class and posted on the Teams channel, along with simulation software."}, a:"", p:"", i:"", m:null}]},
  feedback:{ja:"その場、または次回のLab、必要に応じてTeamsでコメントする。", en:"Comments are provided immediately, in the next lab session, or via Teams."},
  req:{ja:"電気・電子、オーディオ増幅、信号処理への関心とチームワーク。", en:"Flair for things electrical/electronic, audio amplification, signal processing, and team-work."},
  alert:{ja:"第8週（11/16）からの開講。第1〜7週は授業がない。", en:"Runs from week 8 (Nov 16). No classes in weeks 1-7."},
  schedule:S([
    ["プロジェクトの目的、主要部品のデータシートとシミュレーションツールの理解、回路シミュレーションモデルの作成","Familiarization with the project main aims, main components data-sheet and simulation tools; development of a circuit simulation model"],
    ["CADシミュレーションによる時間領域解析、グラフとレポートページの作成","Time-domain analysis by computer aided simulation and creation of sample graphs and report pages"],
    ["CADシミュレーションによる周波数領域解析、グラフとレポートページの作成","Frequency-domain analysis by computer aided simulation and creation of sample graphs and report pages"],
    ["ブレッドボードによるアンプ試作と検証","Amplifier prototype development and validation using breadboard"],
    ["PCBによるアンプ試作と検証、自作Matlabファイルによる一連の試験","Amplifier prototype development and validation using PCB; whole test campaign using custom generated Matlab files"],
    ["スピーカ接続の仕上げと実際の音楽再生、最終レポート用データの取得","Finalize speaker interconnection and play some real music; acquire all necessary test data for final reporting"],
    ["リニアレギュレータ回路の理解とブレッドボード／PCBでの試作","Familiarization and prototype development of linear regulator circuit on breadboard and PCB"],
    ["電源とアンプの接続、システム全体の動作デモと主要データ取得","Interconnection of power supply and amplifier and demonstration of whole system operation; key data-acquisition"]],"f2f")
},
{
  id:"shop", color:"#8C6F2F", colorD:"#D9BA74",
  ja:"機械製作実習 Group A", en:"Exercise for Machine Shop Practice Group A",
  teachers:{ja:"足立 伸太郎、川上 浩司、生津 資大、的場 洋嗣", en:"ADACHI Shintarou, KAWAKAMI Hiroshi, NAMAZU Takahiro, MATOBA Hirotsugu"},
  credits:3, lang:{ja:"英語", en:"English"},
  code:"MX241301", ttcode:"JMX430301", classMode:"f2f",
  slots:[{day:3,period:3,span:3,pick:w=>[w]}],
  total:15, perWeek:1, unit:"week", firstWeek:1, lastWeek:15,
  outline:{
    ja:"旋盤・フライス盤・ボール盤などの工作機械を実際に使うハンズオン実習。機械加工の基礎、加工プロセス、工作機械、加工精度について知識と技能を身につける。さらに3Dプリンタによる積層造形を学び、加工プロセスと安全に関する一般知識を完成させる。",
    en:"Hands-on experience with machining tools including lathes, mills and drills, covering machining fundamentals, processes, machine tools and accuracy, plus additive manufacturing with 3D printing."},
  goals:[
    {ja:"機械加工プロセスに関する基礎知識と実践的技術を身につける", en:"Acquire basic knowledge and practical techniques related to machining processes"},
    {ja:"実習を通じて工作機械の基本原理と操作を学ぶ", en:"Learn the basic principles and operation of machine tools through shop training"},
    {ja:"NC（数値制御）プログラミングとNC工作機械を理解する", en:"Understand numeric control (NC) programming and NC machines"}],
  evals:[
    {pct:60, ja:"実習への参加", en:"Participation", note:{ja:"欠席が直接効く最大の項目", en:"The item most directly hit by absence"}},
    {pct:20, ja:"小テスト", en:"Quiz", note:null},
    {pct:20, ja:"レポート", en:"Reports", note:{ja:"指定テーマ。期限までに提出", en:"On assigned themes, before the deadlines"}}],
  prep:{ja:"予習180分（毎回）", en:"180 min preparation per session"},
  homework:{ja:"事前配布の資料を読む／機械操作の動画を視聴する", en:"Read the handouts distributed beforehand / watch the machine-operation video"},
  materials:{text:[],ref:[]},
  feedback:{ja:"レポートへのコメントは授業内で行う。", en:"Feedback and comments on reports are given in class."},
  req:{ja:"事前配布の実習資料を読み、実施する作業の準備をしておくこと。実習後は資料を用いて経験を振り返り、指定テーマのレポートを期限までに提出すること。第3週〜第14週は原則2人1組で、各実習をローテーションで行う。", en:"Read the materials distributed in advance and prepare. Submit reports on the assigned themes before the deadlines. From week 3 to 14, students work in teams of two and rotate."},
  alert:{ja:"参加が60%を占めるので、欠席は目安の回数より重く効く。", en:"Participation is 60% of the grade, so absence hits harder than the raw count suggests."},
  schedule:S([
    ["ガイダンス、工作実習室の見学、安全教育","Guidance, machine workshop mini tour and safety"],
    ["各工作機械の安全に関する講義、機械製図の講義、NCプログラミングの講義と実習","Lecture on safety of individual machine tools; machine drawing; NC programming lecture and practice"],
    ["3Dプリンティング(1)：3Dプリンタの機構と制御","3D Printing (1): the mechanisms and control of the 3D printer"],
    ["3Dプリンティング(2)：立体造形物をつくる","3D Printing (2): creating three-dimensional solid objects"],
    ["旋盤(1)：手動およびNCによる旋削","The lathe (1): turning performed manually and with numerical control"],
    ["旋盤(2)：続き","The lathe (2): continued"],
    ["フライス加工(1)：各種部品の製作","Milling (1): fabricating various components"],
    ["フライス加工(2)：続き、平面研削による平面出し","Milling (2): continued; surface grinding"],
    ["マシニングセンタ(1)：CNCプログラミング","Machining center (1): CNC programming"],
    ["マシニングセンタ(2)：各種部品の製作、手作業（穴あけ、やすり仕上げ）","Machining center (2): fabricating components; manual working: drilling, finishing using files"],
    ["板金のレーザ加工","Laser processing of sheet metal"],
    ["表面粗さ試験機と三次元測定機による精密測定","Precision measurement using surface roughness testing and coordinate measuring machines"],
    ["電動モータの分解","Disassembly of an electrical motor"],
    ["電動モータの組立","Assembly of an electrical motor"],
    ["最終発表、課題の討論、総括","Final presentation, discussion of issues, and review"]],"f2f")
},
{
  id:"career", color:"#3E7D62", colorD:"#86C7AC",
  ja:"キャリアデザイン", en:"Career Design",
  teachers:{ja:"西 正之、今井 欽之、的場 洋嗣", en:"NISHI Masayuki, IMAI Tadayuki, MATOBA Hirotsugu"},
  credits:2, lang:{ja:"日本語", en:"Japanese"},
  code:"MR217201", ttcode:"JCR000802", classMode:"f2f",
  slots:[{day:4,period:5,span:1,pick:w=>[w]}],
  total:15, perWeek:1, firstWeek:1, lastWeek:15,
  outline:{
    ja:"人生設計のなかで働くことの意味と、キャリアをどう位置づけるかを考える。将来の自分のキャリア像を形づくり、就職活動に必要な基礎知識とスキルを身につける。あわせて、3年次から始まるプレキャップストーン・プログラムに向けて、学生としてのKUAS行動規範を修得する。",
    en:"Students think about the meaning of working within their life planning, form their own future career image, and acquire basic knowledge and skills for job hunting, plus the KUAS Code of Conduct."},
  goals:[
    {ja:"キャリア像を築く", en:"Build a career image"},
    {ja:"企業との協働活動に必要な基礎知識とスキルを身につける", en:"Acquire the basic knowledge and skills required for collaborative activities with companies"},
    {ja:"就職活動に必要な基礎知識とスキルを身につける", en:"Acquire the basic knowledge and skills required for job hunting"}],
  evals:[
    {pct:90, ja:"レポート", en:"Reports", note:{ja:"毎回、復習としてレポート作成", en:"Written as review after every class"}},
    {pct:10, ja:"プレゼンテーション", en:"Presentation", note:{ja:"発表は必須要件", en:"A presentation is one of the requisites"}}],
  prep:{ja:"予習120分／復習120分（毎回）", en:"120 min prep / 120 min review per class"},
  homework:{ja:"予習：事前配布の資料を読む／動画を視聴する　復習：レポート作成", en:"Prep: read materials or watch videos provided in advance. Review: report writing."},
  materials:{text:[],ref:[{t:{ja:"必要に応じて紹介", en:"Will be introduced as required"},a:"",p:"",i:"",m:null}]},
  feedback:{ja:"必要に応じて次回授業の先端なびフィードバック欄でコメントする。", en:"Comments are provided as necessary in the Sentan Navi feedback column in the following lecture."},
  req:{ja:"4月入学者のみ履修登録可。", en:"Only students enrolled in April can register."},
  schedule:S([
    ["オリエンテーション／社会人の人生論・キャリアを聴く(1)","Orientation / Listen to life theory and career from working people (1)"],
    ["日本の経済と労働環境(1)／社会人の話を聴く(2)","Economic and working environment in Japan (1) / working people (2)"],
    ["日本の経済と労働環境(2)／社会人の話を聴く(3)","Economic and working environment in Japan (2) / working people (3)"],
    ["職業を持つこと（働くこと）の意味と意義(1)／社会人の話を聴く(4)","Meaning and significance of having a profession (1) / working people (4)"],
    ["職業を持つこと（働くこと）の意味と意義(2)／社会人の話を聴く(5)","Meaning and significance of having a profession (2) / working people (5)"],
    ["生活とマネーリテラシー(1)／社会人の話を聴く(6)","Life and money literacy (1) / working people (6)"],
    ["生活とマネーリテラシー(2)／社会人の話を聴く(7)","Life and money literacy (2) / working people (7)"],
    ["企業を知る(1)／社会人の話を聴く(8)","Get to know the company (1) / working people (8)"],
    ["企業を知る(2)／社会人の話を聴く(9)","Get to know the company (2) / working people (9)"],
    ["企業の職種と雇用環境を知る(1)／社会人の話を聴く(10)","Know the occupation and employment environment of a company (1) / working people (10)"],
    ["企業の職種と雇用環境を知る(2)／社会人の話を聴く(11)","Know the occupation and employment environment of a company (2) / working people (11)"],
    ["キャリア形成と自己分析(1)／社会人の話を聴く(12)","Career formation and self-analysis (1) / working people (12)"],
    ["キャリア形成と自己分析(2)／社会人の話を聴く(13)","Career formation and self-analysis (2) / working people (13)"],
    ["行動規範1（ビジネスマナーを含む）","Code of conduct 1 (incl. business etiquette)"],
    ["行動規範2（ビジネスマナーを含む）","Code of conduct 2 (incl. business etiquette)"]],"f2f")
},
{
  id:"qol", color:"#B0863C", colorD:"#E0BC7F",
  ja:"クオリティ・オブ・ライフの探究", en:"The Pursuit of Quality of Life",
  teachers:{ja:"桑村 テレサ、プレヴォ ニコラ、Alex KERR", en:"KUWAMURA Teresa, PREVOT Nicolas, Alex KERR"},
  credits:2, lang:{ja:"英語", en:"English"},
  code:"DF114205", ttcode:"—", classMode:"remote",
  slots:[{day:2,period:1,span:1,pick:w=>[w]}],
  total:15, perWeek:1, firstWeek:1, lastWeek:15,
  outline:{
    ja:"社会の基準は経済成長重視から、豊かさの実感・心身の健康・ウェルビーイングを含む「生活の質」重視へと急速に移りつつある。働き方、ライフプラン、食習慣、健康、余暇の過ごし方も大きく変化している。ウェルビーイングの高い暮らしと社会をどう理解し設計するかを考える、分野横断的な知と方法を動員する未来志向の研究領域。（オムニバス形式／全15回）",
    en:"Society's standards are shifting from economic growth to quality of life. Understanding and designing a prosperous society and ways of living with high well-being is the theme. (Omnibus format, 15 sessions.)"},
  goals:[
    {ja:"QOLをめぐる現代的テーマとその背景・課題を理解し、適切に説明できる", en:"Understand contemporary themes surrounding quality of life and explain them appropriately"},
    {ja:"それらを自分自身の問題として捉え、社会としての解決策を考える", en:"Internalize the issues as personal concerns and think about solutions as a society"},
    {ja:"積極的に参加し意見を共有し、課題と小テストをやり切る", en:"Actively engage, share opinions, and complete homework and quizzes"}],
  evals:[
    {pct:100, ja:"各回のレポートまたは多肢選択クイズ", en:"Report or multi-choice quiz after each lecture", note:{ja:"15回の平均点。未提出・期限遅れはその週0点", en:"Average of all 15; a late or missing submission scores 0 for that week"}}],
  prep:{ja:"予習120分／復習120分（毎回）", en:"120 min prep / 120 min review per class"},
  homework:{ja:"オンライン学習＋多肢選択クイズ（第1〜10回）／ショートエッセイ（第11〜15回）", en:"Online study and multi-choice quiz (1-10) / writing short essays (11-15)"},
  materials:{text:[],ref:[],other:{ja:"コースパック（配布資料一式）または先端なび上のPPT", en:"Course pack (a collection of printouts) or PPT on Sentan Navi"}},
  feedback:{ja:"各クイズに毎週の成績がつく。解答は次回授業の冒頭に匿名で解説される。", en:"A weekly grade is given for each quiz; answers are reviewed anonymously at the beginning of each lecture."},
  req:{ja:"全回出席が必須。出席は各回のクイズ・課題の提出でも確認される。Teamsで時間どおりに参加し、授業を妨げる行為は慎むこと。授業時間中にログインしていないと出席扱いにならない。各回の授業後、1週間以内にオンラインの多肢選択クイズまたは課題を完了すること。", en:"All lectures are mandatory. Join on time via Teams; if you do not log in during the scheduled class time you are not marked present. Complete each quiz or homework within one week of the lecture."},
  alert:{ja:"成績は15回のクイズ／課題の平均のみ。1回落とすと満点でも約6.7点失う計算になる。", en:"The grade is the plain average of 15 quizzes, so each missed week costs about 6.7 points."},
  schedule:S([
    ["幸福研究の発展と方法論、国連の幸福度報告書・ランキングの考え方","Happiness study and its evolution, methodology, and the UN philosophy in the Happiness Report and rankings","ondemand"],
    ["デンマーク（幸福度2位）：社会と生活環境","Denmark, the second-ranked country: social and living environments","ondemand"],
    ["イギリス（19位）：歴史、政治、社会の風景","United Kingdom, the 19th-ranked country: history, politics and social landscape","ondemand"],
    ["フィンランド：世界一幸福な国(2025)","Finland - world's happiest country (2025)","ondemand"],
    ["アメリカ（15位）：社会環境、ライフスタイル、社会問題","United States, the 15th-ranked country: social environment, lifestyle and social issues","ondemand"],
    ["身体と心の仕組み","This is how your body and mind work","live"],
    ["幸福・ストレス・うつの生理学","The physiology of happiness, stress and depression","live"],
    ["生活習慣と疾患(1)：神経変性","Lifestyle choices and disease (1. Neurodegeneration)","live"],
    ["生活習慣と疾患(2)：心血管疾患","Lifestyle choices and disease (2. Cardiovascular diseases)","live"],
    ["生活習慣と疾患(3)：がん","Lifestyle choices and disease (3. Cancer)","live"],
    ["スメール・パラダイム 第1層：基礎（衣食、衛生、付加物、贅沢、消費主義）","The Sumeru paradigm, 1st level: basics (food and clothing, hygiene, extras, luxuries, consumerism)","ondemand"],
    ["第2層：社会問題（格差、暴力、女性の地位、自由）","2nd level: social issues (wealth inequality, violence, women's position, freedom)","ondemand"],
    ["第3層：魔法の森（芸術と美、真・行・草）","3rd level: the magic forest (art and beauty, Shin Gyo So)","ondemand"],
    ["第4層：自己を超える（大義と他者への贈与、社会における慈善）","4th level: rising above the self (have a cause and giving to others, philanthropy in society)","ondemand"],
    ["第5層：生を超える（哲学、宗教、瞑想、超越）","5th level: rising above life (philosophy, religion, contemplation, transcendence)","ondemand"]])
},
{
  id:"bds", color:"#4C7A8C", colorD:"#93C4D6",
  ja:"ビジネスデータサイエンス入門", en:"Introduction to Business Data Science",
  teachers:{ja:"中村 浩一", en:"NAKAMURA Koichi"},
  credits:2, lang:{ja:"英語", en:"English"},
  code:"DC111221", ttcode:"—", classMode:"remote",
  slots:[{day:3,period:6,span:1,pick:w=>[w]}],
  total:15, perWeek:1, firstWeek:1, lastWeek:15,
  outline:{
    ja:"実務に携わる講師が、ビジネスに不可欠になりつつあるデジタルデータの活用について、初歩から応用までのケーススタディとワークショップを行う。各企業で導入・定着しているデータ活用の実例や、今後さらに発展が見込まれるAIなどの技術動向を学ぶ。ディスカッションを通じて気づきを自分の言葉にし、アウトプットすることがゴール。",
    en:"Lecturers involved in actual business operations provide case studies and workshops on the use of digital data, covering applications established in companies and trends in AI. The goal is to produce outputs through discussion."},
  goals:[
    {ja:"各企業で導入・定着しているデータ活用と実務事例を幅広く学ぶ", en:"Learn widely about data utilization applications established in companies"},
    {ja:"今後発展が期待されるAI等の技術動向を理解する", en:"Understand trends in AI and other technologies expected to develop further"},
    {ja:"ディスカッションを通じて気づきを言語化しアウトプットする", en:"Produce outputs through discussions to verbalize findings"}],
  evals:[
    {pct:75, ja:"各回の活動と課題", en:"Activities and assignments in each class", note:{ja:"授業中または授業後に各回で課される", en:"Assigned in the classroom or after each class"}},
    {pct:25, ja:"最終レポート", en:"Final report", note:{ja:"全授業終了後に課される", en:"Assigned after all classes"}}],
  prep:{ja:"予習120分／復習120分（毎回）", en:"120 min prep / 120 min review per class"},
  homework:{ja:"予習：参考資料を読む　復習：課題に沿って講義とディスカッションの内容を振り返る", en:"Prep: read reference materials. Review: review the lecture and discussion according to the assignment."},
  materials:{text:[],ref:[],other:{ja:"参考資料は先端なびまたはTeamsで提供", en:"Reference materials are given in Sentan Navi and/or Teams"}},
  feedback:{ja:"課題と最終レポートへのコメントは、必要に応じて先端なびまたはTeamsに掲示される。", en:"Comments are posted in Sentan Navi and/or Teams as necessary."},
  req:{ja:"原則として全回、Teamsによる同時双方向（ライブ）授業。変更は先端なびとTeamsに掲示されるので、見落とさないよう毎日確認すること。", en:"In principle all classes are live on Teams. Changes are posted on Sentan Navi and Teams, so check them daily."},
  schedule:S([
    ["デジタルデータ活用の概観（中村 浩一）","Overview of digital data utilization (Nakamura Koichi)"],
    ["ビジネスにおけるデータ活用の応用","Applications of data utilization in business"],
    ["ビジネスにおけるAIの応用","Applications of AI in business"],
    ["ビジネスにおける生成AIの応用","Applications of generative AI in business"],
    ["ビジネス現場のデータ活用(1)：企業の基幹システム","Data utilization in business scenes (1): corporate core systems"],
    ["ビジネス現場のデータ活用(2)：物流","Data utilization in business scenes (2): logistics"],
    ["ビジネス現場のデータ活用(3)：マーケティング","Data utilization in business scenes (3): marketing"],
    ["ビジネス現場のデータ活用(4)：製造","Data utilization in business scenes (4): manufacturing"],
    ["ビジネス現場のデータ活用(5)：その他の間接業務","Data utilization in business scenes (5): other indirect operations"],
    ["中間ディスカッション","Interim discussion"],
    ["デジタル活用ケーススタディ(1)","Digital utilization case study (1)"],
    ["デジタル活用ケーススタディ(2)","Digital utilization case study (2)"],
    ["デジタル活用ケーススタディ(3)","Digital utilization case study (3)"],
    ["デジタル活用ケーススタディ(4)","Digital utilization case study (4)"],
    ["最終ディスカッション","Final discussion"]],"live")
}
];

/* ---------- UI 文言 ---------- */
const T = {
  title:{ja:"2026年度 秋学期 履修ダッシュボード", en:"Fall 2026 Course Dashboard"},
  sub:{ja:"工学部 機械電気システム工学科 2年 4セメスタ ／ 太秦キャンパス ／ 9月24日〜1月18日",
       en:"Mechanical and Electrical Systems Engineering, Year 2, Semester 4 / Uzumasa Campus / Sep 24 - Jan 18"},
  tabHome:{ja:"ホーム", en:"Home"},
  tabWeek:{ja:"週別", en:"By week"},
  tabCourse:{ja:"科目詳細", en:"Courses"},
  tabMats:{ja:"教材", en:"Materials"},
  themeAuto:{ja:"テーマ：自動", en:"Theme: Auto"},
  themeLight:{ja:"テーマ：ライト", en:"Theme: Light"},
  themeDark:{ja:"テーマ：ダーク", en:"Theme: Dark"},
  timetable:{ja:"時間割", en:"Timetable"},
  ttHint:{ja:"科目をタップすると詳細へ", en:"Tap a course for details"},
  lunch:{ja:"昼休み 12:10–13:00", en:"Lunch break 12:10-13:00"},
  courses:{ja:"科目一覧", en:"Course list"},
  creditsAll:{ja:"合計単位", en:"Total credits"},
  nCourses:{ja:"科目数", en:"Courses"},
  perWeek:{ja:"週あたりのコマ数", en:"Periods per week"},
  perWeekNote:{ja:"第8週以降。第1〜7週は13コマ", en:"from week 8; 13 in weeks 1-7"},
  nF2F:{ja:"対面科目", en:"Face-to-face"},
  nRemote:{ja:"遠隔科目", en:"Remote"},
  colCourse:{ja:"科目", en:"Course"},
  colSlot:{ja:"曜日・時限", en:"Day / period"},
  colCredit:{ja:"単位", en:"Cr."},
  colMode:{ja:"形態", en:"Format"},
  colEval:{ja:"成績評価の内訳", en:"Grade breakdown"},
  colAbs:{ja:"欠席の目安", en:"Absence guide"},
  colTotal:{ja:"回数", en:"Sessions"},
  colTerm:{ja:"開講期間", en:"Runs"},
  absTitle:{ja:"休める回数の目安", en:"How many classes you can miss"},
  absLead:{ja:"授業回数の2/3以上の出席という一般的な基準で計算した目安です。9科目のシラバスには出席回数の規定が書かれていないため、正式なルールは学生便覧と各担当教員の指示を確認してください。",
           en:"Calculated on the common rule of attending at least two thirds of classes. None of the nine syllabi states an attendance rule, so confirm the official one in the student handbook and with each instructor."},
  absUnitP:{ja:"コマ", en:"periods"},
  absUnitW:{ja:"週", en:"weeks"},
  calTitle:{ja:"休講日", en:"No-class days"},
  calLead:{ja:"下の日は授業がありません。各科目の実施日はこれを除いて数えてあります。", en:"No classes on these days. All session dates below already exclude them."},
  weekOf:{ja:"第{n}週", en:"Week {n}"},
  prevW:{ja:"前の週", en:"Previous"},
  nextW:{ja:"次の週", en:"Next"},
  noClass:{ja:"授業なし", en:"No classes"},
  period:{ja:"{n}限", en:"Period {n}"},
  periodRange:{ja:"{a}–{b}限", en:"Periods {a}-{b}"},
  session:{ja:"第{n}回", en:"Session {n}"},
  weekLabel:{ja:"第{n}週", en:"Week {n}"},
  outline:{ja:"授業概要", en:"Class outline"},
  goals:{ja:"到達目標", en:"Achievement goals"},
  evalh:{ja:"成績評価", en:"Grading"},
  plan:{ja:"授業計画", en:"Class schedule"},
  mats:{ja:"教材", en:"Teaching materials"},
  textbook:{ja:"教科書", en:"Textbook"},
  reference:{ja:"参考書", en:"References"},
  other:{ja:"その他", en:"Other"},
  none:{ja:"指定なし", en:"None specified"},
  reqh:{ja:"履修条件・ルール", en:"Requirements and rules"},
  fbh:{ja:"課題へのフィードバック", en:"Feedback on assignments"},
  preph:{ja:"授業外学修", en:"Study outside class"},
  teacher:{ja:"担当教員", en:"Instructors"},
  codeh:{ja:"科目ナンバリング", en:"Subject number"},
  ttcodeh:{ja:"時間割コード", en:"Timetable code"},
  langh:{ja:"使用言語", en:"Language"},
  credh:{ja:"単位数", en:"Credits"},
  sessh:{ja:"授業回数", en:"Sessions"},
  campus:{ja:"太秦キャンパス", en:"Uzumasa Campus"},
  watch:{ja:"注意", en:"Watch out"},
  remoteSubj:{ja:"遠隔科目", en:"Remote course"},
  f2fSubj:{ja:"対面科目", en:"Face-to-face course"},
  firstDay:{ja:"初回", en:"First"},
  lastDay:{ja:"最終回", en:"Last"},
  eceNote:{ja:"電気回路演習は第8週（11/16）から開講", en:"Electric Circuits Exercises starts in week 8 (Nov 16)"},
  eceShort:{ja:"第8週〜", en:"from wk 8"},
  /* 教材ビュー */
  matsBuy:{ja:"購入が必要なもの", en:"Books you need to buy"},
  matsBuyLead:{ja:"シラバスで「教科書」として指定されている教材です。", en:"Listed as Textbook in the syllabus."},
  matsOpt:{ja:"参考書（購入は任意）", en:"References (optional)"},
  matsOptLead:{ja:"「参考書」欄の教材。必須ではありません。", en:"Listed under References. Not required."},
  matsNone:{ja:"指定なし・配布のみ", en:"Nothing to buy"},
  matsNoteH:{ja:"買うときのメモ", en:"Notes before buying"},
  colBook:{ja:"書名", en:"Title"},
  colAuthor:{ja:"著者", en:"Author"},
  colPub:{ja:"出版社", en:"Publisher"},
  colIsbn:{ja:"ISBN", en:"ISBN"},
  colForm:{ja:"形態", en:"Format"},
  paper:{ja:"（記載なし）", en:"(not stated)"},
  foot:{ja:"内容は先端なびのシラバス9件と学生時間割表にもとづきます。日本語は原文からの要約訳です。正式な情報は必ず先端なびのシラバスを確認してください。授業時間は2025年度からの全学統一時間、6限は18:00–19:00。",
        en:"Built from the nine Sentan-navi syllabi and the student timetable. Japanese text is a summarised translation; always check the official syllabus. Period times follow the university-wide schedule from 2025; period 6 is 18:00-19:00."}
};

/* 教材ビュー用のメモ */
const MAT_NOTES = [
  {ja:"The Electronics Companion と 電気回路論 は、電気回路演習では「教科書」、電気回路では「参考書」。1冊ずつ買えば両方の科目で使えます。",
   en:"The Electronics Companion and 電気回路論 are textbooks for Electric Circuits Exercises and references for Electric Circuits. One copy of each covers both."},
  {ja:"The Electronics Companion のISBNはシラバス間で 9781466552661 と 978-1466552661 の2通りで書かれていますが、同じ本です。",
   en:"The ISBN for The Electronics Companion appears as both 9781466552661 and 978-1466552661 across the syllabi. Same book."},
  {ja:"電子教科書は d-text-service.jp からアプリをダウンロードするか、先端なびトップのお気に入り「電子教科書(ブラウザ版)」を開いて、「電子教科書マニュアル」に従って使います。",
   en:"For eTextbooks, download the app from d-text-service.jp or open the browser version from the Sentan Navi favourites, following the eTextbook manual."},
  {ja:"電気回路演習は第8週からの開講なので、その教科書は11月半ばまでに用意できていれば間に合います。",
   en:"Electric Circuits Exercises starts in week 8, so its textbooks are only needed by mid-November."}
];

/* ---------- 状態 ---------- */
let LANG = "ja";
let THEME = "auto";
let VIEW = "home";
let WEEK = 1;
let COURSE = COURSES[0].id;

const $ = id => document.getElementById(id);
const byId = id => COURSES.find(c=>c.id===id);
const t = k => T[k][LANG];
const L = o => (o==null ? "" : (typeof o==="string" ? o : (o[LANG]!==undefined ? o[LANG] : o)));
const esc = s => String(s).replace(/[&<>"]/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[m]));
const fill = (s,o)=>s.replace(/\{(\w+)\}/g,(_,k)=>o[k]);

const store = {
  get(k){ try{ return localStorage.getItem(k); }catch(e){ return null; } },
  set(k,v){ try{ localStorage.setItem(k,v); }catch(e){} }
};

/* ---------- テーマ ---------- */
const mq = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;
function resolvedTheme(){ return THEME==="auto" ? (mq && mq.matches ? "dark" : "light") : THEME; }
function isDark(){ return resolvedTheme()==="dark"; }
function applyTheme(){
  document.documentElement.dataset.theme = resolvedTheme();
  $("theme-btn").textContent = THEME==="auto" ? t("themeAuto") : THEME==="light" ? t("themeLight") : t("themeDark");
}
function cycleTheme(){
  THEME = THEME==="auto" ? "light" : THEME==="light" ? "dark" : "auto";
  store.set("theme", THEME);
  applyTheme(); renderAll();
}
if(mq && mq.addEventListener) mq.addEventListener("change", ()=>{ if(THEME==="auto"){ applyTheme(); renderAll(); } });

/* ---------- 共通ヘルパ ---------- */
const cc = c => isDark() ? c.colorD : c.color;

function periodLabel(p,span){
  return span>1 ? fill(t("periodRange"),{a:p,b:p+span-1}) : fill(t("period"),{n:p});
}
function slotTime(p,span){
  const s = PERIODS[p].split("–")[0];
  const e = PERIODS[p+(span||1)-1].split("–")[1];
  return s+"–"+e;
}
function slotText(c){
  return c.slots.map(s=>DAYS[s.day].s[LANG]+" "+periodLabel(s.period,s.span||1)).join(LANG==="ja"?"／":", ");
}
function fmtDate(iso){
  const [y,m,d] = iso.split("-").map(Number);
  const wd = ["日","月","火","水","木","金","土"][new Date(y,m-1,d).getDay()];
  const wdEn = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][new Date(y,m-1,d).getDay()];
  return LANG==="ja" ? `${m}/${d}(${wd})` : `${wdEn} ${m}/${d}`;
}
function dateOf(dayIdx, week){ return DATES[DAYS[dayIdx].key][week-1]; }

function weeklyPeriods(c){ return c.slots.reduce((a,s)=>a+(s.span||1),0); }
function courseWeeks(c){ return c.unit==="week" ? c.total : c.total/(c.perWeek||1); }
function totalPeriods(c){ return c.unit==="week" ? c.total*weeklyPeriods(c) : c.total; }
function allowedAbsence(c){ return Math.floor(totalPeriods(c)/3); }
function allowedWeeks(c){ return Math.floor(courseWeeks(c)/3); }

function modeBadge(m,fillIt){
  const d = MODES[m]; if(!d) return "";
  return '<span class="badge '+d.cls+(fillIt?" fill":"")+'">'+d[LANG]+'</span>';
}
function courseModeLabel(c){ return c.classMode==="remote" ? t("remoteSubj") : t("f2fSubj"); }
function mainMode(c){
  const tally = {};
  c.schedule.forEach(s=>tally[s.mode]=(tally[s.mode]||0)+1);
  return Object.keys(tally).sort((a,b)=>tally[b]-tally[a])[0] || "f2f";
}
function termText(c){
  const first = dateOf(c.slots[0].day, c.firstWeek);
  const lastSlot = c.slots[c.slots.length-1];
  const last = dateOf(lastSlot.day, c.lastWeek);
  return fmtDate(first)+" – "+fmtDate(last);
}
function shade(hex,i){
  const a=[1,.66,.42,.25][i%4];
  const r=parseInt(hex.slice(1,3),16), g=parseInt(hex.slice(3,5),16), b=parseInt(hex.slice(5,7),16);
  const base = isDark()?0:255;
  const m=v=>Math.round(v+(base-v)*(1-a));
  return "rgb("+m(r)+","+m(g)+","+m(b)+")";
}

/* ---------- ホーム ---------- */
function renderHome(){
  const totalCredits = COURSES.reduce((a,c)=>a+c.credits,0);
  const totalPer = COURSES.reduce((a,c)=>a+weeklyPeriods(c),0);
  const nRemote = COURSES.filter(c=>c.classMode==="remote").length;
  let h = "";

  h += '<div class="sec"><div class="stats">'
    + stat(totalCredits, t("creditsAll"), LANG==="ja"?"単位":"cr.")
    + stat(COURSES.length, t("nCourses"), LANG==="ja"?"科目":"")
    + stat(totalPer, t("perWeek"), LANG==="ja"?"コマ":"", t("perWeekNote"))
    + stat(COURSES.length-nRemote, t("nF2F"), LANG==="ja"?"科目":"")
    + stat(nRemote, t("nRemote"), LANG==="ja"?"科目":"")
    + '</div></div>';

  /* 時間割 */
  h += '<div class="sec"><div class="sec-head"><h2>'+t("timetable")+'</h2><span>'+t("ttHint")+'</span></div>';
  h += '<div class="ttwrap"><div class="tt"><div></div>';
  DAYS.forEach(d=>{ h += '<div class="hd">'+d[LANG]+'</div>'; });

  const occ = {};
  COURSES.forEach(c=>c.slots.forEach(s=>{
    const span=s.span||1;
    occ[s.day+"-"+s.period] = {c:c, span:span, start:true};
    for(let k=1;k<span;k++) occ[s.day+"-"+(s.period+k)] = {covered:true};
  }));

  const rowOf = p => p<=2 ? p+1 : p+2;
  h += '<div class="lunch" style="grid-row:4">'+t("lunch")+'</div>';

  for(let p=1;p<=6;p++){
    h += '<div class="per" style="grid-column:1;grid-row:'+rowOf(p)+'"><b>'+p+'</b>'+PERIODS[p]+'</div>';
    for(let d=0;d<5;d++){
      const cell = occ[d+"-"+p], col = d+2, row = rowOf(p);
      if(cell && cell.covered) continue;
      if(cell && cell.start){
        const c = cell.c;
        h += '<button class="blk" type="button" style="--c:'+cc(c)+';grid-column:'+col+';grid-row:'+row+' / span '+cell.span+'" data-course="'+c.id+'">'
           + '<span class="nm">'+esc(L(c))+'</span>'
           + '<span class="mt">'+esc(L(c.teachers))+'</span>'
           + '<span class="cr">'+c.credits+(LANG==="ja"?"単位":" cr")+' '+modeBadge(mainMode(c),true)
           + (c.firstWeek>1 ? ' <span class="badge tagopt">'+t("eceShort")+'</span>' : '')
           + '</span></button>';
      } else {
        h += '<div class="empty" style="grid-column:'+col+';grid-row:'+row+'"></div>';
      }
    }
  }
  h += '</div></div></div>';

  /* 科目一覧 */
  h += '<div class="sec"><div class="sec-head"><h2>'+t("courses")+'</h2><span>'+(LANG==="ja"?"成績評価の割合・開講期間・欠席の目安":"grade weights, term and absence guide")+'</span></div>';
  h += '<div style="overflow-x:auto"><table class="grid"><thead><tr>'
     + '<th>'+t("colCourse")+'</th><th>'+t("colSlot")+'</th><th>'+t("colCredit")+'</th>'
     + '<th>'+t("colMode")+'</th><th>'+t("colTerm")+'</th><th>'+t("colEval")+'</th><th>'+t("colTotal")+'</th><th>'+t("colAbs")+'</th>'
     + '</tr></thead><tbody>';
  COURSES.forEach(c=>{
    h += '<tr>'
      + '<td><span class="swatch" style="background:'+cc(c)+'"></span>'
      +   '<button class="linkbtn" type="button" data-course="'+c.id+'">'+esc(L(c))+'</button>'
      +   '<div style="font-size:11.5px;color:var(--ink-3)">'+esc(L(c.teachers))+'</div></td>'
      + '<td>'+slotText(c)+'</td>'
      + '<td class="num">'+c.credits+'</td>'
      + '<td>'+courseModeLabel(c)+'</td>'
      + '<td style="white-space:nowrap;font-size:12.5px">'+termText(c)+'</td>'
      + '<td style="min-width:190px">'+evalBar(c)+'<div class="evlist">'
      +   c.evals.map(e=>L(e)+" "+e.pct+"%").join(LANG==="ja"?" ／ ":" / ")+'</div></td>'
      + '<td class="num">'+totalPeriods(c)+'</td>'
      + '<td class="num"><b>'+allowedAbsence(c)+'</b> '+t("absUnitP")+'<div style="font-size:11px;color:var(--ink-3)">≒ '+allowedWeeks(c)+' '+t("absUnitW")+'</div></td>'
      + '</tr>';
  });
  h += '</tbody></table></div></div>';

  /* 休講日 */
  h += '<div class="sec"><div class="sec-head"><h2>'+t("calTitle")+'</h2><span>'+t("calLead")+'</span></div>';
  h += '<div style="overflow-x:auto"><table class="grid"><tbody>';
  BREAKS.forEach(b=>{ h += '<tr><td style="white-space:nowrap;width:130px">'+fmtDate(b.d)+'</td><td>'+L(b)+'</td></tr>'; });
  h += '</tbody></table></div></div>';

  /* 欠席の目安 */
  h += '<div class="sec"><div class="sec-head"><h2>'+t("absTitle")+'</h2></div>'
     + '<div class="notice"><b>'+(LANG==="ja"?"目安であって規定ではありません":"A guide, not a rule")+'</b><br>'+t("absLead")+'</div>';
  h += '<div class="cards" style="margin-top:14px">';
  COURSES.forEach(c=>{
    h += '<div class="panel" style="padding:13px 15px;border-left:4px solid '+cc(c)+'">'
      + '<div style="font-family:var(--mincho);font-size:14px">'+esc(L(c))+'</div>'
      + '<div class="ratio">'+allowedAbsence(c)+' <small>/ '+totalPeriods(c)+' '+t("absUnitP")+'</small></div>'
      + '<div style="font-size:12px;color:var(--ink-2)">'
      + (LANG==="ja"
          ? (weeklyPeriods(c)>1 ? "週"+weeklyPeriods(c)+"コマなので、丸ごと休めるのは"+allowedWeeks(c)+"週まで" : "週1コマなので "+allowedWeeks(c)+"回まで")
          : (weeklyPeriods(c)>1 ? weeklyPeriods(c)+" periods a week, so at most "+allowedWeeks(c)+" full weeks" : "one period a week, so up to "+allowedWeeks(c)+" classes"))
      + '</div>'
      + (c.alert ? '<div style="margin-top:7px;font-size:12px;color:var(--vermilion)">'+esc(L(c.alert))+'</div>' : '')
      + '</div>';
  });
  h += '</div></div>';

  $("view-home").innerHTML = h;
}
function stat(n,label,unit,note){
  return '<div class="stat"><b>'+n+'<small>'+unit+'</small></b><span>'+label
       + (note?'<br><span style="font-size:11px">'+note+'</span>':'')+'</span></div>';
}
function evalBar(c){
  return '<div class="evbar">'+c.evals.map((e,i)=>
    '<i style="width:'+e.pct+'%;background:'+shade(cc(c),i)+'" title="'+esc(L(e))+' '+e.pct+'%"></i>').join("")+'</div>';
}

/* ---------- 週別 ---------- */
function renderWeek(){
  let h = '<div class="sec-head"><h2>'+fill(t("weekOf"),{n:WEEK})+'</h2><span>'
        + (LANG==="ja" ? "その週に各授業で扱う内容" : "what each class covers that week")+'</span></div>';

  h += '<div class="weekbar">'
     + '<button class="nav-w" type="button" id="w-prev"'+(WEEK===1?" disabled":"")+'>‹ '+t("prevW")+'</button>'
     + '<div class="weeknums">';
  for(let i=1;i<=15;i++) h += '<button type="button" data-week="'+i+'" aria-pressed="'+(i===WEEK)+'">'+i+'</button>';
  h += '</div><button class="nav-w" type="button" id="w-next"'+(WEEK===15?" disabled":"")+'>'+t("nextW")+' ›</button></div>';

  h += '<div class="panel">';
  DAYS.forEach((d,di)=>{
    const items = [];
    COURSES.forEach(c=>c.slots.forEach(s=>{
      if(s.day!==di) return;
      s.pick(WEEK).forEach(n=>items.push({c:c,s:s,n:n}));
    }));
    items.sort((a,b)=>a.s.period-b.s.period);

    h += '<div class="dayrow"><div class="daylab">'+d.s[LANG]
       + '<small>'+fmtDate(dateOf(di,WEEK))+'</small></div><div class="daycells">';

    if(di===0 && WEEK<8) h += '<div class="sidenote">'+t("eceNote")+'</div>';

    if(!items.length){
      h += '<div class="dayoff">'+t("noClass")+'</div>';
    } else {
      items.forEach(it=>{
        const c=it.c, sess=c.schedule[it.n-1];
        h += '<div class="wk" style="--c:'+cc(c)+'">'
          + '<div class="top"><span class="p">'+periodLabel(it.s.period,it.s.span||1)+' '+slotTime(it.s.period,it.s.span||1)+'</span>'
          + '<span class="nm">'+esc(L(c))+'</span>'
          + modeBadge(sess?sess.mode:"f2f",true)
          + '<span class="p">'+esc(L(c.teachers))+'</span></div>';
        if(sess){
          h += '<p class="topic"><span class="sn">'
             + fill(t(c.unit==="week"?"weekLabel":"session"),{n:c.unit==="week"?WEEK:it.n})+'</span>'+esc(L(sess))+'</p>';
        }
        h += '<p class="hw">'+esc(L(c.homework))+'</p></div>';
      });
    }
    h += '</div></div>';
  });
  h += '</div>';
  $("view-week").innerHTML = h;
}

/* ---------- 科目詳細 ---------- */
function renderCourse(){
  const c = byId(COURSE);
  let h = '<div class="picker">';
  COURSES.forEach(x=>{
    h += '<button type="button" style="--c:'+cc(x)+'" aria-pressed="'+(x.id===c.id)+'" data-course="'+x.id+'">'+esc(L(x))+'</button>';
  });
  h += '</div>';

  h += '<div class="chead" style="--c:'+cc(c)+'">'
    + '<h2>'+esc(L(c))+'</h2>'
    + '<p class="sub">'+esc(LANG==="ja"?c.en:c.ja)+(c.note?'　<span class="badge b-f2f">'+esc(L(c.note))+'</span>':'')+'</p>'
    + '<dl class="facts">'
    + fact(t("teacher"), esc(L(c.teachers)))
    + fact(t("credh"), c.credits+(LANG==="ja"?" 単位":" credits"))
    + fact(t("langh"), L(c.lang))
    + fact(t("colSlot"), slotText(c)+"　"+t("campus"))
    + fact(t("colMode"), courseModeLabel(c))
    + fact(t("sessh"), totalPeriods(c)+(LANG==="ja"?" コマ":" periods"))
    + fact(t("firstDay"), fmtDate(dateOf(c.slots[0].day, c.firstWeek)))
    + fact(t("lastDay"), fmtDate(dateOf(c.slots[c.slots.length-1].day, c.lastWeek)))
    + fact(t("codeh"), c.code)
    + fact(t("ttcodeh"), c.ttcode)
    + '</dl></div>';

  h += '<div class="cbody"><div>';
  h += '<div class="box"><h3>'+t("outline")+'</h3><p>'+esc(L(c.outline))+'</p></div>';
  h += '<div class="box"><h3>'+t("goals")+'</h3><ul class="goals">'
     + c.goals.map(g=>'<li>'+esc(L(g))+'</li>').join('')+'</ul></div>';

  h += '<div class="box"><h3>'+t("plan")+'</h3><table class="plan"><tbody>';
  c.schedule.forEach(s=>{
    const wk = c.unit==="week" ? s.n + (c.firstWeek-1) : Math.ceil(s.n/(c.perWeek||1));
    const day = c.unit==="week" || c.perWeek===1 ? c.slots[0].day
              : (s.n%2===1 ? c.slots[0].day : c.slots[1].day);
    h += '<tr'+(wk===WEEK?' class="now"':'')+'>'
      + '<td class="n">'+s.n+'</td>'
      + '<td>'+esc(L(s))+'<div style="font-size:11.5px;color:var(--ink-3)">'
      +   fill(t("weekLabel"),{n:wk})+' ・ '+fmtDate(dateOf(day,wk))+'</div></td>'
      + '<td class="m">'+modeBadge(s.mode,false)+'</td></tr>';
  });
  h += '</tbody></table></div>';
  h += '</div><div>';

  h += '<div class="box"><h3>'+t("evalh")+'</h3>';
  c.evals.forEach(e=>{
    h += '<div class="evrow"><span class="pct">'+e.pct+'%</span><span class="lab">'+esc(L(e))
       + (e.note?'<span class="note">'+esc(L(e.note))+'</span>':'')+'</span></div>';
  });
  if(c.alert) h += '<div class="notice" style="margin-top:12px"><b>'+t("watch")+'</b><br>'+esc(L(c.alert))+'</div>';
  h += '<div style="margin-top:12px;padding-top:10px;border-top:1px solid var(--rule-2);font-size:12.5px;color:var(--ink-2)">'
     + t("absTitle")+'：<b style="font-family:var(--mincho);font-size:16px">'+allowedAbsence(c)+'</b> '+t("absUnitP")
     + ' / '+totalPeriods(c)+'（≒ '+allowedWeeks(c)+' '+t("absUnitW")+'）</div></div>';

  h += '<div class="box"><h3>'+t("preph")+'</h3><p>'+esc(L(c.prep))+'</p><p style="font-size:13px;color:var(--ink-2)">'+esc(L(c.homework))+'</p></div>';

  h += '<div class="box"><h3>'+t("mats")+'</h3><table class="mat"><tbody>';
  h += matRows(t("textbook"), c.materials.text);
  h += matRows(t("reference"), c.materials.ref);
  if(c.materials.other) h += '<tr><td>'+t("other")+'</td><td>'+esc(L(c.materials.other))+'</td></tr>';
  h += '</tbody></table></div>';

  h += '<div class="box"><h3>'+t("reqh")+'</h3><p>'+esc(L(c.req))+'</p></div>';
  h += '<div class="box"><h3>'+t("fbh")+'</h3><p>'+esc(L(c.feedback))+'</p></div>';
  h += '</div></div>';
  $("view-course").innerHTML = h;
}
function fact(k,v){ return '<div class="fact"><dt>'+k+'</dt><dd>'+v+'</dd></div>'; }
function matRows(label,list){
  if(!list || !list.length) return '<tr><td>'+label+'</td><td style="color:var(--ink-3)">'+t("none")+'</td></tr>';
  return list.map((m,i)=>{
    const title = typeof m.t==="string" ? m.t : L(m.t);
    const meta = [m.a,m.p,m.i].filter(Boolean).join("　");
    return '<tr><td>'+(i===0?label:"")+'</td><td>'+esc(title)
      + (meta?'<div style="font-size:11.5px;color:var(--ink-3)">'+esc(meta)+(m.m?"　"+esc(L(m.m)):"")+'</div>':'')
      + '</td></tr>';
  }).join('');
}

/* ---------- 教材 ---------- */
function renderMats(){
  const rows = (kind) => {
    const out = [];
    COURSES.forEach(c=>{
      (c.materials[kind]||[]).forEach(m=>{
        if(typeof m.t !== "string") return;   /* 「授業内で配布」などは別枠 */
        out.push({c:c, m:m});
      });
    });
    return out;
  };
  const table = (list) => {
    let h = '<div style="overflow-x:auto"><table class="grid"><thead><tr>'
      + '<th>'+t("colCourse")+'</th><th>'+t("colBook")+'</th><th>'+t("colAuthor")+'</th>'
      + '<th>'+t("colPub")+'</th><th>'+t("colIsbn")+'</th><th>'+t("colForm")+'</th></tr></thead><tbody>';
    list.forEach(r=>{
      h += '<tr>'
        + '<td style="white-space:nowrap"><span class="swatch" style="background:'+cc(r.c)+'"></span>'
        +   '<button class="linkbtn" type="button" data-course="'+r.c.id+'">'+esc(L(r.c))+'</button></td>'
        + '<td class="bookttl">'+esc(r.m.t)+'</td>'
        + '<td style="font-size:12.5px">'+esc(r.m.a||"")+'</td>'
        + '<td style="font-size:12.5px;white-space:nowrap">'+esc(r.m.p||"")+'</td>'
        + '<td class="isbn">'+esc(r.m.i||"")+'</td>'
        + '<td style="font-size:12.5px;white-space:nowrap">'+(r.m.m?esc(L(r.m.m)):'<span style="color:var(--ink-3)">'+t("paper")+'</span>')+'</td>'
        + '</tr>';
    });
    return h+'</tbody></table></div>';
  };

  let h = '';
  const buy = rows("text"), opt = rows("ref");

  h += '<div class="sec"><div class="sec-head"><h2>'+t("matsBuy")+'</h2>'
     + '<span class="badge tagbuy">'+buy.length+(LANG==="ja"?"点":" items")+'</span>'
     + '<span>'+t("matsBuyLead")+'</span></div>'+table(buy)+'</div>';

  h += '<div class="sec"><div class="sec-head"><h2>'+t("matsOpt")+'</h2>'
     + '<span class="badge tagopt">'+opt.length+(LANG==="ja"?"点":" items")+'</span>'
     + '<span>'+t("matsOptLead")+'</span></div>'+table(opt)+'</div>';

  /* 指定なし・配布のみ */
  const nothing = COURSES.filter(c=>!(c.materials.text||[]).some(m=>typeof m.t==="string"));
  h += '<div class="sec"><div class="sec-head"><h2>'+t("matsNone")+'</h2></div>'
     + '<div style="overflow-x:auto"><table class="grid"><tbody>';
  nothing.forEach(c=>{
    let note;
    if(c.materials.other) note = L(c.materials.other);
    else if((c.materials.ref||[]).some(m=>typeof m.t==="string"))
      note = LANG==="ja" ? "教科書の指定なし。参考書のみ（上の表を参照）" : "No textbook required; references only (see the table above)";
    else {
      const free = (c.materials.ref||[]).filter(m=>typeof m.t!=="string").map(m=>L(m.t)).join(" / ");
      note = free || (LANG==="ja"?"シラバスに教材の記載なし":"No materials listed in the syllabus");
    }
    h += '<tr><td style="white-space:nowrap;width:220px"><span class="swatch" style="background:'+cc(c)+'"></span>'
      + '<button class="linkbtn" type="button" data-course="'+c.id+'">'+esc(L(c))+'</button></td>'
      + '<td style="font-size:13px">'+esc(note)+'</td></tr>';
  });
  h += '</tbody></table></div></div>';

  h += '<div class="sec"><div class="sec-head"><h2>'+t("matsNoteH")+'</h2></div>'
     + '<div class="box"><ul class="goals">'
     + MAT_NOTES.map(n=>'<li>'+esc(L(n))+'</li>').join('')
     + '</ul></div></div>';

  $("view-mats").innerHTML = h;
}

/* ---------- 操作 ---------- */
function setLang(l){
  LANG = l;
  document.documentElement.lang = l;
  store.set("lang", l);
  $("btn-ja").setAttribute("aria-pressed", l==="ja");
  $("btn-en").setAttribute("aria-pressed", l==="en");
  applyTheme();
  renderAll();
}
function setView(v){
  VIEW = v;
  ["home","week","course","mats"].forEach(k=>{
    $("view-"+k).hidden = (k!==v);
    $("tab-"+k).setAttribute("aria-selected", k===v);
  });
  window.scrollTo(0,0);
}
function setWeek(n){
  WEEK = Math.min(15,Math.max(1,n));
  renderWeek();
  if(VIEW==="course") renderCourse();
}
function openCourse(id){ COURSE = id; renderCourse(); setView("course"); }

function renderAll(){
  $("ttl").textContent = t("title");
  $("sub").textContent = t("sub");
  $("tab-home").textContent   = t("tabHome");
  $("tab-week").textContent   = t("tabWeek");
  $("tab-course").textContent = t("tabCourse");
  $("tab-mats").textContent   = t("tabMats");
  $("foot").textContent = t("foot");
  renderHome(); renderWeek(); renderCourse(); renderMats();
}

/* イベント委譲：再描画してもハンドラを付け直さなくていい */
document.addEventListener("click", e=>{
  const cb = e.target.closest("[data-course]");
  if(cb){ openCourse(cb.dataset.course); return; }
  const wb = e.target.closest("[data-week]");
  if(wb){ setWeek(Number(wb.dataset.week)); return; }
  if(e.target.closest("#w-prev")) return setWeek(WEEK-1);
  if(e.target.closest("#w-next")) return setWeek(WEEK+1);
});
$("tab-home").addEventListener("click", ()=>setView("home"));
$("tab-week").addEventListener("click", ()=>setView("week"));
$("tab-course").addEventListener("click", ()=>setView("course"));
$("tab-mats").addEventListener("click", ()=>setView("mats"));
$("btn-ja").addEventListener("click", ()=>setLang("ja"));
$("btn-en").addEventListener("click", ()=>setLang("en"));
$("theme-btn").addEventListener("click", cycleTheme);
document.addEventListener("keydown", e=>{
  if(VIEW!=="week") return;
  if(e.key==="ArrowLeft") setWeek(WEEK-1);
  if(e.key==="ArrowRight") setWeek(WEEK+1);
});

/* ---------- 起動 ---------- */
(function init(){
  const savedTheme = store.get("theme");
  if(savedTheme) THEME = savedTheme;
  const savedLang = store.get("lang");
  if(savedLang) LANG = savedLang;
  document.documentElement.lang = LANG;
  $("btn-ja").setAttribute("aria-pressed", LANG==="ja");
  $("btn-en").setAttribute("aria-pressed", LANG==="en");
  applyTheme();
  renderAll();
})();
