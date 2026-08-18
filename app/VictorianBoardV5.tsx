"use client";

import {useMemo,useRef,useState} from "react";
import Dice3D,{DiceResultIcon} from "./Dice3D";
import {categories,questions,type Question} from "./gameData";
import {componentOrder,componentRecipes,type ComponentKey,type ResourceKey} from "./victorianGame";
import styles from "./VictorianBoardV5.module.css";

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
 {id:"s0",label:"Workshop",type:"start",x:13,y:44,neighbours:["s1","s21"]},
 {id:"s1",label:"Coal",type:"coal",x:17,y:27,neighbours:["s0","s2"]},
 {id:"s2",label:"Knowledge",type:"knowledge",x:28,y:17,neighbours:["s1","s3","s7"]},
 {id:"s3",label:"Iron",type:"iron",x:41,y:13,neighbours:["s2","s4"]},
 {id:"s4",label:"Knowledge",type:"knowledge",x:53,y:12,neighbours:["s3","s5"]},
 {id:"s5",label:"Capital",type:"capital",x:66,y:15,neighbours:["s4","s6"]},
 {id:"s6",label:"Works",type:"works",x:76,y:23,neighbours:["s5","s7"]},
 {id:"s7",label:"Coal",type:"coal",x:82,y:36,neighbours:["s6","s8","s2"]},
 {id:"s8",label:"Event",type:"event",x:84,y:49,neighbours:["s7","s9"]},
 {id:"s9",label:"Iron",type:"iron",x:82,y:62,neighbours:["s8","s10"]},
 {id:"s10",label:"Junction East",type:"junction",x:75,y:73,neighbours:["s9","s11","s13","finish"]},
 {id:"s11",label:"Capital",type:"capital",x:63,y:79,neighbours:["s10","s12"]},
 {id:"s12",label:"Grand Works",type:"grandworks",x:50,y:82,neighbours:["s11","s13"]},
 {id:"s13",label:"Knowledge",type:"knowledge",x:38,y:79,neighbours:["s12","s14","s10"]},
 {id:"s14",label:"Coal",type:"coal",x:28,y:72,neighbours:["s13","s15"]},
 {id:"s15",label:"Event",type:"event",x:20,y:62,neighbours:["s14","s16","s19"]},
 {id:"s16",label:"Iron",type:"iron",x:17,y:52,neighbours:["s15","s17"]},
 {id:"s17",label:"Capital",type:"capital",x:18,y:42,neighbours:["s16","s18"]},
 {id:"s18",label:"Knowledge",type:"knowledge",x:20,y:34,neighbours:["s17","s19"]},
 {id:"s19",label:"Junction West",type:"junction",x:28,y:45,neighbours:["s18","s20","s15"]},
 {id:"s20",label:"Coal",type:"coal",x:39,y:53,neighbours:["s19","s21"]},
 {id:"s21",label:"Capital",type:"capital",x:27,y:48,neighbours:["s20","s0"]},
 {id:"finish",label:"Crystal Palace",type:"finish",x:92,y:73,neighbours:["s10"]},
];
const byId=Object.fromEntries(spaces.map(s=>[s.id,s])) as Record<string,Space>;

function Sprite({src,crop,width,className=""}:{src:string;crop:Crop;width:number;className?:string}){const scale=width/crop.w;return <span className={`${styles.sprite} ${className}`} style={{width,height:crop.h*scale}}><img src={src} alt="" style={{width:crop.sourceW*scale,height:crop.sourceH*scale,left:-crop.x*scale,top:-crop.y*scale}}/></span>}
function normalise(s:string){return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]/g,"")}
function reachableExactly(start:string,steps:number){let frontier=new Set([start]);for(let i=0;i<steps;i++){const next=new Set<string>();frontier.forEach(id=>byId[id].neighbours.forEach(n=>{if(n!=="finish")next.add(n)}));frontier=next}return [...frontier].filter(id=>id!==start)}
function pathD(ids:string[]){return ids.map((id,i)=>`${i?"L":"M"} ${byId[id].x} ${byId[id].y}`).join(" ")}
const mainLoop=["s0","s1","s2","s3","s4","s5","s6","s7","s8","s9","s10","s11","s12","s13","s14","s15","s16","s17","s18","s19","s20","s21","s0"];

function TrainPiece({playerIndex}:{playerIndex:number}){return <div className={`${styles.trainPiece} ${playerIndex?styles.blueTrain:styles.redTrain}`}><span className={styles.trainChimney}/><span className={styles.trainBoiler}/><span className={styles.trainCab}/><i/><i/></div>}

export default function VictorianBoardV5({names,onExit}:Props){
 const [players,setPlayers]=useState<Player[]>([{name:names[0]||"Player 1",space:"s0",resources:empty(),components:[]},{name:names[1]||"Player 2",space:"s0",resources:empty(),components:[]}]);
 const [active,setActive]=useState(0),[roll,setRoll]=useState<number|null>(null),[targets,setTargets]=useState<string[]>([]),[challenge,setChallenge]=useState<Challenge|null>(null),[answer,setAnswer]=useState(""),[reveal,setReveal]=useState<boolean|null>(null),[message,setMessage]=useState("Roll the die."),[winner,setWinner]=useState<string|null>(null),[event,setEvent]=useState<string|null>(null),[engineering,setEngineering]=useState(false),[listening,setListening]=useState(false);
 const recognitionRef=useRef<any>(null);const player=players[active],other=players[(active+1)%2];const ready=player.components.length===6;const canBuild=useMemo(()=>componentOrder.filter(k=>!player.components.includes(k)&&Object.entries(componentRecipes[k].cost).every(([r,a])=>player.resources[r as ResourceKey]>=(a??0))),[player]);
 const randomQuestion=()=>questions[Math.floor(Math.random()*questions.length)];
 function speak(q:Question){if(typeof window==="undefined"||!("speechSynthesis" in window))return;window.speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(`${categories[q.category].name}. ${q.question}`);u.lang="en-GB";u.rate=.94;window.speechSynthesis.speak(u)}
 function open(c:Challenge){setChallenge(c);setAnswer("");setReveal(null);setTimeout(()=>speak(c.question),180)}
 function finishRoll(v:number){setRoll(v);setTargets(reachableExactly(player.space,v));setMessage(`Rolled ${v}. Choose any highlighted destination exactly ${v} track sections away.`)}
 function moveTo(id:string){if(!targets.includes(id))return;const next=players.map(p=>({...p,resources:{...p.resources},components:[...p.components]}));next[active].space=id;setPlayers(next);setTargets([]);const s=byId[id];if(s.type==="works"||s.type==="grandworks"){setEngineering(true);setMessage("Engineering Works: choose a component to build, or end your turn.");return}if(s.type==="event"){setEvent("A railway boom brings you 1 Capital and 1 Coal.");next[active].resources.capital++;next[active].resources.coal++;setPlayers(next);return}if(s.type==="junction"){setMessage("Junction reached. Your next roll may open several routes or a shortcut.");return}if(["coal","iron","knowledge","capital"].includes(s.type)){open({kind:"space",spaceId:id,question:randomQuestion(),round:1,correct:0});return}setMessage("End your turn when ready.")}
 function beginBuild(k:ComponentKey){if(!canBuild.includes(k))return;const r=componentRecipes[k];open({kind:"build",component:k,question:randomQuestion(),round:1,correct:0});setMessage(`${r.name}: pass ${r.needed} of ${r.questions} questions.`)}
 function attemptFinish(){if(!ready||player.space!=="s10")return;open({kind:"finish",question:randomQuestion(),round:1,correct:0})}
 function judge(){if(!challenge)return;const c=normalise(answer),a=[challenge.question.answer,...(challenge.question.alternatives??[])].map(normalise);setReveal(a.some(x=>c===x||(c&&c.includes(x))||(c&&x.includes(c))))}
 function continueChallenge(){if(!challenge||reveal===null)return;const ok=challenge.correct+(reveal?1:0);if(challenge.kind==="space"){const s=byId[challenge.spaceId!];if(reveal){const next=players.map(p=>({...p,resources:{...p.resources},components:[...p.components]}));next[active].resources[s.type as ResourceKey]+=2;setPlayers(next);setMessage(`Correct — gain 2 ${s.label}.`)}else setMessage("Incorrect — no resource gained.");setChallenge(null);setReveal(null);setAnswer("");return}if(challenge.kind==="finish"){if(reveal){setWinner(player.name)}else setMessage("Final question missed. Remain at Junction East and try again on a later turn.");setChallenge(null);setReveal(null);setAnswer("");return}const k=challenge.component!,r=componentRecipes[k];if(challenge.round<r.questions){const q=randomQuestion();setChallenge({...challenge,question:q,round:challenge.round+1,correct:ok});setReveal(null);setAnswer("");setTimeout(()=>speak(q),170);return}if(ok>=r.needed){const next=players.map(p=>({...p,resources:{...p.resources},components:[...p.components]}));Object.entries(r.cost).forEach(([res,a])=>next[active].resources[res as ResourceKey]-=a??0);next[active].components.push(k);setPlayers(next);setMessage(`${r.name} fitted to your locomotive.`)}else setMessage(`${r.name} build failed. Resources retained.`);setChallenge(null);setReveal(null);setAnswer("")}
 function listen(){if(typeof window==="undefined")return;const R=(window as any).SpeechRecognition||(window as any).webkitSpeechRecognition;if(!R)return;const r=new R();r.lang="en-GB";r.interimResults=true;r.maxAlternatives=5;r.onstart=()=>setListening(true);r.onend=()=>setListening(false);r.onresult=(e:any)=>setAnswer(e.results[e.results.length-1][0]?.transcript??"");recognitionRef.current=r;r.start()}
 function pass(){const n=(active+1)%2;setActive(n);setRoll(null);setTargets([]);setChallenge(null);setEngineering(false);setEvent(null);setReveal(null);setAnswer("");setMessage(`${players[n].name}'s turn — roll the die.`)}
 return <main className={styles.page}>
  <header className={styles.header}><PlayerCard player={player} active colour="red"/><div className={styles.title}><small>1851</small><h1>THE GREAT EXHIBITION</h1></div><div className={styles.headerRight}><PlayerCard player={other} colour="blue"/><button onClick={onExit}>EXIT</button></div></header>
  {roll!==null&&<DiceResultIcon value={roll}/>} 
  <section className={styles.board}><img src="/themes/victorian/board-art.webp?v=3" className={styles.art} alt=""/>
   <svg className={styles.track} viewBox="0 0 100 100" preserveAspectRatio="none"><path className={styles.shadowRail} d={pathD(mainLoop)}/><path className={styles.outerRail} d={pathD(mainLoop)}/><path className={styles.innerRail} d={pathD(mainLoop)}/><path className={styles.sleepers} d={pathD(mainLoop)}/><path className={styles.shortcut} d="M 28 17 Q 54 30 82 36"/><path className={styles.shortcut} d="M 28 72 Q 47 57 20 62"/><path className={styles.shortcut} d="M 75 73 Q 84 73 92 73"/></svg>
   {spaces.map(s=><Stop key={s.id} space={s} target={targets.includes(s.id)} onClick={()=>moveTo(s.id)}/>)}
   {players.map((p,i)=>{const s=byId[p.space];return <div key={i} className={styles.trainAnchor} style={{left:`calc(${s.x}% + ${i?18:-18}px)`,top:`calc(${s.y}% + ${i?14:-14}px)`}}><TrainPiece playerIndex={i}/></div>})}
   {roll===null&&!winner&&<Dice3D onResult={finishRoll}/>} 
  </section>
  <section className={styles.bottom}><Resources player={player}/><PartsStrip player={player}/><aside className={styles.action}><small>CURRENT ACTION</small><p>{message}</p>{ready&&player.space==="s10"&&<button onClick={attemptFinish}>FINAL QUESTION</button>}<button className={styles.pass} onClick={pass}>PASS TO {other.name.toUpperCase()}</button></aside></section>
  {engineering&&<div className={styles.engineOverlay}><div className={styles.enginePanel}><button className={styles.close} onClick={()=>setEngineering(false)}>RETURN TO BOARD</button><h2>ENGINEERING WORKS</h2><Sprite src={LOCO} crop={finished} width={650} className={styles.engineGhost}/><div className={styles.buildChoices}>{componentOrder.map(k=>{const built=player.components.includes(k),available=canBuild.includes(k),r=componentRecipes[k];return <button key={k} disabled={built||!available} className={`${styles.buildChoice} ${built?styles.built:""} ${available?styles.available:""}`} onClick={()=>beginBuild(k)}><Sprite src={LOCO} crop={componentCrops[k]} width={100}/><b>{r.name}</b><span>{Object.entries(r.cost).map(([x,a])=>`${a} ${x}`).join(" · ")}</span></button>})}</div></div></div>}
  {event&&<Modal><h2>RAILWAY EVENT</h2><p>{event}</p><button onClick={()=>setEvent(null)}>CONTINUE</button></Modal>}
  {challenge&&<Modal wide><small>{challenge.kind==="build"?`ENGINEERING • ${componentRecipes[challenge.component!].name}`:challenge.kind==="finish"?"FINAL EXHIBITION QUESTION":byId[challenge.spaceId!].label.toUpperCase()}</small><h2>{challenge.question.question}</h2>{reveal===null?<><div className={styles.answer}><input value={answer} onChange={e=>setAnswer(e.target.value)} placeholder="Say it or type it…"/><button onClick={listen}>{listening?"LISTENING…":"SPEAK"}</button></div><div className={styles.modalActions}><button onClick={()=>speak(challenge.question)}>HEAR AGAIN</button><button onClick={judge}>LOCK ANSWER</button></div></>:<><div className={reveal?styles.correct:styles.wrong}>{reveal?"✓ CORRECT":"× NOT QUITE"}</div><p>The answer is <b>{challenge.question.answer}</b>.</p><button onClick={continueChallenge}>CONTINUE</button></>}</Modal>}
  {winner&&<Modal><h2>{winner} wins!</h2><p>Your locomotive reaches the Great Exhibition.</p><button onClick={onExit}>RETURN TO WORLDS</button></Modal>}
 </main>
}

function Stop({space,target,onClick}:{space:Space;target:boolean;onClick:()=>void}){const art=["coal","iron","knowledge","capital"].includes(space.type)?space.type:null;const station=["start","works","grandworks","junction","finish"].includes(space.type)?stationCrops[space.type]:null;return <button title={space.label} className={`${styles.stop} ${styles[space.type]} ${target?styles.target:""}`} style={{left:`${space.x}%`,top:`${space.y}%`}} disabled={!target} onClick={onClick}>{station?<Sprite src={STATION} crop={station} width={space.type==="finish"?92:78}/>:art?<span className={styles.resourceStop}><Sprite src={RESOURCE} crop={resourceCrops[art]} width={34}/></span>:space.type==="event"?<span className={styles.eventStop}>!</span>:<span className={styles.junctionStop}>↗</span>}</button>}
function PlayerCard({player,active=false,colour}:{player:Player;active?:boolean;colour:"red"|"blue"}){const pct=(player.components.length/6)*100;return <div className={`${styles.playerCard} ${active?styles.activeCard:""}`}><div><small>{active?"YOUR TURN":"WAITING"}</small><b>{player.name}</b><span>{player.components.length}/6 BUILT</span></div><div className={styles.cardTrain}><Sprite src={LOCO} crop={finished} width={120} className={styles.ghostEngine}/><div className={styles.colourFill} style={{width:`${pct}%`}}><Sprite src={LOCO} crop={finished} width={120}/></div></div></div>}
function Resources({player}:{player:Player}){return <aside className={styles.resources}><small>RESOURCES</small>{(["coal","iron","knowledge","capital"] as ResourceKey[]).map(k=><div key={k}><Sprite src={RESOURCE} crop={resourceCrops[k]} width={38}/><span>{k}</span><b>{player.resources[k]}</b></div>)}</aside>}
function PartsStrip({player}:{player:Player}){return <section className={styles.partsStrip}>{componentOrder.map(k=>{const built=player.components.includes(k),r=componentRecipes[k];return <div key={k} className={`${styles.partCard} ${built?styles.partBuilt:""}`}><Sprite src={LOCO} crop={componentCrops[k]} width={70}/><b>{r.name}</b><span>{built?"✓ BUILT":Object.entries(r.cost).map(([x,a])=>`${a} ${x}`).join(" · ")}</span></div>})}</section>}
function Modal({children,wide=false}:{children:React.ReactNode;wide?:boolean}){return <div className={styles.overlay}><article className={wide?styles.wide:""}>{children}</article></div>}
