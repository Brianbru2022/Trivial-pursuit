"use client";

import {useMemo,useRef,useState} from "react";
import Dice3D,{DiceResultIcon} from "./Dice3D";
import {categories,questions,type Question} from "./gameData";
import {componentOrder,componentRecipes,reachableSites,victorianSites,type ComponentKey,type ResourceKey} from "./victorianGame";
import styles from "./VictorianBoardV4.module.css";

type Player={name:string;site:number;resources:Record<ResourceKey,number>;components:ComponentKey[];rerolls:number};
type Props={names:[string,string];onExit:()=>void};
type Challenge={kind:"location"|"build";question:Question;siteId?:number;component?:ComponentKey;round:number;correct:number};
type Crop={x:number;y:number;w:number;h:number;sourceW:number;sourceH:number};

const STATION="/themes/victorian/production/station-sheet.png";
const RESOURCE="/themes/victorian/production/resource-sheet.png";
const LOCO="/themes/victorian/production/locomotive-sheet.png";
const empty=():Record<ResourceKey,number>=>({coal:0,iron:0,knowledge:0,capital:0});

const stationCrops:Record<string,Crop>={
 WORKSHOP:{x:0,y:0,w:483,h:405,sourceW:1448,sourceH:1086},UNIVERSITY:{x:483,y:0,w:483,h:405,sourceW:1448,sourceH:1086},WORKS:{x:966,y:0,w:482,h:405,sourceW:1448,sourceH:1086},EXHIBITION:{x:0,y:405,w:362,h:400,sourceW:1448,sourceH:1086},DOCKS:{x:362,y:405,w:362,h:400,sourceW:1448,sourceH:1086},"GRAND WORKS":{x:724,y:405,w:362,h:400,sourceW:1448,sourceH:1086},JUNCTION:{x:1086,y:405,w:362,h:400,sourceW:1448,sourceH:1086},
};
const resourceCrops:Record<string,Crop>={coal:{x:0,y:0,w:290,h:270,sourceW:1448,sourceH:1086},iron:{x:290,y:0,w:290,h:270,sourceW:1448,sourceH:1086},knowledge:{x:580,y:0,w:290,h:270,sourceW:1448,sourceH:1086},capital:{x:870,y:0,w:290,h:270,sourceW:1448,sourceH:1086},reroll:{x:0,y:485,w:290,h:235,sourceW:1448,sourceH:1086}};
const componentCrops:Record<ComponentKey,Crop>={boiler:{x:0,y:185,w:395,h:235,sourceW:1672,sourceH:941},wheels:{x:390,y:185,w:295,h:235,sourceW:1672,sourceH:941},pistons:{x:675,y:185,w:285,h:235,sourceW:1672,sourceH:941},firebox:{x:955,y:185,w:230,h:235,sourceW:1672,sourceH:941},cab:{x:1160,y:185,w:235,h:235,sourceW:1672,sourceH:941},tender:{x:1375,y:185,w:297,h:235,sourceW:1672,sourceH:941}};
const finished:Crop={x:180,y:630,w:1330,h:311,sourceW:1672,sourceH:941};

const events=[
 {title:"Railway Mania",text:"Investors rush into the railway boom. Gain 2 Capital.",apply:(p:Player)=>p.resources.capital+=2},
 {title:"Industrial Breakthrough",text:"A new process earns 1 Knowledge and 1 Iron.",apply:(p:Player)=>{p.resources.knowledge++;p.resources.iron++}},
 {title:"Government Contract",text:"A government order provides 1 Capital and 1 Coal.",apply:(p:Player)=>{p.resources.capital++;p.resources.coal++}},
 {title:"Express Service",text:"Your connections earn a reroll token.",apply:(p:Player)=>p.rerolls++},
];

function Sprite({src,crop,width,className=""}:{src:string;crop:Crop;width:number;className?:string}){
 const scale=width/crop.w;
 return <span className={`${styles.sprite} ${className}`} style={{width,height:crop.h*scale}} aria-hidden="true"><img src={src} alt="" draggable={false} style={{width:crop.sourceW*scale,height:crop.sourceH*scale,left:-crop.x*scale,top:-crop.y*scale}}/></span>;
}
function normalise(s:string){return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]/g,"")}
function Glyph({kind}:{kind:string}){const map:Record<string,string>={coal:"◆",iron:"▰",university:"◇",engineering:"⚒",start:"⚒",port:"⚓",event:"!",railway:"↔"};return <span>{map[kind]??"•"}</span>}

export default function VictorianBoardV4({names,onExit}:Props){
 const [players,setPlayers]=useState<Player[]>([{name:names[0]||"Player 1",site:0,resources:empty(),components:[],rerolls:0},{name:names[1]||"Player 2",site:0,resources:empty(),components:[],rerolls:0}]);
 const [active,setActive]=useState(0),[roll,setRoll]=useState<number|null>(null),[targets,setTargets]=useState<number[]>([]),[challenge,setChallenge]=useState<Challenge|null>(null),[answer,setAnswer]=useState(""),[reveal,setReveal]=useState<boolean|null>(null),[message,setMessage]=useState("Roll the die, then move exactly that many spaces clockwise or anticlockwise."),[event,setEvent]=useState<{title:string;text:string}|null>(null),[winner,setWinner]=useState<string|null>(null),[listening,setListening]=useState(false),[engineeringView,setEngineeringView]=useState(false);
 const recognitionRef=useRef<any>(null);
 const player=players[active],other=players[(active+1)%2];
 const ready=player.components.length===componentOrder.length;
 const atWorks=victorianSites[player.site].kind==="engineering";
 const canBuild=useMemo(()=>componentOrder.filter(k=>!player.components.includes(k)&&Object.entries(componentRecipes[k].cost).every(([r,a])=>player.resources[r as ResourceKey]>=(a??0))),[player]);
 const randomQuestion=()=>questions[Math.floor(Math.random()*questions.length)];
 function speak(q:Question){if(typeof window==="undefined"||!("speechSynthesis" in window))return;window.speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(`${player.name}. ${categories[q.category].name}. ${q.question}`);u.lang="en-GB";u.rate=.93;window.speechSynthesis.speak(u)}
 function open(c:Challenge){setChallenge(c);setAnswer("");setReveal(null);setTimeout(()=>speak(c.question),220)}
 function listen(){if(typeof window==="undefined")return;const R=(window as any).SpeechRecognition||(window as any).webkitSpeechRecognition;if(!R){setMessage("Speech recognition isn't available here; type your answer instead.");return}const r=new R();r.lang="en-GB";r.interimResults=true;r.maxAlternatives=5;r.onstart=()=>setListening(true);r.onend=()=>{setListening(false);recognitionRef.current=null};r.onresult=(e:any)=>setAnswer(e.results[e.results.length-1][0]?.transcript??"");recognitionRef.current=r;r.start()}
 function finishRoll(v:number){setRoll(v);setTargets(reachableSites(player.site,v));setMessage(`Rolled ${v}. Choose exactly ${v} spaces clockwise or anticlockwise.`)}
 function moveTo(id:number){if(!targets.includes(id))return;const site=victorianSites[id],next=players.map(p=>({...p,resources:{...p.resources},components:[...p.components]}));next[active].site=id;setPlayers(next);setTargets([]);if(site.kind==="exhibition"){if(ready)setWinner(player.name);else setMessage("Complete your locomotive before entering Crystal Palace.");return}if(site.kind==="engineering"){setEngineeringView(true);setMessage("Engineering Works reached. Choose a component you can afford to build.");return}if(site.kind==="event"){const c=events[Math.floor(Math.random()*events.length)];c.apply(next[active]);setPlayers(next);setEvent({title:c.title,text:c.text});setMessage(c.text);return}open({kind:"location",question:randomQuestion(),siteId:id,round:1,correct:0})}
 function beginBuild(k:ComponentKey){if(!atWorks||!canBuild.includes(k))return;const r=componentRecipes[k];setEngineeringView(true);setMessage(`${r.name}: pass ${r.needed} of ${r.questions} construction questions.`);open({kind:"build",question:randomQuestion(),component:k,round:1,correct:0})}
 function judge(){if(!challenge)return;const c=normalise(answer),a=[challenge.question.answer,...(challenge.question.alternatives??[])].map(normalise);setReveal(a.some(x=>c===x||(c&&c.includes(x))||(c&&x.includes(c))))}
 function continueChallenge(){if(!challenge||reveal===null)return;const correct=challenge.correct+(reveal?1:0);if(challenge.kind==="location"){const site=victorianSites[challenge.siteId!];if(reveal&&site.reward){const next=players.map(p=>({...p,resources:{...p.resources},components:[...p.components]}));Object.entries(site.reward).forEach(([r,a])=>next[active].resources[r as ResourceKey]+=a??0);setPlayers(next);setMessage(`Correct — ${site.name} pays its reward.`)}else setMessage("Incorrect — no reward from this stop.");setChallenge(null);setReveal(null);setAnswer("");return}const k=challenge.component!,r=componentRecipes[k];if(challenge.round<r.questions){const q=randomQuestion();setChallenge({...challenge,question:q,round:challenge.round+1,correct});setReveal(null);setAnswer("");setTimeout(()=>speak(q),200);return}if(correct>=r.needed){const next=players.map(p=>({...p,resources:{...p.resources},components:[...p.components]}));Object.entries(r.cost).forEach(([res,a])=>next[active].resources[res as ResourceKey]-=a??0);next[active].components.push(k);setPlayers(next);setMessage(`${r.name} completed and fitted.`)}else setMessage(`${r.name} construction failed. Resources retained.`);setChallenge(null);setReveal(null);setAnswer("")}
 function pass(){const n=(active+1)%2;setActive(n);setRoll(null);setTargets([]);setChallenge(null);setEvent(null);setEngineeringView(false);setAnswer("");setReveal(null);setMessage(`${players[n].name}'s turn — roll the die.`)}
 return <main className={styles.page}>
  <header className={styles.header}><EngineCard player={player} active/><div className={styles.title}><small>1851</small><h1>THE GREAT EXHIBITION</h1></div><div className={styles.rightHeader}><EngineCard player={other}/><button onClick={onExit}>EXIT</button></div></header>
  {roll!==null&&<DiceResultIcon value={roll}/>} 
  <section className={styles.board}><img src="/themes/victorian/board-art.webp?v=3" className={styles.art} alt=""/><svg className={styles.track} viewBox="0 0 100 100" preserveAspectRatio="none">{victorianSites.flatMap(s=>s.links.filter(id=>id>s.id).map(id=>{const o=victorianSites[id];return <g key={`${s.id}-${id}`}><line className={styles.trackShadow} x1={s.x} y1={s.y} x2={o.x} y2={o.y}/><line className={styles.rail} x1={s.x} y1={s.y} x2={o.x} y2={o.y}/><line className={styles.sleepers} x1={s.x} y1={s.y} x2={o.x} y2={o.y}/></g>}))}</svg>
  {victorianSites.map(s=>{const crop=s.major?stationCrops[s.shortName]:undefined;return <button key={s.id} className={`${styles.station} ${crop?styles.major:""} ${s.kind==="event"?styles.event:""} ${targets.includes(s.id)?styles.target:""}`} style={{left:`${s.x}%`,top:`${s.y}%`}} disabled={!targets.includes(s.id)} onClick={()=>moveTo(s.id)}>{crop?<Sprite src={STATION} crop={crop} width={s.kind==="exhibition"?86:70}/>:<span className={styles.roundel}><Glyph kind={s.kind}/></span>}</button>})}
  {players.map((p,i)=>{const s=victorianSites[p.site];return <div key={i} className={`${styles.pawn} ${i?styles.pawn2:""}`} style={{left:`calc(${s.x}% + ${i?16:-16}px)`,top:`calc(${s.y}% + ${i?12:-12}px)`}}>{i+1}</div>})}
  {roll===null&&!winner&&<Dice3D onResult={finishRoll}/>}</section>
  <section className={styles.bottom}><Resources player={player}/><section className={styles.workshop}><div className={styles.workshopTitle}><span>LOCOMOTIVE WORKS</span><b>{player.components.length}/6 BUILT</b></div>{engineeringView||atWorks?<Engineering player={player} canBuild={canBuild} onBuild={beginBuild}/>:<BuildStrip player={player}/>}</section><aside className={styles.objective}><small>CURRENT OBJECTIVE</small><p>{message}</p>{roll!==null&&!challenge&&!winner&&<button onClick={pass}>PASS TO {other.name.toUpperCase()}</button>}</aside></section>
  {event&&<Modal><small>VICTORIAN EVENT</small><h2>{event.title}</h2><p>{event.text}</p><button onClick={()=>setEvent(null)}>CONTINUE</button></Modal>}
  {challenge&&<Modal wide><small>{challenge.kind==="build"?`ENGINEERING CHALLENGE • ${componentRecipes[challenge.component!].name}`:`${victorianSites[challenge.siteId!].shortName} • RESOURCE QUESTION`}</small><div className={styles.category}>{categories[challenge.question.category].name}{challenge.kind==="build"?` • ${challenge.round}/${componentRecipes[challenge.component!].questions}`:""}</div><h2>{challenge.question.question}</h2>{reveal===null?<><div className={styles.answer}><input value={answer} onChange={e=>setAnswer(e.target.value)} placeholder="Say it or type it…"/><button onClick={listen}>{listening?"LISTENING…":"SPEAK"}</button></div><div className={styles.modalActions}><button onClick={()=>speak(challenge.question)}>HEAR AGAIN</button><button onClick={judge}>LOCK ANSWER</button></div></>:<><div className={reveal?styles.correct:styles.wrong}>{reveal?"✓ CORRECT":"× NOT QUITE"}</div><p>The answer is <b>{challenge.question.answer}</b>.</p><button onClick={continueChallenge}>CONTINUE</button></>}</Modal>}
  {winner&&<Modal><small>THE GREAT EXHIBITION • 1851</small><h2>{winner} wins!</h2><p>Your completed locomotive arrives at Crystal Palace.</p><button onClick={onExit}>RETURN TO WORLDS</button></Modal>}
 </main>
}

function EngineCard({player,active=false}:{player:Player;active?:boolean}){return <div className={`${styles.engineCard} ${active?styles.engineCardActive:""}`}><div className={styles.engineInfo}><small>{active?"YOUR TURN":"WAITING"}</small><b>{player.name}</b><span>{player.components.length}/6 BUILT</span></div><Sprite src={LOCO} crop={finished} width={112} className={player.components.length===6?styles.miniComplete:styles.miniGhost}/><div className={styles.pips}>{componentOrder.map(k=><i key={k} className={player.components.includes(k)?styles.pipBuilt:""}/>)}</div></div>}
function Resources({player}:{player:Player}){return <aside className={styles.resources}><small>RESOURCES</small><R art="coal" label="Coal" value={player.resources.coal}/><R art="iron" label="Iron" value={player.resources.iron}/><R art="knowledge" label="Knowledge" value={player.resources.knowledge}/><R art="capital" label="Capital" value={player.resources.capital}/><R art="reroll" label="Rerolls" value={player.rerolls}/></aside>}
function R({art,label,value}:{art:string;label:string;value:number}){return <div className={styles.resource}><Sprite src={RESOURCE} crop={resourceCrops[art]} width={34}/><span>{label}</span><b>{value}</b></div>}
function BuildStrip({player}:{player:Player}){return <div className={styles.buildStrip}><div className={styles.miniBay}><Sprite src={LOCO} crop={finished} width={300} className={styles.bayGhost}/><p>{player.components.length?`${player.components.length} components fitted. Reach an Engineering Works to continue.`:"Gather resources, then reach an Engineering Works to begin your locomotive."}</p></div><Parts player={player}/></div>}
function Engineering({player,canBuild,onBuild}:{player:Player;canBuild:ComponentKey[];onBuild:(k:ComponentKey)=>void}){return <div className={styles.engineering}><div className={styles.bigEngine}><Sprite src={LOCO} crop={finished} width={480} className={styles.bigGhost}/>{player.components.length>0&&<div className={styles.progressLabel}>{player.components.length} / 6 COMPONENTS FITTED</div>}</div><Parts player={player} canBuild={canBuild} onBuild={onBuild}/></div>}
function Parts({player,canBuild=[],onBuild}:{player:Player;canBuild?:ComponentKey[];onBuild?:(k:ComponentKey)=>void}){return <div className={styles.parts}>{componentOrder.map(k=>{const r=componentRecipes[k],built=player.components.includes(k),available=canBuild.includes(k);return <button key={k} disabled={!available||built} className={`${styles.part} ${built?styles.built:""} ${available?styles.available:""}`} onClick={()=>onBuild?.(k)}><Sprite src={LOCO} crop={componentCrops[k]} width={54}/><b>{r.name}</b><span>{built?"✓ BUILT":Object.entries(r.cost).map(([x,a])=>`${a} ${x}`).join(" • ")}</span></button>})}</div>}
function Modal({children,wide=false}:{children:React.ReactNode;wide?:boolean}){return <div className={styles.overlay}><article className={wide?styles.wide:""}>{children}</article></div>}
