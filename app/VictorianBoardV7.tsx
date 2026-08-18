"use client";

import {useMemo,useState} from "react";
import Dice3D,{DiceResultIcon} from "./Dice3D";
import {categories,questions,type Question} from "./gameData";
import {componentOrder,componentRecipes,type ComponentKey,type ResourceKey} from "./victorianGame";
import styles from "./VictorianBoardV7.module.css";

type Player={name:string;space:string;resources:Record<ResourceKey,number>;components:ComponentKey[]};
type Props={names:[string,string];onExit:()=>void};
type Challenge={kind:"space"|"build"|"finish";question:Question;spaceId?:string;component?:ComponentKey;round:number;correct:number};
type SpaceType="start"|"coal"|"iron"|"knowledge"|"capital"|"works"|"grandworks"|"event"|"junction"|"finish";
type Space={id:string;label:string;type:SpaceType;x:number;y:number;neighbours:string[]};
type Crop={x:number;y:number;w:number;h:number;sourceW:number;sourceH:number};

const RESOURCE="/themes/victorian/production/resource-sheet.png";
const LOCO="/themes/victorian/production/locomotive-sheet.png";
const STATION="/themes/victorian/production/station-sheet.png";
const empty=():Record<ResourceKey,number>=>({coal:0,iron:0,knowledge:0,capital:0});
const resourceCrops:Record<string,Crop>={coal:{x:0,y:0,w:290,h:270,sourceW:1448,sourceH:1086},iron:{x:290,y:0,w:290,h:270,sourceW:1448,sourceH:1086},knowledge:{x:580,y:0,w:290,h:270,sourceW:1448,sourceH:1086},capital:{x:870,y:0,w:290,h:270,sourceW:1448,sourceH:1086}};
const stationCrops:Record<string,Crop>={start:{x:0,y:0,w:483,h:405,sourceW:1448,sourceH:1086},works:{x:966,y:0,w:482,h:405,sourceW:1448,sourceH:1086},grandworks:{x:724,y:405,w:362,h:400,sourceW:1448,sourceH:1086},finish:{x:0,y:405,w:362,h:400,sourceW:1448,sourceH:1086},junction:{x:1086,y:405,w:362,h:400,sourceW:1448,sourceH:1086}};
const componentCrops:Record<ComponentKey,Crop>={boiler:{x:0,y:185,w:395,h:235,sourceW:1672,sourceH:941},wheels:{x:390,y:185,w:295,h:235,sourceW:1672,sourceH:941},pistons:{x:675,y:185,w:285,h:235,sourceW:1672,sourceH:941},firebox:{x:955,y:185,w:230,h:235,sourceW:1672,sourceH:941},cab:{x:1160,y:185,w:235,h:235,sourceW:1672,sourceH:941},tender:{x:1375,y:185,w:297,h:235,sourceW:1672,sourceH:941}};
const finished:Crop={x:180,y:630,w:1330,h:311,sourceW:1672,sourceH:941};

const spaces:Space[]=[
 {id:"s0",label:"Workshop",type:"start",x:12,y:50,neighbours:["s1","s13"]},
 {id:"s1",label:"Coal",type:"coal",x:18,y:34,neighbours:["s0","s2"]},
 {id:"s2",label:"Knowledge",type:"knowledge",x:31,y:23,neighbours:["s1","s3","s5"]},
 {id:"s3",label:"Works",type:"works",x:45,y:20,neighbours:["s2","s4"]},
 {id:"s4",label:"Iron",type:"iron",x:56,y:38,neighbours:["s3","s5"]},
 {id:"s5",label:"Capital",type:"capital",x:73,y:27,neighbours:["s4","s6","s2"]},
 {id:"s6",label:"Event",type:"event",x:83,y:41,neighbours:["s5","s7"]},
 {id:"s7",label:"Junction East",type:"junction",x:82,y:58,neighbours:["s6","s8","finish"]},
 {id:"s8",label:"Iron",type:"iron",x:69,y:68,neighbours:["s7","s9","s11"]},
 {id:"s9",label:"Grand Works",type:"grandworks",x:53,y:73,neighbours:["s8","s10"]},
 {id:"s10",label:"Coal",type:"coal",x:39,y:56,neighbours:["s9","s11"]},
 {id:"s11",label:"Knowledge",type:"knowledge",x:24,y:68,neighbours:["s10","s12","s8"]},
 {id:"s12",label:"Junction West",type:"junction",x:15,y:58,neighbours:["s11","s13"]},
 {id:"s13",label:"Capital",type:"capital",x:24,y:48,neighbours:["s12","s0"]},
 {id:"finish",label:"Crystal Palace",type:"finish",x:93,y:58,neighbours:["s7"]},
];
const byId=Object.fromEntries(spaces.map(s=>[s.id,s])) as Record<string,Space>;
const mainIds=["s0","s1","s2","s3","s4","s5","s6","s7","s8","s9","s10","s11","s12","s13","s0"];

function Sprite({src,crop,width,className=""}:{src:string;crop:Crop;width:number;className?:string}){const scale=width/crop.w;return <span className={`${styles.sprite} ${className}`} style={{width,height:crop.h*scale}}><img src={src} alt="" draggable={false} style={{width:crop.sourceW*scale,height:crop.sourceH*scale,left:-crop.x*scale,top:-crop.y*scale}}/></span>}
function normalise(s:string){return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]/g,"")}
function reachableExactly(start:string,steps:number){let frontier=new Set([start]);for(let i=0;i<steps;i++){const next=new Set<string>();frontier.forEach(id=>byId[id].neighbours.forEach(n=>{if(n!=="finish")next.add(n)}));frontier=next}return [...frontier].filter(id=>id!==start)}
function railPath(ids:string[]){return ids.map((id,i)=>`${i?"L":"M"} ${byId[id].x} ${byId[id].y}`).join(" ")}

function TrainPiece({blue=false}:{blue?:boolean}){return <div className={`${styles.trainPiece} ${blue?styles.blueTrain:styles.redTrain}`}><span className={styles.stack}/><span className={styles.boiler}/><span className={styles.cab}/><i/><i/><i/></div>}

export default function VictorianBoardV7({names,onExit}:Props){
 const [players,setPlayers]=useState<Player[]>([{name:names[0]||"Player 1",space:"s0",resources:empty(),components:[]},{name:names[1]||"Player 2",space:"s0",resources:empty(),components:[]}]);
 const [active,setActive]=useState(0),[roll,setRoll]=useState<number|null>(null),[targets,setTargets]=useState<string[]>([]),[challenge,setChallenge]=useState<Challenge|null>(null),[answer,setAnswer]=useState(""),[reveal,setReveal]=useState<boolean|null>(null),[message,setMessage]=useState("Roll the die."),[winner,setWinner]=useState<string|null>(null),[event,setEvent]=useState<string|null>(null),[engineering,setEngineering]=useState(false),[listening,setListening]=useState(false);
 const player=players[active],other=players[(active+1)%2],ready=player.components.length===6;
 const canBuild=useMemo(()=>componentOrder.filter(k=>!player.components.includes(k)&&Object.entries(componentRecipes[k].cost).every(([r,a])=>player.resources[r as ResourceKey]>=(a??0))),[player]);
 const randomQuestion=()=>questions[Math.floor(Math.random()*questions.length)];
 function speak(q:Question){if(typeof window==="undefined"||!("speechSynthesis" in window))return;window.speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(`${categories[q.category].name}. ${q.question}`);u.lang="en-GB";u.rate=.94;window.speechSynthesis.speak(u)}
 function open(c:Challenge){setChallenge(c);setAnswer("");setReveal(null);setTimeout(()=>speak(c.question),180)}
 function finishRoll(v:number){setRoll(v);setTargets(reachableExactly(player.space,v));setMessage(`Rolled ${v}. Choose a highlighted destination exactly ${v} track sections away.`)}
 function moveTo(id:string){if(!targets.includes(id))return;const next=players.map(p=>({...p,resources:{...p.resources},components:[...p.components]}));next[active].space=id;setPlayers(next);setTargets([]);const s=byId[id];if(s.type==="works"||s.type==="grandworks"){setEngineering(true);setMessage("Engineering Works: build a component or pass your turn.");return}if(s.type==="event"){next[active].resources.capital++;next[active].resources.coal++;setPlayers(next);setEvent("Railway boom: gain 1 Capital and 1 Coal.");setMessage("Event resolved. Pass when ready.");return}if(s.type==="junction"){setMessage("Junction reached. Your next roll may use the main line or a bypass.");return}if(["coal","iron","knowledge","capital"].includes(s.type)){open({kind:"space",spaceId:id,question:randomQuestion(),round:1,correct:0});return}setMessage("Pass when ready.")}
 function beginBuild(k:ComponentKey){if(!canBuild.includes(k))return;const r=componentRecipes[k];open({kind:"build",component:k,question:randomQuestion(),round:1,correct:0});setMessage(`${r.name}: pass ${r.needed} of ${r.questions} questions.`)}
 function attemptFinish(){if(ready&&player.space==="s7")open({kind:"finish",question:randomQuestion(),round:1,correct:0})}
 function judge(){if(!challenge)return;const c=normalise(answer),a=[challenge.question.answer,...(challenge.question.alternatives??[])].map(normalise);setReveal(a.some(x=>c===x||(c&&c.includes(x))||(c&&x.includes(c))))}
 function continueChallenge(){if(!challenge||reveal===null)return;const correct=challenge.correct+(reveal?1:0);if(challenge.kind==="space"){const s=byId[challenge.spaceId!];if(reveal){const next=players.map(p=>({...p,resources:{...p.resources},components:[...p.components]}));next[active].resources[s.type as ResourceKey]+=2;setPlayers(next);setMessage(`Correct — gain 2 ${s.label}.`)}else setMessage("Incorrect — no resource gained.");setChallenge(null);setReveal(null);setAnswer("");return}if(challenge.kind==="finish"){if(reveal)setWinner(player.name);else setMessage("Final question missed. Try again from Junction East on a later turn.");setChallenge(null);setReveal(null);setAnswer("");return}const k=challenge.component!,r=componentRecipes[k];if(challenge.round<r.questions){const q=randomQuestion();setChallenge({...challenge,question:q,round:challenge.round+1,correct});setReveal(null);setAnswer("");setTimeout(()=>speak(q),170);return}if(correct>=r.needed){const next=players.map(p=>({...p,resources:{...p.resources},components:[...p.components]}));Object.entries(r.cost).forEach(([res,a])=>next[active].resources[res as ResourceKey]-=a??0);next[active].components.push(k);setPlayers(next);setMessage(`${r.name} fitted.`)}else setMessage(`${r.name} build failed. Resources retained.`);setChallenge(null);setReveal(null);setAnswer("")}
 function listen(){if(typeof window==="undefined")return;const R=(window as any).SpeechRecognition||(window as any).webkitSpeechRecognition;if(!R)return;const r=new R();r.lang="en-GB";r.interimResults=true;r.onstart=()=>setListening(true);r.onend=()=>setListening(false);r.onresult=(e:any)=>setAnswer(e.results[e.results.length-1][0]?.transcript??"");r.start()}
 function pass(){const n=(active+1)%2;setActive(n);setRoll(null);setTargets([]);setChallenge(null);setEngineering(false);setEvent(null);setReveal(null);setAnswer("");setMessage(`${players[n].name}'s turn — roll the die.`)}
 return <main className={styles.page}>
  <header className={styles.header}><PlayerCard player={player} active blue={active===1}/><div className={styles.title}><small>1851</small><h1>THE GREAT EXHIBITION</h1></div><div className={styles.headerRight}><PlayerCard player={other} blue={active===0}/><button onClick={onExit}>EXIT</button></div></header>
  {roll!==null&&<DiceResultIcon value={roll}/>} 
  <section className={styles.board}><img src="/themes/victorian/board-art.webp?v=3" className={styles.art} alt=""/>
   <svg className={styles.track} viewBox="0 0 100 100" preserveAspectRatio="none">
    <path className={styles.trackBed} d={railPath(mainIds)}/><path className={styles.railA} d={railPath(mainIds)}/><path className={styles.railB} d={railPath(mainIds)}/><path className={styles.sleepers} d={railPath(mainIds)}/>
    <path className={styles.bypassBed} d="M 31 23 Q 52 8 73 27"/><path className={styles.bypassRail} d="M 31 23 Q 52 8 73 27"/><path className={styles.bypassSleepers} d="M 31 23 Q 52 8 73 27"/>
    <path className={styles.bypassBed} d="M 24 68 Q 47 86 69 68"/><path className={styles.bypassRail} d="M 24 68 Q 47 86 69 68"/><path className={styles.bypassSleepers} d="M 24 68 Q 47 86 69 68"/>
    <path className={styles.finishBed} d="M 82 58 Q 88 57 93 58"/><path className={styles.finishRail} d="M 82 58 Q 88 57 93 58"/><path className={styles.finishSleepers} d="M 82 58 Q 88 57 93 58"/>
   </svg>
   {spaces.map(s=><Stop key={s.id} space={s} target={targets.includes(s.id)} onClick={()=>moveTo(s.id)}/>)}
   {players.map((p,i)=>{const s=byId[p.space];return <div key={i} className={styles.trainAnchor} style={{left:`calc(${s.x}% + ${i?15:-15}px)`,top:`calc(${s.y}% + ${i?10:-10}px)`}}><TrainPiece blue={i===1}/></div>})}
   {roll===null&&!winner&&<Dice3D onResult={finishRoll}/>} 
  </section>
  <section className={styles.bottom}><Resources player={player}/><PartsStrip player={player}/><aside className={styles.action}><small>CURRENT ACTION</small><p>{message}</p>{ready&&player.space==="s7"&&<button onClick={attemptFinish}>FINAL QUESTION</button>}<button className={styles.pass} onClick={pass}>PASS TO {other.name.toUpperCase()}</button></aside></section>
  {engineering&&<div className={styles.engineOverlay}><div className={styles.enginePanel}><button className={styles.close} onClick={()=>setEngineering(false)}>BACK TO BOARD</button><h2>Engineering Works</h2><Sprite src={LOCO} crop={finished} width={600} className={styles.bigLoco}/><Parts player={player} canBuild={canBuild} onBuild={beginBuild}/></div></div>}
  {event&&<Modal><small>EVENT</small><h2>Railway Boom</h2><p>{event}</p><button onClick={()=>setEvent(null)}>CONTINUE</button></Modal>}
  {challenge&&<Modal wide><small>{challenge.kind==="finish"?"FINAL EXHIBITION QUESTION":challenge.kind==="build"?`BUILD • ${componentRecipes[challenge.component!].name}`:`${byId[challenge.spaceId!].label.toUpperCase()} • RESOURCE QUESTION`}</small><div className={styles.category}>{categories[challenge.question.category].name}{challenge.kind==="build"?` • ${challenge.round}/${componentRecipes[challenge.component!].questions}`:""}</div><h2>{challenge.question.question}</h2>{reveal===null?<><div className={styles.answer}><input value={answer} onChange={e=>setAnswer(e.target.value)} placeholder="Say it or type it…"/><button onClick={listen}>{listening?"LISTENING…":"SPEAK"}</button></div><div className={styles.modalActions}><button onClick={()=>speak(challenge.question)}>HEAR AGAIN</button><button onClick={judge}>LOCK ANSWER</button></div></>:<><div className={reveal?styles.correct:styles.wrong}>{reveal?"✓ CORRECT":"× NOT QUITE"}</div><p>The answer is <b>{challenge.question.answer}</b>.</p><button onClick={continueChallenge}>CONTINUE</button></>}</Modal>}
  {winner&&<Modal><small>THE GREAT EXHIBITION • 1851</small><h2>{winner} wins!</h2><p>Your completed locomotive reaches Crystal Palace.</p><button onClick={onExit}>RETURN TO WORLDS</button></Modal>}
 </main>
}

function PlayerCard({player,active=false,blue=false}:{player:Player;active?:boolean;blue?:boolean}){return <div className={`${styles.playerCard} ${active?styles.playerActive:""}`}><TrainPiece blue={blue}/><div><small>{active?"YOUR TURN":"WAITING"}</small><b>{player.name}</b><span>{player.components.length}/6 BUILT</span></div></div>}
function Stop({space,target,onClick}:{space:Space;target:boolean;onClick:()=>void}){const special=["start","works","grandworks","junction","finish"].includes(space.type);const crop=special?stationCrops[space.type==="start"?"start":space.type==="works"?"works":space.type==="grandworks"?"grandworks":space.type==="finish"?"finish":"junction"]:undefined;return <button className={`${styles.stop} ${styles[space.type]} ${target?styles.target:""}`} style={{left:`${space.x}%`,top:`${space.y}%`}} disabled={!target} onClick={onClick}>{crop?<Sprite src={STATION} crop={crop} width={space.type==="finish"?92:78}/>:space.type==="event"?<span className={styles.eventDisc}>!</span>:<span className={styles.resourceDisc}><Sprite src={RESOURCE} crop={resourceCrops[space.type]} width={42}/><b>{space.label}</b></span>}</button>}
function Resources({player}:{player:Player}){return <aside className={styles.resources}><small>RESOURCES</small>{(["coal","iron","knowledge","capital"] as ResourceKey[]).map(k=><div key={k}><Sprite src={RESOURCE} crop={resourceCrops[k]} width={28}/><b>{player.resources[k]}</b><span>{k}</span></div>)}</aside>}
function PartsStrip({player}:{player:Player}){return <section className={styles.partsStrip}>{componentOrder.map(k=><div key={k} className={player.components.includes(k)?styles.built:""}><Sprite src={LOCO} crop={componentCrops[k]} width={48}/><b>{componentRecipes[k].name}</b><span>{player.components.includes(k)?"✓":Object.entries(componentRecipes[k].cost).map(([r,a])=>`${a} ${r}`).join(" · ")}</span></div>)}</section>}
function Parts({player,canBuild,onBuild}:{player:Player;canBuild:ComponentKey[];onBuild:(k:ComponentKey)=>void}){return <div className={styles.parts}>{componentOrder.map(k=>{const built=player.components.includes(k),available=canBuild.includes(k);return <button key={k} disabled={!available||built} className={`${built?styles.built:""} ${available?styles.available:""}`} onClick={()=>onBuild(k)}><Sprite src={LOCO} crop={componentCrops[k]} width={72}/><b>{componentRecipes[k].name}</b><span>{built?"✓ BUILT":Object.entries(componentRecipes[k].cost).map(([r,a])=>`${a} ${r}`).join(" · ")}</span></button>})}</div>}
function Modal({children,wide=false}:{children:React.ReactNode;wide?:boolean}){return <div className={styles.overlay}><article className={wide?styles.wide:""}>{children}</article></div>}
