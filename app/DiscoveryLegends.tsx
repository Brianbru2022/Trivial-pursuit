"use client";

import {useMemo,useState} from "react";
import styles from "./DiscoveryLegends.module.css";
import {
  byLocation, createExplorer, discoveryDeck, eventDeck, locations,
  monumentReady, reachableWithin, resolveLocation, totalLegendScore,
  type DiscoveryCard, type EventCard, type Explorer, type ExplorerColour, type Location
} from "./discoveryGame";

const COLOURS:ExplorerColour[]=["red","blue","green","amber"];
const PATHS:[string,string][]=[
  ["cliff","frozen"],["cliff","pirate"],["frozen","ancient"],["ancient","desert"],["ancient","enchanted"],
  ["desert","lost"],["desert","golden"],["lost","volcanic"],["volcanic","golden"],["volcanic","sun"],
  ["golden","enchanted"],["golden","sun"],["enchanted","merchant"],["enchanted","jungle"],["pirate","merchant"],
  ["merchant","jungle"],["jungle","sun"],["sun","monument"]
];

const KIND_CLASS:Record<string,string>={
  harbour:"harbour", knowledge:"knowledge", relic:"relic", influence:"influence",
  event:"event", discovery:"discovery", glory:"glory", monument:"monument"
};

export default function DiscoveryLegends(){
  const [screen,setScreen]=useState<"setup"|"game">("setup");
  const [playerCount,setPlayerCount]=useState(3);
  const [names,setNames]=useState(["Red Explorer","Blue Explorer","Green Explorer","Amber Explorer"]);
  const [players,setPlayers]=useState<Explorer[]>([]);
  const [active,setActive]=useState(0);
  const [roll,setRoll]=useState<number|null>(null);
  const [travel,setTravel]=useState<Record<string,number>>({});
  const [phase,setPhase]=useState<"roll"|"move"|"resolve"|"end">("roll");
  const [message,setMessage]=useState("Roll the expedition die.");
  const [card,setCard]=useState<DiscoveryCard|EventCard|null>(null);
  const [cardType,setCardType]=useState<"discovery"|"event"|null>(null);
  const [winner,setWinner]=useState<Explorer|null>(null);

  const player=players[active];
  const destinationIds=useMemo(()=>Object.keys(travel),[travel]);

  function startGame(){
    const roster=Array.from({length:playerCount},(_,i)=>createExplorer(names[i].trim()||`Explorer ${i+1}`,COLOURS[i]));
    setPlayers(roster);setActive(0);setRoll(null);setTravel({});setPhase("roll");setMessage(`${roster[0].name}: roll the expedition die.`);setScreen("game");
  }

  function rollDie(){
    if(!player||phase!=="roll")return;
    const value=Math.floor(Math.random()*6)+1;
    const destinations=reachableWithin(player.location,value);
    setRoll(value);setTravel(destinations);setPhase("move");
    setMessage(`Rolled ${value}. Choose any glowing destination up to ${value} paths away.`);
  }

  function chooseDestination(id:string){
    if(!player||phase!=="move"||travel[id]===undefined)return;
    const location=byLocation[id];
    let updated={...player,location:id};
    setPlayers(prev=>prev.map((p,i)=>i===active?updated:p));
    setTravel({});setPhase("resolve");
    window.setTimeout(()=>resolveLanding(updated,location),520);
  }

  function resolveLanding(explorer:Explorer,location:Location){
    if(location.kind==="monument"){
      if(monumentReady(explorer)){
        const final={...explorer,glory:explorer.glory+3};
        setPlayers(prev=>prev.map((p,i)=>i===active?final:p));
        setWinner(final);setPhase("end");setMessage(`${final.name} has reached the Great Monument and become a legend.`);return;
      }
      setMessage("The Monument awaits a greater expedition: you need 3 Influence, 3 Knowledge and 2 Relics.");setPhase("end");return;
    }
    if(location.kind==="event"){
      const event=eventDeck[Math.floor(Math.random()*eventDeck.length)];
      const changed=event.apply(explorer);
      setPlayers(prev=>prev.map((p,i)=>i===active?changed:p));
      setCard(event);setCardType("event");setMessage(event.text);setPhase("end");return;
    }
    if(location.kind==="discovery"){
      const discovery=discoveryDeck[Math.floor(Math.random()*discoveryDeck.length)];
      let changed={...explorer,discoveries:[...explorer.discoveries,discovery],glory:explorer.glory+discovery.glory};
      if(discovery.id==="astrolabe")changed={...changed,knowledge:changed.knowledge+1};
      if(discovery.id==="idol")changed={...changed,relics:changed.relics+1};
      setPlayers(prev=>prev.map((p,i)=>i===active?changed:p));
      setCard(discovery);setCardType("discovery");setMessage(`Discovery claimed: ${discovery.title}.`);setPhase("end");return;
    }
    const changed=resolveLocation(explorer,location);
    setPlayers(prev=>prev.map((p,i)=>i===active?changed:p));
    const reward=location.kind==="knowledge"?"+1 Knowledge and +1 Glory":location.kind==="influence"?"+1 Influence and +1 Glory":location.kind==="relic"?"+1 Relic and +1 Glory":location.kind==="glory"?"+2 Glory":"Safe harbour";
    setMessage(`${location.name}: ${reward}.`);setPhase("end");
  }

  function endTurn(){
    if(players.length===0)return;
    const next=(active+1)%players.length;
    setActive(next);setRoll(null);setTravel({});setCard(null);setCardType(null);setPhase("roll");setMessage(`${players[next].name}: roll the expedition die.`);
  }

  if(screen==="setup")return <Setup playerCount={playerCount} setPlayerCount={setPlayerCount} names={names} setNames={setNames} onStart={startGame}/>;

  return <main className={styles.game}>
    <header className={styles.topBar}>
      <div className={styles.logo}><span>DISCOVERY</span><b>LEGENDS</b><small>EXPLORE · DISCOVER · BE REMEMBERED</small></div>
      <div className={styles.turnTitle}><small>EXPEDITION IN PROGRESS</small><strong>{player?.name}</strong></div>
      <button className={styles.exit} onClick={()=>setScreen("setup")}>EXIT GAME</button>
    </header>

    <section className={styles.table}>
      <aside className={styles.leftRail}>
        <article className={styles.howTo}><h3>HOW TO PLAY</h3><p><b>1</b> Roll the die.</p><p><b>2</b> Choose a connected destination.</p><p><b>3</b> Resolve its reward, event or discovery.</p><p><b>4</b> Reach the Great Monument with 3 Influence, 3 Knowledge and 2 Relics.</p></article>
        <AdventureDie value={roll} disabled={phase!=="roll"} onRoll={rollDie}/>
      </aside>

      <section className={styles.boardWrap}>
        <div className={styles.boardFrame}>
          <svg className={styles.mapArt} viewBox="0 0 1000 700" preserveAspectRatio="none" aria-hidden="true">
            <defs>
              <linearGradient id="sea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#0c5264"/><stop offset="1" stopColor="#063742"/></linearGradient>
              <radialGradient id="land" cx="45%" cy="42%"><stop offset="0" stopColor="#78964d"/><stop offset=".72" stopColor="#3f6c3f"/><stop offset="1" stopColor="#244c35"/></radialGradient>
              <filter id="shadow"><feDropShadow dx="0" dy="6" stdDeviation="7" floodColor="#001418" floodOpacity=".55"/></filter>
            </defs>
            <rect width="1000" height="700" fill="url(#sea)"/>
            <path d="M70 170 C120 90 260 70 350 130 C430 55 570 70 630 135 C720 65 900 95 930 195 C980 300 890 360 820 350 C845 460 770 590 650 575 C590 650 420 635 360 565 C260 620 130 560 155 465 C50 420 35 275 70 170Z" fill="url(#land)" filter="url(#shadow)"/>
            <path d="M90 500 C170 460 235 500 290 555 C235 625 100 620 65 555Z" fill="#cda55d" opacity=".66"/>
            <path d="M655 410 C760 380 885 420 940 520 C875 590 770 605 675 555Z" fill="#80402d" opacity=".62"/>
            <path d="M150 115 L205 62 L260 118 L305 74 L350 135Z" fill="#dbe4e3" opacity=".86"/>
            <path d="M770 130 L815 80 L865 150 L900 112 L940 190Z" fill="#d2ae69" opacity=".78"/>
            <path d="M470 170 C510 255 480 335 555 405 C625 468 710 430 790 485" fill="none" stroke="#66b7c4" strokeWidth="22" opacity=".55"/>
            <g fill="#e5c690" opacity=".55">
              <circle cx="165" cy="330" r="2"/><circle cx="185" cy="320" r="2"/><circle cx="207" cy="342" r="2"/><circle cx="520" cy="520" r="2"/><circle cx="545" cy="508" r="2"/><circle cx="575" cy="530" r="2"/><circle cx="725" cy="250" r="2"/>
            </g>
          </svg>

          <svg className={styles.paths} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            {PATHS.map(([a,b])=>{const A=byLocation[a],B=byLocation[b];const mx=(A.x+B.x)/2,my=(A.y+B.y)/2-((A.x-B.x)*.025);return <g key={`${a}-${b}`}><path className={styles.pathShadow} d={`M ${A.x} ${A.y} Q ${mx} ${my} ${B.x} ${B.y}`}/><path className={styles.pathLine} d={`M ${A.x} ${A.y} Q ${mx} ${my} ${B.x} ${B.y}`}/><path className={styles.pathDots} d={`M ${A.x} ${A.y} Q ${mx} ${my} ${B.x} ${B.y}`}/></g>})}
          </svg>

          {locations.map(l=><LocationMarker key={l.id} location={l} reachable={destinationIds.includes(l.id)} distance={travel[l.id]} onClick={()=>chooseDestination(l.id)}/>)}
          {players.map((p,i)=><ExplorerPiece key={p.colour} explorer={p} lane={i} active={i===active}/>)}

          <div className={styles.compass}><span>N</span><b>✦</b><i>E</i><em>S</em><small>W</small></div>
        </div>
      </section>

      <aside className={styles.rightRail}>
        <Deck title="EVENT DECK" symbol="✹" count={eventDeck.length}/>
        <Deck title="DISCOVERY DECK" symbol="✺" count={discoveryDeck.length}/>
        <article className={styles.goal}><small>THE GOAL</small><strong>THE GREAT MONUMENT</strong><p>Become expedition-ready, then reach the Monument before your rivals.</p><div><span>★</span><b>{player?totalLegendScore(player):0}</b><small>LEGEND SCORE</small></div></article>
      </aside>
    </section>

    <section className={styles.playerRow}>
      {players.map((p,i)=><PlayerPanel key={p.colour} explorer={p} active={i===active}/>)}
      <article className={styles.actionPanel}><small>CURRENT ACTION</small><p>{message}</p><button disabled={phase!=="end"||!!winner} onClick={endTurn}>END TURN <span>→</span></button></article>
    </section>

    {card&&<CardModal card={card} type={cardType!} onClose={()=>setCard(null)}/>} 
    {winner&&<WinnerModal explorer={winner} onExit={()=>setScreen("setup")}/>} 
  </main>;
}

function Setup({playerCount,setPlayerCount,names,setNames,onStart}:{playerCount:number;setPlayerCount:(n:number)=>void;names:string[];setNames:(n:string[])=>void;onStart:()=>void}){
 return <main className={styles.setup}><section className={styles.setupCard}><div className={styles.setupLogo}><span>DISCOVERY</span><b>LEGENDS</b><small>EXPLORE · DISCOVER · BE REMEMBERED</small></div><p>Lead an expedition across a lost archipelago, collect Knowledge, Influence and Relics, and become the first explorer worthy of the Great Monument.</p><div className={styles.countPicker}>{[2,3,4].map(n=><button key={n} className={playerCount===n?styles.selected:""} onClick={()=>setPlayerCount(n)}>{n} EXPLORERS</button>)}</div><div className={styles.nameGrid}>{Array.from({length:playerCount},(_,i)=><label key={i} className={styles[`name_${COLOURS[i]}`]}><span>{COLOURS[i].toUpperCase()} EXPLORER</span><input value={names[i]} onChange={e=>{const copy=[...names];copy[i]=e.target.value;setNames(copy)}}/></label>)}</div><button className={styles.begin} onClick={onStart}>BEGIN EXPEDITION <span>→</span></button></section></main>
}

function LocationMarker({location,reachable,distance,onClick}:{location:Location;reachable:boolean;distance?:number;onClick:()=>void}){
 return <button className={`${styles.location} ${styles[KIND_CLASS[location.kind]]} ${reachable?styles.reachable:""}`} style={{left:`${location.x}%`,top:`${location.y}%`}} onClick={onClick} disabled={!reachable}><span className={styles.locationBadge}><b>{location.symbol}</b>{distance&&<i>{distance}</i>}</span><strong>{location.name}</strong><small>{location.subtitle}</small></button>
}

function ExplorerPiece({explorer,lane,active}:{explorer:Explorer;lane:number;active:boolean}){const l=byLocation[explorer.location];const offsets=[[-14,-10],[14,-10],[-14,12],[14,12]][lane];return <div className={`${styles.explorer} ${styles[`piece_${explorer.colour}`]} ${active?styles.activePiece:""}`} style={{left:`calc(${l.x}% + ${offsets[0]}px)`,top:`calc(${l.y}% + ${offsets[1]}px)`}}><span/><b/></div>}

function PlayerPanel({explorer,active}:{explorer:Explorer;active:boolean}){return <article className={`${styles.playerPanel} ${styles[`panel_${explorer.colour}`]} ${active?styles.activePanel:""}`}><div className={styles.playerIdentity}><span className={styles.portrait}>{explorer.name.slice(0,1).toUpperCase()}</span><div><small>{active?"YOUR TURN":"EXPLORER"}</small><strong>{explorer.name}</strong></div></div><div className={styles.stats}><span>★ <b>{explorer.influence}</b><small>Influence</small></span><span>▤ <b>{explorer.knowledge}</b><small>Knowledge</small></span><span>◆ <b>{explorer.relics}</b><small>Relics</small></span><span>✦ <b>{explorer.glory}</b><small>Glory</small></span></div><div className={styles.discoveryCount}>{explorer.discoveries.length} DISCOVERIES</div></article>}

function AdventureDie({value,disabled,onRoll}:{value:number|null;disabled:boolean;onRoll:()=>void}){const pips=value??4;return <article className={styles.diePanel}><button className={styles.die} onClick={onRoll} disabled={disabled} aria-label="Roll expedition die"><span>{Array.from({length:pips},(_,i)=><i key={i}/>)}</span></button><strong>{value?`ROLLED ${value}`:"ROLL DIE"}</strong><small>{disabled?"Resolve your turn":"Tap to begin your journey"}</small></article>}

function Deck({title,symbol,count}:{title:string;symbol:string;count:number}){return <article className={styles.deck}><small>{title}</small><div className={styles.cardBack}><span>{symbol}</span></div><b>{count} CARDS</b></article>}

function CardModal({card,type,onClose}:{card:DiscoveryCard|EventCard;type:"discovery"|"event";onClose:()=>void}){const d=card as DiscoveryCard;return <div className={styles.overlay}><article className={`${styles.revealCard} ${type==="event"?styles.eventCard:styles.discoveryCard}`}><small>{type.toUpperCase()} CARD</small><div className={styles.cardSymbol}>{type==="discovery"?d.symbol:"✹"}</div><h2>{card.title}</h2><p>{card.text}</p>{type==="discovery"&&<strong>+{d.glory} GLORY</strong>}<button onClick={onClose}>RETURN TO BOARD</button></article></div>}

function WinnerModal({explorer,onExit}:{explorer:Explorer;onExit:()=>void}){return <div className={styles.overlay}><article className={styles.winner}><small>A LEGEND IS BORN</small><h2>{explorer.name}</h2><div>✦</div><strong>{totalLegendScore(explorer)} LEGEND SCORE</strong><p>The Great Monument records your expedition for all time.</p><button onClick={onExit}>NEW EXPEDITION</button></article></div>}
