"use client";

import {useEffect,useMemo,useRef,useState} from "react";
import Dice3D,{DiceResultIcon} from "./Dice3D";
import {categories,questions,type Question} from "./gameData";
import {componentOrder,componentRecipes,type ComponentKey,type ResourceKey} from "./victorianGame";
import styles from "./VictorianBoardV8.module.css";

type Props={names:[string,string,string];onExit:()=>void};
type Player={name:string;index:number;resources:Record<ResourceKey,number>;components:ComponentKey[]};
type StopType="start"|"coal"|"iron"|"knowledge"|"capital"|"works"|"event"|"grandworks"|"finish";
type Stop={label:string;type:StopType;x:number;y:number};
type Challenge={kind:"resource"|"build"|"finish";question:Question;component?:ComponentKey;round:number;correct:number};
type Crop={x:number;y:number;w:number;h:number;sourceW:number;sourceH:number};

const RESOURCE="/themes/victorian/production/resource-sheet.png";
const LOCO="/themes/victorian/production/locomotive-sheet.png";
const STATION="/themes/victorian/production/station-sheet.png";
const resourceCrops:Record<ResourceKey,Crop>={coal:{x:0,y:0,w:290,h:270,sourceW:1448,sourceH:1086},iron:{x:290,y:0,w:290,h:270,sourceW:1448,sourceH:1086},knowledge:{x:580,y:0,w:290,h:270,sourceW:1448,sourceH:1086},capital:{x:870,y:0,w:290,h:270,sourceW:1448,sourceH:1086}};
const stationCrops:Record<string,Crop>={start:{x:0,y:0,w:483,h:405,sourceW:1448,sourceH:1086},works:{x:966,y:0,w:482,h:405,sourceW:1448,sourceH:1086},grandworks:{x:724,y:405,w:362,h:400,sourceW:1448,sourceH:1086},finish:{x:0,y:405,w:362,h:400,sourceW:1448,sourceH:1086}};
const componentCrops:Record<ComponentKey,Crop>={boiler:{x:0,y:185,w:395,h:235,sourceW:1672,sourceH:941},wheels:{x:390,y:185,w:295,h:235,sourceW:1672,sourceH:941},pistons:{x:675,y:185,w:285,h:235,sourceW:1672,sourceH:941},firebox:{x:955,y:185,w:230,h:235,sourceW:1672,sourceH:941},cab:{x:1160,y:185,w:235,h:235,sourceW:1672,sourceH:941},tender:{x:1375,y:185,w:297,h:235,sourceW:1672,sourceH:941}};
const finished:Crop={x:180,y:630,w:1330,h:311,sourceW:1672,sourceH:941};
const empty=():Record<ResourceKey,number>=>({coal:0,iron:0,knowledge:0,capital:0});

const stops:Stop[]=[
 {label:"Workshop",type:"start",x:10,y:72},
 {label:"Coal Depot",type:"coal",x:16,y:58},
 {label:"Knowledge",type:"knowledge",x:24,y:45},
 {label:"Iron Foundry",type:"iron",x:34,y:35},
 {label:"Capital",type:"capital",x:45,y:32},
 {label:"Engineering Works",type:"works",x:55,y:38},
 {label:"Coal Sidings",type:"coal",x:62,y:50},
 {label:"Event",type:"event",x:60,y:64},
 {label:"Knowledge",type:"knowledge",x:50,y:72},
 {label:"Iron",type:"iron",x:39,y:69},
 {label:"Capital",type:"capital",x:31,y:60},
 {label:"Grand Works",type:"grandworks",x:42,y:52},
 {label:"Coal",type:"coal",x:56,y:48},
 {label:"Knowledge",type:"knowledge",x:69,y:43},
 {label:"Iron",type:"iron",x:80,y:39},
 {label:"Crystal Palace",type:"finish",x:91,y:33},
];

function Sprite({src,crop,width,className=""}:{src:string;crop:Crop;width:number;className?:string}){const scale=width/crop.w;return <span className={`${styles.sprite} ${className}`} style={{width,height:crop.h*scale}}><img src={src} alt="" draggable={false} style={{width:crop.sourceW*scale,height:crop.sourceH*scale,left:-crop.x*scale,top:-crop.y*scale}}/></span>}
function normalise(s:string){return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]/g,"")}

export default function VictorianBoardV8({names,onExit}:Props){
 const [players,setPlayers]=useState<Player[]>(names.map((name,i)=>({name:name||`Player ${i+1}`,index:0,resources:empty(),components:[]})));
 const [active,setActive]=useState(0),[roll,setRoll]=useState<number|null>(null),[challenge,setChallenge]=useState<Challenge|null>(null),[answer,setAnswer]=useState(""),[reveal,setReveal]=useState<boolean|null>(null),[message,setMessage]=useState("Roll the die."),[winner,setWinner]=useState<string|null>(null),[event,setEvent]=useState<string|null>(null),[engineering,setEngineering]=useState(false),[moving,setMoving]=useState(false),[listening,setListening]=useState(false);
 const player=players[active],nextPlayer=players[(active+1)%players.length],ready=player.components.length===6;
 const canBuild=useMemo(()=>componentOrder.filter(k=>!player.components.includes(k)&&Object.entries(componentRecipes[k].cost).every(([r,a])=>player.resources[r as ResourceKey]>=(a??0))),[player]);
 const randomQuestion=()=>questions[Math.floor(Math.random()*questions.length)];
 function speak(q:Question){if(typeof window==="undefined"||!("speechSynthesis" in window))return;window.speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(`${categories[q.category].name}. ${q.question}`);u.lang="en-GB";u.rate=.94;window.speechSynthesis.speak(u)}
 function open(c:Challenge){setChallenge(c);setAnswer("");setReveal(null);setTimeout(()=>speak(c.question),180)}
 async function finishRoll(v:number){if(moving)return;setRoll(v);const target=Math.min(player.index+v,stops.length-1);setMoving(true);setMessage(`Moving ${v} station${v===1?"":"s"}…`);for(let i=player.index+1;i<=target;i++){await new Promise(r=>setTimeout(r,360));setPlayers(prev=>prev.map((p,idx)=>idx===active?{...p,index:i}:p))}setMoving(false);resolveStop(target)}
 function resolveStop(index:number){const stop=stops[index];if(stop.type==="finish"){if(ready)open({kind:"finish",question:randomQuestion(),round:1,correct:0});else setMessage("You reached Crystal Palace, but your locomotive is incomplete. Pass your turn and continue building on a later lap.");return}if(stop.type==="works"||stop.type==="grandworks"){setEngineering(true);setMessage("Engineering Works: build one component or pass your turn.");return}if(stop.type==="event"){const next=players.map(p=>({...p,resources:{...p.resources},components:[...p.components]}));next[active].resources.capital++;next[active].resources.coal++;setPlayers(next);setEvent("Railway boom: gain 1 Capital and 1 Coal.");setMessage("Event resolved. Pass when ready.");return}if(["coal","iron","knowledge","capital"].includes(stop.type)){open({kind:"resource",question:randomQuestion(),round:1,correct:0});return}setMessage("Pass when ready.")}
 function beginBuild(k:ComponentKey){if(!canBuild.includes(k))return;const r=componentRecipes[k];open({kind:"build",component:k,question:randomQuestion(),round:1,correct:0});setMessage(`${r.name}: pass ${r.needed} of ${r.questions} questions.`)}
 function judge(){if(!challenge)return;const c=normalise(answer),a=[challenge.question.answer,...(challenge.question.alternatives??[])].map(normalise);setReveal(a.some(x=>c===x||(c&&c.includes(x))||(c&&x.includes(c))))}
 function continueChallenge(){if(!challenge||reveal===null)return;const correct=challenge.correct+(reveal?1:0);if(challenge.kind==="resource"){const stop=stops[players[active].index];if(reveal){const next=players.map(p=>({...p,resources:{...p.resources},components:[...p.components]}));next[active].resources[stop.type as ResourceKey]+=2;setPlayers(next);setMessage(`Correct — gain 2 ${stop.label}.`)}else setMessage("Incorrect — no resource gained.");setChallenge(null);setReveal(null);setAnswer("");return}if(challenge.kind==="finish"){if(reveal)setWinner(player.name);else setMessage("Final question missed. Pass your turn and try again later.");setChallenge(null);setReveal(null);setAnswer("");return}const k=challenge.component!,r=componentRecipes[k];if(challenge.round<r.questions){const q=randomQuestion();setChallenge({...challenge,question:q,round:challenge.round+1,correct});setReveal(null);setAnswer("");setTimeout(()=>speak(q),170);return}if(correct>=r.needed){const next=players.map(p=>({...p,resources:{...p.resources},components:[...p.components]}));Object.entries(r.cost).forEach(([res,a])=>next[active].resources[res as ResourceKey]-=a??0);next[active].components.push(k);setPlayers(next);setMessage(`${r.name} fitted.`)}else setMessage(`${r.name} build failed. Resources retained.`);setChallenge(null);setReveal(null);setAnswer("")}
 function listen(){if(typeof window==="undefined")return;const R=(window as any).SpeechRecognition||(window as any).webkitSpeechRecognition;if(!R)return;const r=new R();r.lang="en-GB";r.interimResults=true;r.onstart=()=>setListening(true);r.onend=()=>setListening(false);r.onresult=(e:any)=>setAnswer(e.results[e.results.length-1][0]?.transcript??"");r.start()}
 function pass(){if(moving)return;const n=(active+1)%players.length;setActive(n);setRoll(null);setChallenge(null);setEngineering(false);setEvent(null);setReveal(null);setAnswer("");setMessage(`${players[n].name}'s turn — roll the die.`)}
 return <main className={styles.page}>
  <header className={styles.header}><PlayerCard player={players[0]} active={active===0} colour="red"/><PlayerCard player={players[1]} active={active===1} colour="blue"/><div className={styles.title}><small>1851</small><h1>THE GREAT EXHIBITION</h1></div><PlayerCard player={players[2]} active={active===2} colour="green"/><button className={styles.exit} onClick={onExit}>EXIT</button></header>
  {roll!==null&&<DiceResultIcon value={roll}/>} 
  <section className={styles.board}><img src="/themes/victorian/board-art.webp?v=3" className={styles.art} alt=""/>
   <svg className={styles.track} viewBox="0 0 100 100" preserveAspectRatio="none"><path className={styles.trackBed} d="M10 72 C19 53 28 38 43 33 C55 29 66 41 63 57 C60 71 43 79 30 64 C24 56 33 48 45 50 C60 53 69 43 91 33"/><path className={styles.rail1} d="M10 72 C19 53 28 38 43 33 C55 29 66 41 63 57 C60 71 43 79 30 64 C24 56 33 48 45 50 C60 53 69 43 91 33"/><path className={styles.rail2} d="M10 72 C19 53 28 38 43 33 C55 29 66 41 63 57 C60 71 43 79 30 64 C24 56 33 48 45 50 C60 53 69 43 91 33"/><path className={styles.sleepers} d="M10 72 C19 53 28 38 43 33 C55 29 66 41 63 57 C60 71 43 79 30 64 C24 56 33 48 45 50 C60 53 69 43 91 33"/></svg>
   {stops.map((s,i)=><Stop key={i} stop={s} index={i}/>) }
   {players.map((p,i)=><Train key={i} colour={i===0?"red":i===1?"blue":"green"} stop={stops[p.index]} lane={i}/>) }
   {roll===null&&!winner&&!moving&&<Dice3D onResult={finishRoll}/>} 
  </section>
  <section className={styles.tray}><Resources player={player}/><PartsStrip player={player}/><aside className={styles.action}><small>CURRENT ACTION</small><p>{message}</p><button className={styles.pass} onClick={pass}>PASS TO {nextPlayer.name.toUpperCase()}</button></aside></section>
  {engineering&&<div className={styles.engineOverlay}><div className={styles.enginePanel}><button className={styles.close} onClick={()=>setEngineering(false)}>BACK TO BOARD</button><h2>Engineering Works</h2><Sprite src={LOCO} crop={finished} width={590} className={styles.bigLoco}/><Parts player={player} canBuild={canBuild} onBuild={beginBuild}/></div></div>}
  {event&&<Modal><small>EVENT</small><h2>Railway Boom</h2><p>{event}</p><button onClick={()=>setEvent(null)}>CONTINUE</button></Modal>}
  {challenge&&<Modal wide><small>{challenge.kind==="finish"?"FINAL EXHIBITION QUESTION":challenge.kind==="build"?`ENGINEERING • ${componentRecipes[challenge.component!].name}`:`${stops[players[active].index].label.toUpperCase()} • RESOURCE QUESTION`}</small><div className={styles.category}>{categories[challenge.question.category].name}{challenge.kind==="build"?` • ${challenge.round}/${componentRecipes[challenge.component!].questions}`:""}</div><h2>{challenge.question.question}</h2>{reveal===null?<><div className={styles.answer}><input value={answer} onChange={e=>setAnswer(e.target.value)} placeholder="Say it or type it…"/><button onClick={listen}>{listening?"LISTENING…":"SPEAK"}</button></div><div className={styles.modalActions}><button onClick={()=>speak(challenge.question)}>HEAR AGAIN</button><button onClick={judge}>LOCK ANSWER</button></div></>:<><div className={reveal?styles.correct:styles.wrong}>{reveal?"✓ CORRECT":"× NOT QUITE"}</div><p>The answer is <b>{challenge.question.answer}</b>.</p><button onClick={continueChallenge}>CONTINUE</button></>}</Modal>}
  {winner&&<Modal><small>THE GREAT EXHIBITION • 1851</small><h2>{winner} wins!</h2><p>Your completed locomotive arrives triumphantly at Crystal Palace.</p><button onClick={onExit}>RETURN TO WORLDS</button></Modal>}
 </main>
}

function Stop({stop,index}:{stop:Stop;index:number}){if(["start","works","grandworks","finish"].includes(stop.type)){const crop=stationCrops[stop.type];return <div className={styles.specialStop} style={{left:`${stop.x}%`,top:`${stop.y}%`}}><Sprite src={STATION} crop={crop} width={stop.type==="finish"?88:72}/></div>}if(stop.type==="event")return <div className={`${styles.stop} ${styles.eventStop}`} style={{left:`${stop.x}%`,top:`${stop.y}%`}}><b>!</b><span>EVENT</span></div>;const crop=resourceCrops[stop.type as ResourceKey];return <div className={`${styles.stop} ${styles[stop.type]}`} style={{left:`${stop.x}%`,top:`${stop.y}%`}}><Sprite src={RESOURCE} crop={crop} width={42}/><span>{stop.label}</span></div>}
function Train({colour,stop,lane}:{colour:"red"|"blue"|"green";stop:Stop;lane:number}){const dx=[-16,0,16][lane],dy=[-12,14,-12][lane];return <div className={`${styles.train} ${styles[colour]}`} style={{left:`calc(${stop.x}% + ${dx}px)`,top:`calc(${stop.y}% + ${dy}px)`}}><i className={styles.chimney}/><i className={styles.boiler}/><i className={styles.cab}/><i className={styles.w1}/><i className={styles.w2}/></div>}
function PlayerCard({player,active,colour}:{player:Player;active:boolean;colour:string}){return <div className={`${styles.playerCard} ${active?styles.active:""}`}><span className={`${styles.playerTrain} ${styles[colour]}`}>🚂</span><div><small>{active?"YOUR TURN":"WAITING"}</small><b>{player.name}</b><em>{player.components.length}/6 BUILT</em></div></div>}
function Resources({player}:{player:Player}){return <div className={styles.resources}>{(["coal","iron","knowledge","capital"] as ResourceKey[]).map(k=><div key={k}><Sprite src={RESOURCE} crop={resourceCrops[k]} width={30}/><b>{player.resources[k]}</b></div>)}</div>}
function PartsStrip({player}:{player:Player}){return <div className={styles.partsStrip}>{componentOrder.map(k=><div key={k} className={player.components.includes(k)?styles.built:""}><Sprite src={LOCO} crop={componentCrops[k]} width={58}/><span>{componentRecipes[k].name}</span></div>)}</div>}
function Parts({player,canBuild,onBuild}:{player:Player;canBuild:ComponentKey[];onBuild:(k:ComponentKey)=>void}){return <div className={styles.parts}>{componentOrder.map(k=>{const r=componentRecipes[k],built=player.components.includes(k),available=canBuild.includes(k);return <button key={k} disabled={!available||built} className={`${built?styles.built:""} ${available?styles.available:""}`} onClick={()=>onBuild(k)}><Sprite src={LOCO} crop={componentCrops[k]} width={72}/><b>{r.name}</b><span>{built?"✓ BUILT":Object.entries(r.cost).map(([x,a])=>`${a} ${x}`).join(" • ")}</span></button>})}</div>}
function Modal({children,wide=false}:{children:React.ReactNode;wide?:boolean}){return <div className={styles.overlay}><article className={wide?styles.wide:""}>{children}</article></div>}
