"use client";

import {useMemo,useRef,useState} from "react";
import Dice3D,{DiceResultIcon} from "./Dice3D";
import VictorianLocomotive from "./VictorianLocomotive";
import {categories,questions,type Question} from "./gameData";
import {componentOrder,componentRecipes,reachableSites,victorianSites,type ComponentKey,type ResourceKey} from "./victorianGame";
import styles from "./VictorianBoardV2.module.css";

type Player={name:string;site:number;resources:Record<ResourceKey,number>;components:ComponentKey[];rerolls:number};
type Props={names:[string,string];onExit:()=>void};
type Challenge={kind:"location"|"build";question:Question;siteId?:number;component?:ComponentKey;round:number;correct:number};

const empty=():Record<ResourceKey,number>=>({coal:0,iron:0,knowledge:0,capital:0});
const events=[
 {title:"Railway Mania",text:"Investors pile into the railway boom. Gain 2 Capital.",apply:(p:Player)=>{p.resources.capital+=2}},
 {title:"Industrial Breakthrough",text:"A clever improvement wins 1 Knowledge and 1 Iron.",apply:(p:Player)=>{p.resources.knowledge+=1;p.resources.iron+=1}},
 {title:"Government Contract",text:"A public contract advances the works. Gain 1 Capital and 1 Coal.",apply:(p:Player)=>{p.resources.capital+=1;p.resources.coal+=1}},
 {title:"Express Service",text:"Your railway connections pay off. Gain a reroll token.",apply:(p:Player)=>{p.rerolls+=1}},
];

function Icon({kind}:{kind:string}){
 const common={fill:"none",stroke:"currentColor",strokeWidth:1.8,strokeLinecap:"round" as const,strokeLinejoin:"round" as const};
 if(kind==="coal")return <svg viewBox="0 0 24 24"><path {...common} d="M5 16l2-7 6-3 6 5-2 7-8 1zM8 10l6 2 3-1M13 6l1 6"/></svg>;
 if(kind==="iron")return <svg viewBox="0 0 24 24"><path {...common} d="M4 15l5-7h7l4 7H4zm3 0v3h10v-3"/></svg>;
 if(kind==="university")return <svg viewBox="0 0 24 24"><path {...common} d="M4 7l8-4 8 4-8 4-8-4zm3 3v7m10-7v7M5 19h14"/></svg>;
 if(kind==="engineering"||kind==="start")return <svg viewBox="0 0 24 24"><path {...common} d="M7 5l12 12M5 7l2-2 4 4-2 2m6 4l2-2 4 4-2 2M5 19l6-6"/></svg>;
 if(kind==="port")return <svg viewBox="0 0 24 24"><path {...common} d="M12 3v15m-5-9h10M5 13c1 5 4 7 7 7s6-2 7-7M9 5h6"/></svg>;
 if(kind==="event")return <svg viewBox="0 0 24 24"><path {...common} d="M12 4v10m0 4v.1"/></svg>;
 if(kind==="exhibition")return <svg viewBox="0 0 24 24"><path {...common} d="M4 19h16M6 19V8l6-4 6 4v11M9 19v-7h6v7M6 9h12"/></svg>;
 return <svg viewBox="0 0 24 24"><circle {...common} cx="12" cy="12" r="5"/><path {...common} d="M12 3v3m0 12v3M3 12h3m12 0h3"/></svg>;
}

function normalise(s:string){return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]/g,"")}

export default function VictorianBoardV2({names,onExit}:Props){
 const [players,setPlayers]=useState<Player[]>([{name:names[0]||"Player 1",site:0,resources:empty(),components:[],rerolls:0},{name:names[1]||"Player 2",site:0,resources:empty(),components:[],rerolls:0}]);
 const [active,setActive]=useState(0),[roll,setRoll]=useState<number|null>(null),[targets,setTargets]=useState<number[]>([]),[challenge,setChallenge]=useState<Challenge|null>(null),[answer,setAnswer]=useState(""),[reveal,setReveal]=useState<boolean|null>(null),[message,setMessage]=useState("Roll the die, then choose exactly that many spaces clockwise or anticlockwise."),[event,setEvent]=useState<{title:string;text:string}|null>(null),[winner,setWinner]=useState<string|null>(null),[listening,setListening]=useState(false);
 const recognitionRef=useRef<any>(null);
 const player=players[active],other=players[(active+1)%2],ready=player.components.length===componentOrder.length,atWorks=victorianSites[player.site].kind==="engineering";
 const canBuild=useMemo(()=>componentOrder.filter(k=>!player.components.includes(k)&&Object.entries(componentRecipes[k].cost).every(([r,a])=>player.resources[r as ResourceKey]>=(a??0))),[player]);
 const randomQuestion=()=>questions[Math.floor(Math.random()*questions.length)];
 function speak(q:Question){if(typeof window==="undefined"||!("speechSynthesis" in window))return;window.speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(`${player.name}. ${categories[q.category].name}. ${q.question}`);u.lang="en-GB";u.rate=.93;window.speechSynthesis.speak(u)}
 function open(c:Challenge){setChallenge(c);setAnswer("");setReveal(null);setTimeout(()=>speak(c.question),250)}
 function listen(){if(typeof window==="undefined")return;const R=(window as any).SpeechRecognition||(window as any).webkitSpeechRecognition;if(!R){setMessage("Speech recognition isn't available here; type the answer instead.");return}if(recognitionRef.current){recognitionRef.current.stop();return}const r=new R();r.lang="en-GB";r.interimResults=true;r.maxAlternatives=5;r.onstart=()=>setListening(true);r.onend=()=>{setListening(false);recognitionRef.current=null};r.onresult=(e:any)=>setAnswer(e.results[e.results.length-1][0]?.transcript??"");recognitionRef.current=r;r.start()}
 function finishRoll(v:number){setRoll(v);setTargets(reachableSites(player.site,v));setMessage(`Rolled ${v}. Choose exactly ${v} spaces clockwise or anticlockwise.`)}
 function moveTo(id:number){if(!targets.includes(id))return;const site=victorianSites[id];const next=players.map(p=>({...p,resources:{...p.resources},components:[...p.components]}));next[active].site=id;setPlayers(next);setTargets([]);if(site.kind==="exhibition"){if(ready)setWinner(player.name);else setMessage("Complete your locomotive before entering Crystal Palace.");return}if(site.kind==="engineering"){setMessage("Engineering Works reached. Build any component you can afford, or pass the turn.");return}if(site.kind==="event"){const c=events[Math.floor(Math.random()*events.length)];c.apply(next[active]);setPlayers(next);setEvent({title:c.title,text:c.text});setMessage(c.text);return}open({kind:"location",question:randomQuestion(),siteId:id,round:1,correct:0})}
 function beginBuild(k:ComponentKey){if(!atWorks||!canBuild.includes(k))return;const r=componentRecipes[k];setMessage(`${r.name}: pass ${r.needed} of ${r.questions} construction questions.`);open({kind:"build",question:randomQuestion(),component:k,round:1,correct:0})}
 function judge(){if(!challenge)return;const candidate=normalise(answer);const accepted=[challenge.question.answer,...(challenge.question.alternatives??[])].map(normalise);setReveal(accepted.some(a=>candidate===a||(candidate&&candidate.includes(a))||(candidate&&a.includes(candidate))))}
 function nextChallenge(){if(!challenge||reveal===null)return;const correct=challenge.correct+(reveal?1:0);if(challenge.kind==="location"){const site=victorianSites[challenge.siteId!];if(reveal&&site.reward){const next=players.map(p=>({...p,resources:{...p.resources},components:[...p.components]}));Object.entries(site.reward).forEach(([r,a])=>next[active].resources[r as ResourceKey]+=a??0);setPlayers(next);setMessage(`Correct — ${site.name} pays its reward.`)}else setMessage("Incorrect — no reward from this stop.");setChallenge(null);setReveal(null);setAnswer("");return}const k=challenge.component!,r=componentRecipes[k];if(challenge.round<r.questions){const q=randomQuestion();setChallenge({...challenge,question:q,round:challenge.round+1,correct});setReveal(null);setAnswer("");setTimeout(()=>speak(q),220);return}if(correct>=r.needed){const next=players.map(p=>({...p,resources:{...p.resources},components:[...p.components]}));Object.entries(r.cost).forEach(([res,a])=>next[active].resources[res as ResourceKey]-=a??0);next[active].components.push(k);setPlayers(next);setMessage(`${r.name} completed and fitted to the locomotive.`)}else setMessage(`${r.name} construction failed. Resources retained.`);setChallenge(null);setReveal(null);setAnswer("")}
 function pass(){const n=(active+1)%2;setActive(n);setRoll(null);setTargets([]);setChallenge(null);setEvent(null);setAnswer("");setReveal(null);setMessage(`${players[n].name}'s turn — roll the die.`)}
 return <main className={styles.page}>
  <header className={styles.header}><div className={styles.playerCard}><span className={styles.portrait}>{player.name.slice(0,1)}</span><div><small>YOUR TURN</small><b>{player.name}</b></div></div><div className={styles.title}><span>1851</span><h1>THE GREAT EXHIBITION</h1><p>Gather • Build • Race to London</p></div><div className={`${styles.playerCard} ${styles.waiting}`}><span className={styles.portrait}>{other.name.slice(0,1)}</span><div><small>WAITING</small><b>{other.name}</b></div><button onClick={onExit}>EXIT</button></div></header>
  {roll!==null&&<DiceResultIcon value={roll}/>} 
  <section className={styles.board}>
   <img className={styles.boardArt} src="/themes/victorian/board-bg.jpg" alt="" aria-hidden="true"/>
   <div className={styles.vignette}/>
   <svg className={styles.railSvg} viewBox="0 0 100 100" preserveAspectRatio="none">{victorianSites.flatMap(s=>s.links.filter(id=>id>s.id).map(id=>{const o=victorianSites[id];return <line key={`${s.id}-${id}`} x1={s.x} y1={s.y} x2={o.x} y2={o.y}/>;}))}</svg>
   {victorianSites.map(s=><button key={s.id} className={`${styles.station} ${s.major?styles.major:""} ${targets.includes(s.id)?styles.target:""} ${styles[s.kind]??""}`} style={{left:`${s.x}%`,top:`${s.y}%`}} onClick={()=>moveTo(s.id)} disabled={!targets.includes(s.id)}><span className={styles.medallion}><Icon kind={s.kind}/></span>{(s.major||targets.includes(s.id))&&<strong>{s.shortName}</strong>}</button>)}
   {players.map((p,i)=>{const s=victorianSites[p.site];return <div key={i} className={`${styles.pawn} ${i?styles.pawn2:""}`} style={{left:`${s.x}%`,top:`${s.y}%`}}><span>{i+1}</span></div>})}
   {roll===null&&!winner&&<Dice3D onResult={finishRoll}/>} 
  </section>
  <section className={styles.lower}><aside className={styles.resources}><h2>RESOURCES</h2><Resource icon="coal" label="Coal" value={player.resources.coal}/><Resource icon="iron" label="Iron" value={player.resources.iron}/><Resource icon="university" label="Knowledge" value={player.resources.knowledge}/><Resource icon="port" label="Capital" value={player.resources.capital}/><Resource icon="railway" label="Rerolls" value={player.rerolls}/></aside><div className={styles.workshop}><div className={styles.workshopHead}><div><small>ENGINEERING DRAWING • 1851</small><h2>YOUR LOCOMOTIVE</h2></div><span>{player.components.length}/6 COMPLETE</span></div><VictorianLocomotive completed={player.components}/><div className={styles.parts}>{componentOrder.map(k=>{const r=componentRecipes[k],built=player.components.includes(k),available=atWorks&&canBuild.includes(k);return <button key={k} disabled={!available||built} onClick={()=>beginBuild(k)} className={`${styles.part} ${built?styles.built:""} ${available?styles.available:""}`}><b>{r.name}</b><small>{built?"✓ COMPLETED":`${Object.entries(r.cost).map(([x,a])=>`${a} ${x}`).join(" • ")}`}</small><em>{r.needed}/{r.questions} quiz</em></button>})}</div></div><aside className={styles.mission}><h2>THE RACE</h2><p>{message}</p><div className={styles.goal}>{ready?"Locomotive complete — reach Crystal Palace":"Build all six locomotive components"}</div>{roll!==null&&!challenge&&!winner&&<button className={styles.pass} onClick={pass}>PASS TO {other.name.toUpperCase()}</button>}</aside></section>
  {event&&<div className={styles.overlay}><article><small>VICTORIAN EVENT</small><h2>{event.title}</h2><p>{event.text}</p><button onClick={()=>setEvent(null)}>CONTINUE</button></article></div>}
  {challenge&&<div className={styles.overlay}><article className={styles.question}><small>{challenge.kind==="build"?`ENGINEERING CHALLENGE • ${componentRecipes[challenge.component!].name}`:`${victorianSites[challenge.siteId!].shortName} • RESOURCE QUESTION`}</small><div className={styles.category}>{categories[challenge.question.category].name}{challenge.kind==="build"?` • ${challenge.round}/${componentRecipes[challenge.component!].questions}`:""}</div><h2>{challenge.question.question}</h2>{reveal===null?<><div className={styles.answer}><input autoFocus value={answer} onChange={e=>setAnswer(e.target.value)} placeholder="Say it or type it…"/><button onClick={listen}>{listening?"LISTENING…":"SPEAK"}</button></div><div className={styles.actions}><button onClick={()=>speak(challenge.question)}>HEAR AGAIN</button><button onClick={judge}>LOCK ANSWER</button></div></>:<><div className={reveal?styles.correct:styles.wrong}>{reveal?"✓ CORRECT":"× NOT QUITE"}</div><p>The answer is <b>{challenge.question.answer}</b>.</p><button onClick={nextChallenge}>CONTINUE</button></>}</article></div>}
  {winner&&<div className={styles.overlay}><article><small>THE GREAT EXHIBITION • 1851</small><h2>{winner} wins!</h2><p>The completed locomotive arrives at Crystal Palace.</p><button onClick={onExit}>RETURN TO WORLDS</button></article></div>}
 </main>
}

function Resource({icon,label,value}:{icon:string;label:string;value:number}){return <div className={styles.resource}><span><Icon kind={icon}/></span><b>{label}</b><strong>{value}</strong></div>}
