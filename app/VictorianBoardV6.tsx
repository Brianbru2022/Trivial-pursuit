"use client";

import {useMemo,useRef,useState} from "react";
import Dice3D,{DiceResultIcon} from "./Dice3D";
import {categories,questions,type Question} from "./gameData";
import {componentOrder,componentRecipes,type ComponentKey,type ResourceKey} from "./victorianGame";
import styles from "./VictorianBoardV6.module.css";

type Player={name:string;space:string;resources:Record<ResourceKey,number>;components:ComponentKey[]};
type Props={names:[string,string];onExit:()=>void};
type Challenge={kind:"space"|"build"|"finish";question:Question;spaceId?:string;component?:ComponentKey;round:number;correct:number};
type SpaceType="start"|"coal"|"iron"|"knowledge"|"capital"|"works"|"grandworks"|"event"|"junction"|"finish";
type Space={id:string;label:string;type:SpaceType;x:number;y:number;neighbours:string[]};
type Crop={x:number;y:number;w:number;h:number;sourceW:number;sourceH:number};
type Edge={a:string;b:string;d:string;shortcut?:boolean;finish?:boolean};

const RESOURCE="/themes/victorian/production/resource-sheet.png";
const LOCO="/themes/victorian/production/locomotive-sheet.png";
const STATION="/themes/victorian/production/station-sheet.png";
const empty=():Record<ResourceKey,number>=>({coal:0,iron:0,knowledge:0,capital:0});
const resourceCrops:Record<string,Crop>={coal:{x:0,y:0,w:290,h:270,sourceW:1448,sourceH:1086},iron:{x:290,y:0,w:290,h:270,sourceW:1448,sourceH:1086},knowledge:{x:580,y:0,w:290,h:270,sourceW:1448,sourceH:1086},capital:{x:870,y:0,w:290,h:270,sourceW:1448,sourceH:1086}};
const stationCrops:Record<string,Crop>={start:{x:0,y:0,w:483,h:405,sourceW:1448,sourceH:1086},works:{x:966,y:0,w:482,h:405,sourceW:1448,sourceH:1086},grandworks:{x:724,y:405,w:362,h:400,sourceW:1448,sourceH:1086},finish:{x:0,y:405,w:362,h:400,sourceW:1448,sourceH:1086},junction:{x:1086,y:405,w:362,h:400,sourceW:1448,sourceH:1086}};
const componentCrops:Record<ComponentKey,Crop>={boiler:{x:0,y:185,w:395,h:235,sourceW:1672,sourceH:941},wheels:{x:390,y:185,w:295,h:235,sourceW:1672,sourceH:941},pistons:{x:675,y:185,w:285,h:235,sourceW:1672,sourceH:941},firebox:{x:955,y:185,w:230,h:235,sourceW:1672,sourceH:941},cab:{x:1160,y:185,w:235,h:235,sourceW:1672,sourceH:941},tender:{x:1375,y:185,w:297,h:235,sourceW:1672,sourceH:941}};
const finished:Crop={x:180,y:630,w:1330,h:311,sourceW:1672,sourceH:941};

const spaces:Space[]=[
 {id:"s0",label:"Workshop",type:"start",x:12,y:48,neighbours:["s1","s14"]},
 {id:"s1",label:"Coal",type:"coal",x:19,y:23,neighbours:["s0","s2"]},
 {id:"s2",label:"Knowledge",type:"knowledge",x:36,y:17,neighbours:["s1","s3","s7"]},
 {id:"s3",label:"Iron",type:"iron",x:54,y:24,neighbours:["s2","s4"]},
 {id:"s4",label:"Engineering Works",type:"works",x:70,y:18,neighbours:["s3","s5","s10"]},
 {id:"s5",label:"Capital",type:"capital",x:82,y:33,neighbours:["s4","s6"]},
 {id:"s6",label:"East Junction",type:"junction",x:78,y:54,neighbours:["s5","s7","finish"]},
 {id:"s7",label:"Iron",type:"iron",x:61,y:48,neighbours:["s6","s8","s2"]},
 {id:"s8",label:"Grand Works",type:"grandworks",x:66,y:74,neighbours:["s7","s9"]},
 {id:"s9",label:"Coal",type:"coal",x:48,y:80,neighbours:["s8","s10"]},
 {id:"s10",label:"West Junction",type:"junction",x:31,y:68,neighbours:["s9","s11","s4"]},
 {id:"s11",label:"Knowledge",type:"knowledge",x:21,y:54,neighbours:["s10","s12"]},
 {id:"s12",label:"Event",type:"event",x:33,y:41,neighbours:["s11","s13"]},
 {id:"s13",label:"Capital",type:"capital",x:48,y:56,neighbours:["s12","s14"]},
 {id:"s14",label:"Iron",type:"iron",x:22,y:35,neighbours:["s13","s0"]},
 {id:"finish",label:"Crystal Palace",type:"finish",x:92,y:68,neighbours:["s6"]},
];
const byId=Object.fromEntries(spaces.map(s=>[s.id,s])) as Record<string,Space>;
const edges:Edge[]=[
 {a:"s0",b:"s1",d:"M 12 48 Q 14 32 19 23"},{a:"s1",b:"s2",d:"M 19 23 Q 27 14 36 17"},{a:"s2",b:"s3",d:"M 36 17 Q 46 15 54 24"},{a:"s3",b:"s4",d:"M 54 24 Q 62 16 70 18"},{a:"s4",b:"s5",d:"M 70 18 Q 79 20 82 33"},{a:"s5",b:"s6",d:"M 82 33 Q 84 44 78 54"},{a:"s6",b:"s7",d:"M 78 54 Q 69 52 61 48"},{a:"s7",b:"s8",d:"M 61 48 Q 72 59 66 74"},{a:"s8",b:"s9",d:"M 66 74 Q 57 84 48 80"},{a:"s9",b:"s10",d:"M 48 80 Q 38 78 31 68"},{a:"s10",b:"s11",d:"M 31 68 Q 22 65 21 54"},{a:"s11",b:"s12",d:"M 21 54 Q 27 45 33 41"},{a:"s12",b:"s13",d:"M 33 41 Q 42 45 48 56"},{a:"s13",b:"s14",d:"M 48 56 Q 35 50 22 35"},{a:"s14",b:"s0",d:"M 22 35 Q 15 39 12 48"},
 {a:"s2",b:"s7",d:"M 36 17 Q 49 31 61 48",shortcut:true},{a:"s10",b:"s4",d:"M 31 68 Q 48 40 70 18",shortcut:true},{a:"s6",b:"finish",d:"M 78 54 Q 86 58 92 68",finish:true},
];

function Sprite({src,crop,width,className=""}:{src:string;crop:Crop;width:number;className?:string}){const scale=width/crop.w;return <span className={`${styles.sprite} ${className}`} style={{width,height:crop.h*scale}} aria-hidden="true"><img src={src} alt="" draggable={false} style={{width:crop.sourceW*scale,height:crop.sourceH*scale,left:-crop.x*scale,top:-crop.y*scale}}/></span>}
function normalise(s:string){return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]/g,"")}
function reachableExactly(start:string,steps:number){let frontier=new Set([start]);for(let i=0;i<steps;i++){const next=new Set<string>();frontier.forEach(id=>byId[id].neighbours.forEach(n=>{if(n!=="finish")next.add(n)}));frontier=next}return [...frontier].filter(id=>id!==start&&id!=="finish")}

function TrainPiece({playerIndex}:{playerIndex:number}){return <div className={`${styles.trainPiece} ${playerIndex?styles.blueTrain:styles.redTrain}`}><span className={styles.chimney}/><span className={styles.boiler}/><span className={styles.cab}/><span className={styles.tender}/><i/><i/><i/></div>}

export default function VictorianBoardV6({names,onExit}:Props){
 const [players,setPlayers]=useState<Player[]>([{name:names[0]||"Player 1",space:"s0",resources:empty(),components:[]},{name:names[1]||"Player 2",space:"s0",resources:empty(),components:[]}]);
 const [active,setActive]=useState(0),[roll,setRoll]=useState<number|null>(null),[targets,setTargets]=useState<string[]>([]),[challenge,setChallenge]=useState<Challenge|null>(null),[answer,setAnswer]=useState(""),[reveal,setReveal]=useState<boolean|null>(null),[message,setMessage]=useState("Roll the die."),[winner,setWinner]=useState<string|null>(null),[event,setEvent]=useState<string|null>(null),[engineering,setEngineering]=useState(false),[listening,setListening]=useState(false);
 const recognitionRef=useRef<any>(null);const player=players[active],other=players[(active+1)%2];const ready=player.components.length===componentOrder.length;
 const canBuild=useMemo(()=>componentOrder.filter(k=>!player.components.includes(k)&&Object.entries(componentRecipes[k].cost).every(([r,a])=>player.resources[r as ResourceKey]>=(a??0))),[player]);
 const randomQuestion=()=>questions[Math.floor(Math.random()*questions.length)];
 function speak(q:Question){if(typeof window==="undefined"||!("speechSynthesis" in window))return;window.speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(`${categories[q.category].name}. ${q.question}`);u.lang="en-GB";u.rate=.94;window.speechSynthesis.speak(u)}
 function open(c:Challenge){setChallenge(c);setAnswer("");setReveal(null);setTimeout(()=>speak(c.question),180)}
 function finishRoll(v:number){setRoll(v);const r=reachableExactly(player.space,v);setTargets(r);setMessage(`Rolled ${v}. Choose a highlighted stop exactly ${v} track sections away.`)}
 function moveTo(id:string){if(!targets.includes(id))return;const next=players.map(p=>({...p,resources:{...p.resources},components:[...p.components]}));next[active].space=id;setPlayers(next);setTargets([]);const s=byId[id];if(s.type==="works"||s.type==="grandworks"){setEngineering(true);setMessage("Engineering Works — build a component, or pass the turn.");return}if(s.type==="event"){next[active].resources.capital++;next[active].resources.coal++;setPlayers(next);setEvent("Railway boom: gain 1 Capital and 1 Coal.");setMessage("Event resolved. Pass the turn when ready.");return}if(s.type==="junction"){setMessage("Junction reached. Your next roll can use any connected route or shortcut.");return}if(["coal","iron","knowledge","capital"].includes(s.type)){open({kind:"space",spaceId:id,question:randomQuestion(),round:1,correct:0});return}setMessage("Pass the turn when ready.")}
 function beginBuild(k:ComponentKey){if(!canBuild.includes(k))return;const r=componentRecipes[k];open({kind:"build",component:k,question:randomQuestion(),round:1,correct:0});setMessage(`${r.name}: pass ${r.needed} of ${r.questions} questions.`)}
 function attemptFinish(){if(!ready||player.space!=="s6")return;open({kind:"finish",question:randomQuestion(),round:1,correct:0})}
 function judge(){if(!challenge)return;const c=normalise(answer),a=[challenge.question.answer,...(challenge.question.alternatives??[])].map(normalise);setReveal(a.some(x=>c===x||(c&&c.includes(x))||(c&&x.includes(c))))}
 function continueChallenge(){if(!challenge||reveal===null)return;const correct=challenge.correct+(reveal?1:0);if(challenge.kind==="space"){const s=byId[challenge.spaceId!];if(reveal){const next=players.map(p=>({...p,resources:{...p.resources},components:[...p.components]}));next[active].resources[s.type as ResourceKey]+=2;setPlayers(next);setMessage(`Correct — gain 2 ${s.label}.`)}else setMessage("Incorrect — no resource gained.");setChallenge(null);setReveal(null);setAnswer("");return}if(challenge.kind==="finish"){if(reveal)setWinner(player.name);else setMessage("Final question missed. Stay at East Junction and try again later.");setChallenge(null);setReveal(null);setAnswer("");return}const k=challenge.component!,r=componentRecipes[k];if(challenge.round<r.questions){const q=randomQuestion();setChallenge({...challenge,question:q,round:challenge.round+1,correct});setReveal(null);setAnswer("");setTimeout(()=>speak(q),170);return}if(correct>=r.needed){const next=players.map(p=>({...p,resources:{...p.resources},components:[...p.components]}));Object.entries(r.cost).forEach(([res,a])=>next[active].resources[res as ResourceKey]-=a??0);next[active].components.push(k);setPlayers(next);setMessage(`${r.name} fitted successfully.`)}else setMessage(`${r.name} build failed. Resources retained.`);setChallenge(null);setReveal(null);setAnswer("")}
 function listen(){if(typeof window==="undefined")return;const R=(window as any).SpeechRecognition||(window as any).webkitSpeechRecognition;if(!R)return;const r=new R();r.lang="en-GB";r.interimResults=true;r.maxAlternatives=5;r.onstart=()=>setListening(true);r.onend=()=>{setListening(false);recognitionRef.current=null};r.onresult=(e:any)=>setAnswer(e.results[e.results.length-1][0]?.transcript??"");recognitionRef.current=r;r.start()}
 function pass(){if(challenge||winner)return;const n=(active+1)%2;setActive(n);setRoll(null);setTargets([]);setEngineering(false);setEvent(null);setReveal(null);setAnswer("");setMessage(`${players[n].name}'s turn — roll the die.`)}
 return <main className={styles.page}>
  <header className={styles.header}><PlayerCard player={player} active colour="red"/><div className={styles.title}><small>1851</small><h1>THE GREAT EXHIBITION</h1></div><div className={styles.headerRight}><PlayerCard player={other} colour="blue"/><button onClick={onExit}>EXIT</button></div></header>
  {roll!==null&&<DiceResultIcon value={roll}/>} 
  <section className={styles.board}><img src="/themes/victorian/board-art.webp?v=3" className={styles.art} alt=""/>
   <svg className={styles.track} viewBox="0 0 100 100" preserveAspectRatio="none">{edges.map((e,i)=><RailEdge key={i} edge={e}/>)}</svg>
   {spaces.map(s=><Stop key={s.id} space={s} target={targets.includes(s.id)} onClick={()=>moveTo(s.id)}/>)}
   {players.map((p,i)=>{const s=byId[p.space];const dx=i?18:-18,dy=i?12:-12;return <div key={i} className={styles.trainAnchor} style={{left:`calc(${s.x}% + ${dx}px)`,top:`calc(${s.y}% + ${dy}px)`}}><TrainPiece playerIndex={i}/></div>})}
   {roll===null&&!winner&&!challenge&&<Dice3D onResult={finishRoll}/>} 
  </section>
  <section className={styles.bottom}><Resources player={player}/><PartsStrip player={player}/><aside className={styles.action}><div><small>CURRENT ACTION</small><p>{message}</p></div>{ready&&player.space==="s6"&&<button className={styles.finalButton} onClick={attemptFinish}>FINAL QUESTION</button>}<button className={styles.pass} onClick={pass} disabled={!!challenge||!!winner}>PASS TO {other.name.toUpperCase()}</button></aside></section>
  {engineering&&<EngineeringOverlay player={player} canBuild={canBuild} onBuild={beginBuild} onClose={()=>setEngineering(false)}/>} 
  {event&&<Modal><small>VICTORIAN EVENT</small><h2>Railway Mania</h2><p>{event}</p><button onClick={()=>setEvent(null)}>CONTINUE</button></Modal>}
  {challenge&&<Modal wide><small>{challenge.kind==="build"?`ENGINEERING CHALLENGE • ${componentRecipes[challenge.component!].name}`:challenge.kind==="finish"?"FINAL EXHIBITION QUESTION":`${byId[challenge.spaceId!].label.toUpperCase()} • RESOURCE QUESTION`}</small><div className={styles.category}>{categories[challenge.question.category].name}{challenge.kind==="build"?` • ${challenge.round}/${componentRecipes[challenge.component!].questions}`:""}</div><h2>{challenge.question.question}</h2>{reveal===null?<><div className={styles.answer}><input value={answer} onChange={e=>setAnswer(e.target.value)} placeholder="Say it or type it…"/><button onClick={listen}>{listening?"LISTENING…":"SPEAK"}</button></div><div className={styles.modalActions}><button onClick={()=>speak(challenge.question)}>HEAR AGAIN</button><button onClick={judge}>LOCK ANSWER</button></div></>:<><div className={reveal?styles.correct:styles.wrong}>{reveal?"✓ CORRECT":"× NOT QUITE"}</div><p>The answer is <b>{challenge.question.answer}</b>.</p><button onClick={continueChallenge}>CONTINUE</button></>}</Modal>}
  {winner&&<Modal><small>THE GREAT EXHIBITION • 1851</small><h2>{winner} wins!</h2><p>Your completed locomotive reaches Crystal Palace.</p><button onClick={onExit}>RETURN TO WORLDS</button></Modal>}
 </main>
}

function RailEdge({edge}:{edge:Edge}){const c=edge.finish?styles.finishRail:edge.shortcut?styles.shortcutRail:"";return <g className={c}><path className={styles.railShadow} d={edge.d}/><path className={styles.sleeperBed} d={edge.d}/><path className={styles.leftRail} d={edge.d}/><path className={styles.rightRail} d={edge.d}/></g>}
function Stop({space,target,onClick}:{space:Space;target:boolean;onClick:()=>void}){if(space.type==="finish")return <button disabled={!target} onClick={onClick} className={`${styles.stop} ${styles.specialStop} ${styles.finishStop} ${target?styles.target:""}`} style={{left:`${space.x}%`,top:`${space.y}%`}}><Sprite src={STATION} crop={stationCrops.finish} width={96}/></button>;if(space.type==="start"||space.type==="works"||space.type==="grandworks"||space.type==="junction"){const key=space.type==="start"?"start":space.type==="grandworks"?"grandworks":space.type==="junction"?"junction":"works";return <button disabled={!target} onClick={onClick} className={`${styles.stop} ${styles.specialStop} ${target?styles.target:""}`} style={{left:`${space.x}%`,top:`${space.y}%`}}><Sprite src={STATION} crop={stationCrops[key]} width={space.type==="start"?88:82}/></button>}if(space.type==="event")return <button disabled={!target} onClick={onClick} className={`${styles.stop} ${styles.resourceStop} ${styles.eventStop} ${target?styles.target:""}`} style={{left:`${space.x}%`,top:`${space.y}%`}}><span className={styles.eventMark}>!</span><b>EVENT</b></button>;return <button disabled={!target} onClick={onClick} className={`${styles.stop} ${styles.resourceStop} ${styles[space.type]} ${target?styles.target:""}`} style={{left:`${space.x}%`,top:`${space.y}%`}}><Sprite src={RESOURCE} crop={resourceCrops[space.type]} width={43}/><b>{space.label.toUpperCase()}</b></button>}
function PlayerCard({player,active=false,colour}:{player:Player;active?:boolean;colour:"red"|"blue"}){return <div className={`${styles.playerCard} ${active?styles.playerActive:""}`}><TrainPiece playerIndex={colour==="blue"?1:0}/><div><small>{active?"YOUR TURN":"WAITING"}</small><b>{player.name}</b><span>{player.components.length}/6 BUILT</span></div><div className={styles.cardPips}>{componentOrder.map(k=><i key={k} className={player.components.includes(k)?styles.builtPip:""}/>)}</div></div>}
function Resources({player}:{player:Player}){return <aside className={styles.resources}><small>RESOURCES</small><div className={styles.resourceRow}>{(["coal","iron","knowledge","capital"] as ResourceKey[]).map(k=><div className={styles.resourceChip} key={k}><Sprite src={RESOURCE} crop={resourceCrops[k]} width={34}/><b>{player.resources[k]}</b><span>{k}</span></div>)}</div></aside>}
function PartsStrip({player}:{player:Player}){return <section className={styles.partsStrip}>{componentOrder.map(k=><div key={k} className={`${styles.partTile} ${player.components.includes(k)?styles.partBuilt:""}`}><Sprite src={LOCO} crop={componentCrops[k]} width={55}/><b>{componentRecipes[k].name}</b>{player.components.includes(k)?<span>✓ BUILT</span>:<span>{Object.entries(componentRecipes[k].cost).map(([r,a])=>`${a} ${r}`).join(" · ")}</span>}</div>)}</section>}
function EngineeringOverlay({player,canBuild,onBuild,onClose}:{player:Player;canBuild:ComponentKey[];onBuild:(k:ComponentKey)=>void;onClose:()=>void}){return <div className={styles.engineOverlay}><article><button className={styles.closeEngineering} onClick={onClose}>RETURN TO BOARD</button><small>ENGINEERING WORKS</small><h2>Build your locomotive</h2><div className={styles.bigEngine}><Sprite src={LOCO} crop={finished} width={610} className={styles.engineGhost}/><span>{player.components.length}/6 COMPONENTS FITTED</span></div><div className={styles.engineParts}>{componentOrder.map(k=>{const built=player.components.includes(k),available=canBuild.includes(k);return <button key={k} disabled={!available||built} className={`${styles.enginePart} ${built?styles.enginePartBuilt:""} ${available?styles.enginePartAvailable:""}`} onClick={()=>onBuild(k)}><Sprite src={LOCO} crop={componentCrops[k]} width={78}/><b>{componentRecipes[k].name}</b><span>{built?"✓ BUILT":Object.entries(componentRecipes[k].cost).map(([r,a])=>`${a} ${r}`).join(" · ")}</span></button>})}</div></article></div>}
function Modal({children,wide=false}:{children:React.ReactNode;wide?:boolean}){return <div className={styles.overlay}><article className={wide?styles.wide:""}>{children}</article></div>}
