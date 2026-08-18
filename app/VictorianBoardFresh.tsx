"use client";

import { useMemo, useState } from "react";
import Dice3D from "./Dice3D";
import styles from "./VictorianBoardFresh.module.css";

type Props={names:[string,string,string];onExit:()=>void};
type Resource="coal"|"iron"|"knowledge"|"capital";
type StopType="start"|Resource|"works"|"event"|"grandworks"|"finish";
type Stop={name:string;type:StopType;x:number;y:number};
type Player={name:string;index:number;resources:Record<Resource,number>;built:number};

const stops:Stop[]=[
 {name:"Workshop",type:"start",x:95,y:470},
 {name:"Coal Depot",type:"coal",x:165,y:390},
 {name:"Knowledge Hall",type:"knowledge",x:265,y:330},
 {name:"Iron Foundry",type:"iron",x:370,y:300},
 {name:"Capital Exchange",type:"capital",x:485,y:320},
 {name:"Engineering Works",type:"works",x:590,y:370},
 {name:"Coal Sidings",type:"coal",x:690,y:445},
 {name:"Railway Event",type:"event",x:770,y:530},
 {name:"Knowledge Institute",type:"knowledge",x:690,y:610},
 {name:"Iron Works",type:"iron",x:575,y:655},
 {name:"Capital Bank",type:"capital",x:455,y:630},
 {name:"Grand Works",type:"grandworks",x:345,y:585},
 {name:"Coal Yard",type:"coal",x:300,y:505},
 {name:"Knowledge Society",type:"knowledge",x:390,y:440},
 {name:"Iron Terminus",type:"iron",x:520,y:430},
 {name:"Crystal Palace",type:"finish",x:865,y:300},
];

const trackPath="M95 470 C150 390 235 335 370 300 C475 270 580 320 690 445 C770 530 740 610 575 655 C450 690 345 620 300 505 C275 440 380 405 520 430 C650 455 745 375 865 300";
const empty=():Record<Resource,number>=>({coal:0,iron:0,knowledge:0,capital:0});

function iconFor(type:StopType){if(type==="coal")return "◆";if(type==="iron")return "▰";if(type==="knowledge")return "✦";if(type==="capital")return "£";if(type==="event")return "!";if(type==="works"||type==="grandworks")return "⚒";if(type==="finish")return "✧";return "⌂"}

export default function VictorianBoardFresh({names,onExit}:Props){
 const [players,setPlayers]=useState<Player[]>(names.map((n,i)=>({name:n||`Player ${i+1}`,index:0,resources:empty(),built:0})));
 const [active,setActive]=useState(0);
 const [roll,setRoll]=useState<number|null>(null);
 const [moving,setMoving]=useState(false);
 const [message,setMessage]=useState("Roll the die to begin the journey.");
 const player=players[active];
 const next=players[(active+1)%players.length];
 const currentStop=stops[player.index];
 const progress=useMemo(()=>Math.round((player.index/(stops.length-1))*100),[player.index]);

 async function onRoll(v:number){if(moving)return;setMoving(true);setRoll(v);setMessage(`${player.name} rolled ${v}.`);const target=Math.min(player.index+v,stops.length-1);for(let i=player.index+1;i<=target;i++){await new Promise(r=>setTimeout(r,420));setPlayers(prev=>prev.map((p,idx)=>idx===active?{...p,index:i}:p));}setMoving(false);const landed=stops[target];if(["coal","iron","knowledge","capital"].includes(landed.type)){setPlayers(prev=>prev.map((p,idx)=>idx===active?{...p,resources:{...p.resources,[landed.type]:(p.resources[landed.type as Resource]??0)+1}}:p));setMessage(`${landed.name}: gain 1 ${landed.type}.`);}else if(landed.type==="works"||landed.type==="grandworks"){setMessage(`${landed.name}: this will open the locomotive-building phase.`);}else if(landed.type==="event"){setMessage("Railway Event: event-card phase goes here.");}else if(landed.type==="finish"){setMessage(player.built>=6?"Final question at Crystal Palace.":"You reached Crystal Palace, but your locomotive is not complete yet.");}else setMessage("End your turn when ready.");}

 function pass(){if(moving)return;const n=(active+1)%players.length;setActive(n);setRoll(null);setMessage(`${players[n].name}'s turn — roll the die.`)}

 return <main className={styles.page}>
  <header className={styles.header}>
   <div className={styles.brand}><small>THE GREAT EXHIBITION • 1851</small><h1>RAILWAY TO CRYSTAL PALACE</h1></div>
   <div className={styles.players}>{players.map((p,i)=><div key={i} className={`${styles.playerCard} ${active===i?styles.active:""}`}><span className={`${styles.dot} ${styles[`c${i}`]}`}/><div><b>{p.name}</b><small>{p.built}/6 built • {Math.round((p.index/(stops.length-1))*100)}%</small></div></div>)}</div>
   <button onClick={onExit} className={styles.exit}>EXIT</button>
  </header>

  <section className={styles.boardFrame}>
   <svg className={styles.board} viewBox="0 0 960 760" role="img" aria-label="Victorian railway board">
    <defs>
     <linearGradient id="paper" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#e8d8ad"/><stop offset="1" stopColor="#bea472"/></linearGradient>
     <linearGradient id="green" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#78906e"/><stop offset="1" stopColor="#4b6450"/></linearGradient>
     <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="6" stdDeviation="6" floodOpacity=".28"/></filter>
     <filter id="smallShadow" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="3" stdDeviation="3" floodOpacity=".35"/></filter>
    </defs>
    <rect x="12" y="12" width="936" height="736" rx="28" fill="url(#paper)" stroke="#5b3820" strokeWidth="12"/>
    <rect x="28" y="28" width="904" height="704" rx="22" fill="none" stroke="#c59a4d" strokeWidth="3"/>
    <path d="M42 560 C170 495 270 520 370 560 C485 605 620 610 735 565 C820 532 880 515 922 520 L922 722 L42 722 Z" fill="#6d8d77" opacity=".78"/>
    <path d="M42 585 C170 545 280 580 400 610 C545 648 670 630 790 585 C850 562 890 552 922 560" fill="none" stroke="#b6d0ca" strokeWidth="34" opacity=".55"/>
    <g opacity=".42"><circle cx="140" cy="215" r="90" fill="url(#green)"/><circle cx="760" cy="205" r="110" fill="url(#green)"/><circle cx="650" cy="560" r="84" fill="url(#green)"/><circle cx="225" cy="600" r="72" fill="url(#green)"/></g>
    <g className={styles.city} opacity=".78"><path d="M100 255h18v-50h18v50h16v-80h18v80h24v-35h18v35h20v-65h18v65h22"/><path d="M700 250h20v-48h18v48h22v-90h16v90h24v-55h18v55h22v-36h18v36"/></g>

    <path d={trackPath} className={styles.trackShadow}/><path d={trackPath} className={styles.trackBed}/><path d={trackPath} className={styles.sleeperLine}/><path d={trackPath} className={styles.railLeft}/><path d={trackPath} className={styles.railRight}/>

    {stops.map((s,i)=><g key={i} transform={`translate(${s.x} ${s.y})`} className={styles.stopGroup} filter="url(#smallShadow)">
      {s.type==="start"||s.type==="works"||s.type==="grandworks"||s.type==="finish"?<>
       <rect x="-48" y="-32" width="96" height="64" rx="14" className={`${styles.specialStop} ${styles[s.type]}`}/><text y="-2" textAnchor="middle" className={styles.specialIcon}>{iconFor(s.type)}</text><text y="48" textAnchor="middle" className={styles.stopLabel}>{s.name}</text>
      </>:<>
       <circle r="30" className={`${styles.resourceStop} ${styles[s.type]}`}/><text y="8" textAnchor="middle" className={styles.stopIcon}>{iconFor(s.type)}</text><text y="50" textAnchor="middle" className={styles.stopLabel}>{s.name}</text>
      </>}
     </g>)}

    {players.map((p,i)=>{const s=stops[p.index];const off=[[-16,-18],[0,-28],[16,-18]][i];return <g key={i} transform={`translate(${s.x+off[0]} ${s.y+off[1]})`} className={styles.train} filter="url(#smallShadow)"><g className={`${styles.trainBody} ${styles[`train${i}`]}`}><rect x="-21" y="-12" width="33" height="18" rx="7"/><rect x="9" y="-16" width="16" height="22" rx="3"/><rect x="-16" y="-22" width="7" height="12" rx="2"/><circle cx="-12" cy="10" r="7"/><circle cx="15" cy="10" r="7"/></g></g>})}
   </svg>

   {!moving&&roll===null&&<div className={styles.die}><Dice3D onResult={onRoll}/></div>}
  </section>

  <section className={styles.tray}>
   <div className={styles.status}><span className={`${styles.bigDot} ${styles[`c${active}`]}`}/><div><small>CURRENT PLAYER</small><b>{player.name}</b><em>{currentStop.name}</em></div></div>
   <div className={styles.resources}>{(["coal","iron","knowledge","capital"] as Resource[]).map(r=><div key={r}><span>{r}</span><b>{player.resources[r]}</b></div>)}</div>
   <div className={styles.progress}><small>LOCOMOTIVE</small><div>{Array.from({length:6},(_,i)=><i key={i} className={i<player.built?styles.built:""}/>)}</div><span>{player.built}/6 built</span></div>
   <div className={styles.message}><small>CURRENT ACTION</small><b>{message}</b><span>Journey {progress}% complete</span></div>
   <button onClick={pass} className={styles.pass}>PASS TO {next.name.toUpperCase()}</button>
  </section>
 </main>
}
