"use client";

import {useMemo,useRef,useState} from "react";
import Dice3D,{DiceResultIcon} from "./Dice3D";
import VictorianLocomotiveV3 from "./VictorianLocomotiveV3";
import {categories,questions,type Question} from "./gameData";
import {componentOrder,componentRecipes,reachableSites,victorianSites,type ComponentKey,type ResourceKey} from "./victorianGame";
import styles from "./VictorianBoardV3Styles";

type Player={name:string;site:number;resources:Record<ResourceKey,number>;components:ComponentKey[];rerolls:number};
type Props={names:[string,string];onExit:()=>void};
type Challenge={kind:"location"|"build";question:Question;siteId?:number;component?:ComponentKey;round:number;correct:number};
type Crop={x:number;y:number;w:number;h:number;sourceW:number;sourceH:number};

const empty=():Record<ResourceKey,number>=>({coal:0,iron:0,knowledge:0,capital:0});
const events=[
 {title:"Railway Mania",text:"Investors rush into the railway boom. Gain 2 Capital.",apply:(p:Player)=>p.resources.capital+=2},
 {title:"Industrial Breakthrough",text:"A new process earns 1 Knowledge and 1 Iron.",apply:(p:Player)=>{p.resources.knowledge++;p.resources.iron++}},
 {title:"Government Contract",text:"A government order provides 1 Capital and 1 Coal.",apply:(p:Player)=>{p.resources.capital++;p.resources.coal++}},
 {title:"Express Service",text:"Your connections earn a reroll token.",apply:(p:Player)=>p.rerolls++},
];

const STATION_SHEET="/themes/victorian/production/station-sheet.png";
const RESOURCE_SHEET="/themes/victorian/production/resource-sheet.png";
const LOCO_SHEET="/themes/victorian/production/locomotive-sheet.png";

const stationCrops:Record<string,Crop>={
 WORKSHOP:{x:0,y:0,w:483,h:405,sourceW:1448,sourceH:1086},
 UNIVERSITY:{x:483,y:0,w:483,h:405,sourceW:1448,sourceH:1086},
 WORKS:{x:966,y:0,w:482,h:405,sourceW:1448,sourceH:1086},
 EXHIBITION:{x:0,y:405,w:362,h:400,sourceW:1448,sourceH:1086},
 DOCKS:{x:362,y:405,w:362,h:400,sourceW:1448,sourceH:1086},
 "GRAND WORKS":{x:724,y:405,w:362,h:400,sourceW:1448,sourceH:1086},
 JUNCTION:{x:1086,y:405,w:362,h:400,sourceW:1448,sourceH:1086},
};

const resourceCrops:Record<string,Crop>={
 coal:{x:0,y:0,w:290,h:270,sourceW:1448,sourceH:1086},
 iron:{x:290,y:0,w:290,h:270,sourceW:1448,sourceH:1086},
 knowledge:{x:580,y:0,w:290,h:270,sourceW:1448,sourceH:1086},
 capital:{x:870,y:0,w:290,h:270,sourceW:1448,sourceH:1086},
 reroll:{x:0,y:485,w:290,h:235,sourceW:1448,sourceH:1086},
};

const componentCrops:Record<ComponentKey,Crop>={
 boiler:{x:0,y:185,w:395,h:235,sourceW:1672,sourceH:941},
 wheels:{x:390,y:185,w:295,h:235,sourceW:1672,sourceH:941},
 pistons:{x:675,y:185,w:285,h:235,sourceW:1672,sourceH:941},
 firebox:{x:955,y:185,w:230,h:235,sourceW:1672,sourceH:941},
 cab:{x:1160,y:185,w:235,h:235,sourceW:1672,sourceH:941},
 tender:{x:1375,y:185,w:297,h:235,sourceW:1672,sourceH:941},
};
const finishedLocoCrop:Crop={x:180,y:630,w:1330,h:311,sourceW:1672,sourceH:941};
const sepiaLocoCrop:Crop={x:205,y:405,w:1240,h:270,sourceW:1672,sourceH:941};

function SpriteCrop({src,crop,width,className=""}:{src:string;crop:Crop;width:number;className?:string}){
 const scale=width/crop.w;
 return <span className={`${styles.spriteCrop} ${className}`} style={{width,height:crop.h*scale}} aria-hidden="true">
   <img src={src} alt="" draggable={false} style={{width:crop.sourceW*scale,height:crop.sourceH*scale,left:-crop.x*scale,top:-crop.y*scale}}/>
 </span>;
}

function Glyph({kind}:{kind:string}){
 const p={fill:"none",stroke:"currentColor",strokeWidth:1.65,strokeLinecap:"round" as const,strokeLinejoin:"round" as const};
 if(kind==="coal")return <svg viewBox="0 0 24 24"><path {...p} d="M5 17l2-7 5-3 6 3 1 6-5 3-6-1zM8 10l5 3 5-3M13 7v6"/></svg>;
 if(kind==="iron")return <svg viewBox="0 0 24 24"><path {...p} d="M4 15l4-7h8l4 7H4zm3 0v3h10v-3M9 11h6"/></svg>;
 if(kind==="university")return <svg viewBox="0 0 24 24"><path {...p} d="M4 8l8-4 8 4-8 4-8-4zm3 3v7m10-7v7M5 19h14"/></svg>;
 if(kind==="engineering"||kind==="start")return <svg viewBox="0 0 24 24"><path {...p} d="M5 18l6-6m2-2 6-6M6 5l4 4-2 2-4-4 2-2zm8 8l4 4-2 2-4-4 2-2z"/></svg>;
 if(kind==="port")return <svg viewBox="0 0 24 24"><path {...p} d="M12 3v15m-5-9h10M5 13c1 5 4 7 7 7s6-2 7-7M9 5h6"/></svg>;
 if(kind==="event")return <svg viewBox="0 0 24 24"><path {...p} d="M12 4v10m0 4v.2"/></svg>;
 if(kind==="exhibition")return <svg viewBox="0 0 24 24"><path {...p} d="M4 19h16M6 19V8l6-4 6 4v11M9 19v-7h6v7M7 9h10"/></svg>;
 return <svg viewBox="0 0 24 24"><path {...p} d="M4 12h16M12 4v16M7 7l10 10M17 7L7 17"/><circle {...p} cx="12" cy="12" r="8"/></svg>;
}
function normalise(s:string){return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]/g,"")}

export default function VictorianBoardV3({names,onExit}:Props){
 const [players,setPlayers]=useState<Player[]>([{name:names[0]||"Player 1",site:0,resources:empty(),components:[],rerolls:0},{name:names[1]||"Player 2",site:0,resources:empty(),components:[],rerolls:0}]);
 const [active,setActive]=useState(0),[roll,setRoll]=useState<number|null>(null),[targets,setTargets]=useState<number[]>([]),[challenge,setChallenge]=useState<Challenge|null>(null),[answer,setAnswer]=useState(""),[reveal,setReveal]=useState<boolean|null>(null),[message,setMessage]=useState("Roll the die, then choose exactly that many spaces clockwise or anticlockwise."),[event,setEvent]=useState<{title:string;text:string}|null>(null),[winner,setWinner]=useState<string|null>(null),[listening,setListening]=useState(false);
 const recognitionRef=useRef<any>(null); const player=players[active],other=players[(active+1)%2]; const ready=player.components.length===componentOrder.length; const atWorks=victorianSites[player.site].kind==="engineering";
 const canBuild=useMemo(()=>componentOrder.filter(k=>!player.components.includes(k)&&Object.entries(componentRecipes[k].cost).every(([r,a])=>player.resources[r as ResourceKey]>=(a??0))),[player]);
 const randomQuestion=()=>questions[Math.floor(Math.random()*questions.length)];
 function speak(q:Question){if(typeof window==="undefined"||!("speechSynthesis" in window))return;window.speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(`${player.name}. ${categories[q.category].name}. ${q.question}`);u.lang="en-GB";u.rate=.93;window.speechSynthesis.speak(u)}
 function open(c:Challenge){setChallenge(c);setAnswer("");setReveal(null);setTimeout(()=>speak(c.question),250)}
 function listen(){if(typeof window==="undefined")return;const R=(window as any).SpeechRecognition||(window as any).webkitSpeechRecognition;if(!R){setMessage("Speech recognition isn't available here; type your answer instead.");return}const r=new R();r.lang="en-GB";r.interimResults=true;r.maxAlternatives=5;r.onstart=()=>setListening(true);r.onend=()=>{setListening(false);recognitionRef.current=null};r.onresult=(e:any)=>setAnswer(e.results[e.results.length-1][0]?.transcript??"");recognitionRef.current=r;r.start()}
 function finishRoll(v:number){setRoll(v);setTargets(reachableSites(player.site,v));setMessage(`Rolled ${v}. Move exactly ${v} spaces clockwise or anticlockwise.`)}
 function moveTo(id:number){if(!targets.includes(id))return;const site=victorianSites[id],next=players.map(p=>({...p,resources:{...p.resources},components:[...p.components]}));next[active].site=id;setPlayers(next);setTargets([]);if(site.kind==="exhibition"){if(ready)setWinner(player.name);else setMessage("Complete your locomotive before entering Crystal Palace.");return}if(site.kind==="engineering"){setMessage("Engineering Works reached. Build any component you can afford, or pass the turn.");return}if(site.kind==="event"){const c=events[Math.floor(Math.random()*events.length)];c.apply(next[active]);setPlayers(next);setEvent({title:c.title,text:c.text});setMessage(c.text);return}open({kind:"location",question:randomQuestion(),siteId:id,round:1,correct:0})}
 function beginBuild(k:ComponentKey){if(!atWorks||!canBuild.includes(k))return;const r=componentRecipes[k];setMessage(`${r.name}: pass ${r.needed} of ${r.questions} construction questions.`);open({kind:"build",question:randomQuestion(),component:k,round:1,correct:0})}
 function judge(){if(!challenge)return;const c=normalise(answer),a=[challenge.question.answer,...(challenge.question.alternatives??[])].map(normalise);setReveal(a.some(x=>c===x||(c&&c.includes(x))||(c&&x.includes(c))))}
 function continueChallenge(){if(!challenge||reveal===null)return;const correct=challenge.correct+(reveal?1:0);if(challenge.kind==="location"){const site=victorianSites[challenge.siteId!];if(reveal&&site.reward){const next=players.map(p=>({...p,resources:{...p.resources},components:[...p.components]}));Object.entries(site.reward).forEach(([r,a])=>next[active].resources[r as ResourceKey]+=a??0);setPlayers(next);setMessage(`Correct — ${site.name} pays its reward.`)}else setMessage("Incorrect — no reward from this stop.");setChallenge(null);setReveal(null);setAnswer("");return}const k=challenge.component!,r=componentRecipes[k];if(challenge.round<r.questions){const q=randomQuestion();setChallenge({...challenge,question:q,round:challenge.round+1,correct});setReveal(null);setAnswer("");setTimeout(()=>speak(q),220);return}if(correct>=r.needed){const next=players.map(p=>({...p,resources:{...p.resources},components:[...p.components]}));Object.entries(r.cost).forEach(([res,a])=>next[active].resources[res as ResourceKey]-=a??0);next[active].components.push(k);setPlayers(next);setMessage(`${r.name} completed and fitted to your locomotive.`)}else setMessage(`${r.name} construction failed. Your resources are retained.`);setChallenge(null);setReveal(null);setAnswer("")}
 function pass(){const n=(active+1)%2;setActive(n);setRoll(null);setTargets([]);setChallenge(null);setEvent(null);setAnswer("");setReveal(null);setMessage(`${players[n].name}'s turn — roll the die.`)}
 return <main className={styles.page}>
   <header className={styles.top}><div className={styles.player}><span className={styles.avatar}>{player.name[0]}</span><div><small>YOUR TURN</small><b>{player.name}</b></div></div><div className={styles.brand}><small>1851</small><h1>THE GREAT EXHIBITION</h1><p>Gather • Build • Race to London</p></div><div className={`${styles.player} ${styles.playerRight}`}><div><small>WAITING</small><b>{other.name}</b></div><span className={styles.avatar}>{other.name[0]}</span><button onClick={onExit}>EXIT</button></div></header>
   {roll!==null&&<DiceResultIcon value={roll}/>} 
   <section className={styles.boardShell}><img src="/themes/victorian/board-art.webp?v=3" className={styles.art} alt=""/><div className={styles.artWash}/><svg className={styles.track} viewBox="0 0 100 100" preserveAspectRatio="none">{victorianSites.flatMap(s=>s.links.filter(id=>id>s.id).map(id=>{const o=victorianSites[id];return <g key={`${s.id}-${id}`}><line className={styles.railShadow} x1={s.x} y1={s.y} x2={o.x} y2={o.y}/><line className={styles.railSteel} x1={s.x} y1={s.y} x2={o.x} y2={o.y}/><line className={styles.railSleepers} x1={s.x} y1={s.y} x2={o.x} y2={o.y}/></g>}))}</svg>
   {victorianSites.map(s=>{const crop=s.major?stationCrops[s.shortName]:undefined;return <button key={s.id} title={s.name} className={`${styles.station} ${s.major?styles.major:""} ${crop?styles.illustratedStation:""} ${targets.includes(s.id)?styles.target:""} ${styles[s.kind]??""}`} style={{left:`${s.x}%`,top:`${s.y}%`}} disabled={!targets.includes(s.id)} onClick={()=>moveTo(s.id)}>{crop?<SpriteCrop src={STATION_SHEET} crop={crop} width={s.kind==="exhibition"?104:90} className={styles.stationSprite}/>:<><span className={styles.medallion}><Glyph kind={s.kind}/></span>{targets.includes(s.id)&&<span className={styles.label}>{s.shortName}</span>}</>}</button>})}
   {players.map((p,i)=>{const s=victorianSites[p.site];return <div key={i} className={`${styles.pawn} ${i?styles.blue:""}`} style={{left:`${s.x}%`,top:`${s.y}%`}}><span>{i+1}</span></div>})}{roll===null&&!winner&&<Dice3D onResult={finishRoll}/>}<div className={styles.boardMotto}>INNOVATION • INDUSTRY • OPPORTUNITY</div></section>
   <section className={styles.console}><aside className={styles.resources}><h2>RESOURCES</h2><Resource art="coal" label="Coal" value={player.resources.coal}/><Resource art="iron" label="Iron" value={player.resources.iron}/><Resource art="knowledge" label="Knowledge" value={player.resources.knowledge}/><Resource art="capital" label="Capital" value={player.resources.capital}/><Resource art="reroll" label="Rerolls" value={player.rerolls}/></aside><section className={styles.workshop}><div className={styles.workshopHead}><div><small>ENGINEERING DRAWING No. 1851</small><h2>YOUR LOCOMOTIVE</h2></div><span>{player.components.length}/6 COMPLETE</span></div><div className={styles.loco}>{ready?<div className={styles.finishedLoco}><SpriteCrop src={LOCO_SHEET} crop={finishedLocoCrop} width={670}/><span>READY FOR THE GREAT EXHIBITION</span></div>:<ProgressiveLocomotive completed={player.components}/>}</div><div className={styles.parts}>{componentOrder.map(k=>{const r=componentRecipes[k],built=player.components.includes(k),available=atWorks&&canBuild.includes(k);return <button key={k} disabled={!available||built} onClick={()=>beginBuild(k)} className={`${styles.part} ${built?styles.built:""} ${available?styles.available:""}`}><SpriteCrop src={LOCO_SHEET} crop={componentCrops[k]} width={70} className={styles.componentSprite}/><b>{r.name}</b><small>{built?"✓ COMPLETED":Object.entries(r.cost).map(([x,a])=>`${a} ${x}`).join(" • ")}</small><em>{r.needed}/{r.questions} challenge</em></button>})}</div></section><aside className={styles.side}><h2>CURRENT OBJECTIVE</h2><p>{message}</p><div className={styles.objective}>{ready?"ENGINE COMPLETE — REACH CRYSTAL PALACE":"BUILD ALL SIX LOCOMOTIVE COMPONENTS"}</div>{roll!==null&&!challenge&&!winner&&<button onClick={pass}>PASS TO {other.name.toUpperCase()}</button>}</aside></section>
   {event&&<Modal><small>VICTORIAN EVENT</small><h2>{event.title}</h2><p>{event.text}</p><button onClick={()=>setEvent(null)}>CONTINUE</button></Modal>}
   {challenge&&<Modal wide><small>{challenge.kind==="build"?`ENGINEERING CHALLENGE • ${componentRecipes[challenge.component!].name}`:`${victorianSites[challenge.siteId!].shortName} • RESOURCE QUESTION`}</small><div className={styles.category}>{categories[challenge.question.category].name}{challenge.kind==="build"?` • ${challenge.round}/${componentRecipes[challenge.component!].questions}`:""}</div><h2>{challenge.question.question}</h2>{reveal===null?<><div className={styles.answer}><input value={answer} onChange={e=>setAnswer(e.target.value)} placeholder="Say it or type it…"/><button onClick={listen}>{listening?"LISTENING…":"SPEAK"}</button></div><div className={styles.modalActions}><button onClick={()=>speak(challenge.question)}>HEAR AGAIN</button><button onClick={judge}>LOCK ANSWER</button></div></>:<><div className={reveal?styles.correct:styles.wrong}>{reveal?"✓ CORRECT":"× NOT QUITE"}</div><p>The answer is <b>{challenge.question.answer}</b>.</p><button onClick={continueChallenge}>CONTINUE</button></>}</Modal>}
   {winner&&<Modal><small>THE GREAT EXHIBITION • 1851</small><h2>{winner} wins!</h2><p>Your completed locomotive arrives at Crystal Palace.</p><button onClick={onExit}>RETURN TO WORLDS</button></Modal>}
 </main>
}
function ProgressiveLocomotive({completed}:{completed:ComponentKey[]}){
 const overlayWidths:Record<ComponentKey,number>={boiler:265,wheels:190,pistons:160,firebox:120,cab:125,tender:175};
 const overlayClass:Record<ComponentKey,string>={boiler:styles.boilerOverlay,wheels:styles.wheelsOverlay,pistons:styles.pistonsOverlay,firebox:styles.fireboxOverlay,cab:styles.cabOverlay,tender:styles.tenderOverlay};
 return <div className={styles.progressLoco}>
   <SpriteCrop src={LOCO_SHEET} crop={sepiaLocoCrop} width={690} className={styles.progressLocoBase}/>
   {componentOrder.filter(k=>completed.includes(k)).map(k=><SpriteCrop key={k} src={LOCO_SHEET} crop={componentCrops[k]} width={overlayWidths[k]} className={`${styles.progressOverlay} ${overlayClass[k]}`}/>)}
 </div>;
}
function Resource({art,label,value}:{art:string;label:string;value:number}){return <div className={styles.resource}><SpriteCrop src={RESOURCE_SHEET} crop={resourceCrops[art]} width={42} className={styles.resourceSprite}/><b>{label}</b><strong>{value}</strong></div>}
function Modal({children,wide=false}:{children:React.ReactNode;wide?:boolean}){return <div className={styles.overlay}><article className={wide?styles.wide:""}>{children}</article></div>}
