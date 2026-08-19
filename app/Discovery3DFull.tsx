"use client";

import {Canvas,useFrame,useThree} from "@react-three/fiber";
import {ContactShadows,Html} from "@react-three/drei";
import {useEffect,useMemo,useRef,useState} from "react";
import * as THREE from "three";
import Dice3D,{DiceResultIcon} from "./Dice3D";
import styles from "./Discovery3DFull.module.css";

type Colour="red"|"blue"|"green"|"amber";
type Resource="influence"|"knowledge"|"relics";
type Kind="camp"|"frozen"|"ruins"|"oasis"|"temple"|"haven"|"forest"|"city"|"volcano"|"pirate"|"port"|"monument";
type Location={id:string;name:string;kind:Kind;position:[number,number,number];reward?:Resource};
type Explorer={name:string;colour:Colour;location:string;influence:number;knowledge:number;relics:number;glory:number;discoveries:string[]};

type Discovery={name:string;glory:number;requirement:Partial<Record<Resource,number>>};

const COLOUR:Record<Colour,string>={red:"#bd3d32",blue:"#3572c9",green:"#4f9953",amber:"#cf9231"};
const LOCATIONS:Location[]=[
 {id:"camp",name:"Expedition Camp",kind:"camp",position:[-6.2,.38,2.8]},
 {id:"frozen",name:"Frozen Wastes",kind:"frozen",position:[-4.8,.38,-2.7],reward:"knowledge"},
 {id:"ruins",name:"Ancient Ruins",kind:"ruins",position:[-2.0,.38,-3.1],reward:"relics"},
 {id:"oasis",name:"Desert Oasis",kind:"oasis",position:[1.4,.38,-3.0],reward:"influence"},
 {id:"temple",name:"Lost Temple",kind:"temple",position:[5.0,.38,-2.2],reward:"relics"},
 {id:"haven",name:"Cliff Haven",kind:"haven",position:[-5.2,.38,.1],reward:"influence"},
 {id:"forest",name:"Enchanted Forest",kind:"forest",position:[-.9,.38,-.1],reward:"knowledge"},
 {id:"city",name:"Golden City",kind:"city",position:[3.2,.38,.0],reward:"influence"},
 {id:"volcano",name:"Volcanic Isle",kind:"volcano",position:[5.4,.38,2.6]},
 {id:"pirate",name:"Pirate Cove",kind:"pirate",position:[-3.8,.38,3.0],reward:"relics"},
 {id:"port",name:"Merchant Port",kind:"port",position:[.2,.38,3.2]},
 {id:"monument",name:"The Great Monument",kind:"monument",position:[4.0,.38,3.5]},
];
const BY_ID=Object.fromEntries(LOCATIONS.map(l=>[l.id,l])) as Record<string,Location>;
const EDGES:[string,string,number][]=[
 ["camp","haven",-.25],["camp","frozen",.2],["haven","frozen",-.28],["haven","pirate",.28],["frozen","ruins",-.16],["ruins","forest",.22],["ruins","oasis",-.18],["oasis","temple",.2],["oasis","city",-.18],["forest","city",.12],["forest","pirate",-.24],["forest","port",.2],["city","volcano",-.2],["city","monument",.18],["pirate","port",-.18],["port","monument",.12],["volcano","monument",-.12],["temple","volcano",.18]
];
const ADJ=(()=>{const m:Record<string,string[]>={};LOCATIONS.forEach(l=>m[l.id]=[]);EDGES.forEach(([a,b])=>{m[a].push(b);m[b].push(a)});return m})();
const DISCOVERIES:Discovery[]=[
 {name:"Astrolabe of Qamar",glory:3,requirement:{knowledge:2,influence:1}},
 {name:"Jade Sun Disc",glory:4,requirement:{relics:2,knowledge:1}},
 {name:"Royal Cartographer's Atlas",glory:3,requirement:{knowledge:2,influence:1}},
 {name:"Frozen Mammoth Relic",glory:4,requirement:{relics:2,knowledge:1}},
 {name:"Crown of the Golden City",glory:5,requirement:{influence:2,relics:1}},
 {name:"Pirate Captain's Log",glory:3,requirement:{relics:1,knowledge:1,influence:1}},
];

function reachableWithin(start:string,steps:number){const dist:Record<string,number>={[start]:0};const q=[start];while(q.length){const a=q.shift()!;for(const b of ADJ[a])if(dist[b]===undefined){dist[b]=dist[a]+1;q.push(b)}}return Object.keys(dist).filter(id=>id!==start&&dist[id]<=steps)}
function shortestPath(start:string,end:string){const prev:Record<string,string|undefined>={[start]:undefined};const q=[start];while(q.length){const a=q.shift()!;if(a===end)break;for(const b of ADJ[a])if(!(b in prev)){prev[b]=a;q.push(b)}}if(!(end in prev))return [start];const out=[end];let p=prev[end];while(p){out.push(p);p=prev[p]}return out.reverse()}

export default function Discovery3DFull(){
 const [players,setPlayers]=useState<Explorer[]>([
  {name:"Red Explorer",colour:"red",location:"camp",influence:1,knowledge:1,relics:0,glory:0,discoveries:[]},
  {name:"Blue Explorer",colour:"blue",location:"camp",influence:1,knowledge:1,relics:0,glory:0,discoveries:[]},
  {name:"Green Explorer",colour:"green",location:"camp",influence:1,knowledge:1,relics:0,glory:0,discoveries:[]},
  {name:"Amber Explorer",colour:"amber",location:"camp",influence:1,knowledge:1,relics:0,glory:0,discoveries:[]},
 ]);
 const [active,setActive]=useState(0),[roll,setRoll]=useState<number|null>(null),[reachable,setReachable]=useState<string[]>([]),[selected,setSelected]=useState("camp"),[routes,setRoutes]=useState<Record<number,string[]>>({0:["camp"],1:["camp"],2:["camp"],3:["camp"]}),[message,setMessage]=useState("Roll the die to begin your expedition."),[winner,setWinner]=useState<string|null>(null),[card,setCard]=useState<string|null>(null);
 const player=players[active];
 function rollResult(v:number){setRoll(v);const ids=reachableWithin(player.location,v).filter(id=>id!=="monument"||canEnterMonument(player));setReachable(ids);setMessage(`Rolled ${v}. Choose any glowing destination within ${v} travel point${v===1?"":"s"}.`)}
 function canEnterMonument(p:Explorer){return p.discoveries.length>=3&&p.influence>=3&&p.knowledge>=3&&p.relics>=2}
 function visit(id:string){if(!reachable.includes(id))return;const path=shortestPath(player.location,id);setRoutes(r=>({...r,[active]:path}));setSelected(id);setReachable([]);setRoll(null);setPlayers(ps=>ps.map((p,i)=>i===active?{...p,location:id}:p));window.setTimeout(()=>resolve(id),Math.max(700,path.length*420));}
 function resolve(id:string){const loc=BY_ID[id];setPlayers(ps=>ps.map((p,i)=>{if(i!==active)return p;let n={...p};if(loc.reward)n={...n,[loc.reward]:n[loc.reward]+2};if(loc.kind==="volcano"){if(Math.random()<.5)n={...n,glory:n.glory+2};else n={...n,influence:Math.max(0,n.influence-1)}}if(loc.kind==="port"){const key:(Resource)[]=["influence","knowledge","relics"];const poorest=key.sort((a,b)=>n[a]-n[b])[0];n={...n,[poorest]:n[poorest]+1}}return n}));
  if(loc.kind==="temple"||loc.kind==="city")drawDiscovery();
  else if(loc.kind==="volcano")setCard("Volcanic Gamble — 50% chance of +2 Glory, otherwise lose 1 Influence.");
  else if(loc.kind==="monument"&&canEnterMonument({...player,location:id})){setWinner(player.name);return}
  else setCard(loc.reward?`${loc.name}: gain 2 ${loc.reward}.`:`${loc.name}: expedition action resolved.`);
  setMessage("Resolve the destination, then end your turn.");
 }
 function drawDiscovery(){const d=DISCOVERIES[Math.floor(Math.random()*DISCOVERIES.length)];const ok=Object.entries(d.requirement).every(([k,v])=>player[k as Resource]>=v!);if(ok){setPlayers(ps=>ps.map((p,i)=>i===active?{...p,discoveries:[...p.discoveries,d.name],glory:p.glory+d.glory}:p));setCard(`${d.name} acquired — +${d.glory} Glory.`)}else setCard(`${d.name} discovered, but you lack the resources to claim it.`)}
 function endTurn(){const n=(active+1)%players.length;setActive(n);setRoll(null);setReachable([]);setCard(null);setMessage(`${players[n].name}: roll the die.`)}
 return <main className={styles.page}>
  <header className={styles.header}><div><small>FULL BOARD PROTOTYPE</small><h1>DISCOVERY LEGENDS</h1></div><div className={styles.status}>{players.map((p,i)=><button key={p.colour} onClick={()=>setActive(i)} className={i===active?styles.active:""}><i style={{background:COLOUR[p.colour]}}/>{p.name}<span>★ {p.glory}</span></button>)}</div></header>
  <section className={styles.boardShell}>
   <Canvas orthographic shadows dpr={[1,1.55]} camera={{position:[13,11,13],zoom:48,near:.1,far:100}}>
    <CameraRig/><fog attach="fog" args={["#102934",23,36]}/><color attach="background" args={["#102934"]}/><ambientLight intensity={.75}/><hemisphereLight args={["#dceeff","#51412c",1.3]}/><directionalLight castShadow position={[-8,14,9]} intensity={3.8} shadow-mapSize-width={2048} shadow-mapSize-height={2048}/><directionalLight position={[8,7,-6]} intensity={.7} color="#ffd79c"/>
    <Tabletop/><Water/>{EDGES.map(([a,b,bend])=><Causeway key={`${a}-${b}`} a={BY_ID[a].position} b={BY_ID[b].position} bend={bend}/>) }
    {LOCATIONS.map(l=><Destination key={l.id} location={l} selected={selected===l.id} reachable={reachable.includes(l.id)} onSelect={()=>visit(l.id)}/>)}
    {players.map((p,i)=><ExplorerPiece key={p.colour} colour={p.colour} route={routes[i]||[p.location]} lane={i}/>) }
    <ContactShadows position={[0,.03,0]} opacity={.42} scale={22} blur={2.7} far={10}/>
   </Canvas>
   {roll!==null&&<DiceResultIcon value={roll}/>}<aside className={styles.locationCard}><small>DESTINATION</small><strong>{BY_ID[selected].name}</strong><span>{message}</span></aside>
   <div className={styles.diceDock}><Dice3D onResult={rollResult}/></div>
   <div className={styles.turnPanel}><strong>{player.name}</strong><div><span>Influence <b>{player.influence}</b></span><span>Knowledge <b>{player.knowledge}</b></span><span>Relics <b>{player.relics}</b></span><span>Glory <b>{player.glory}</b></span></div><small>{player.discoveries.length} Discoveries</small><button onClick={endTurn}>END TURN</button></div>
   {card&&<div className={styles.card}><small>EXPEDITION RESULT</small><strong>{card}</strong><button onClick={()=>setCard(null)}>CONTINUE</button></div>}
   {winner&&<div className={styles.card}><small>LEGEND MADE</small><strong>{winner} reaches the Great Monument!</strong></div>}
  </section>
 </main>
}

function CameraRig(){const {camera}=useThree();useEffect(()=>{camera.lookAt(0,.1,0);camera.updateProjectionMatrix()},[camera]);return null}
function Tabletop(){return <group><mesh receiveShadow position={[0,-.56,0]}><boxGeometry args={[17,.86,12.3]}/><meshStandardMaterial color="#302116" roughness={.88}/></mesh><mesh receiveShadow position={[0,-.1,0]}><boxGeometry args={[16.55,.08,11.85]}/><meshStandardMaterial color="#8c6c3b" metalness={.15} roughness={.55}/></mesh></group>}
function Water(){const ref=useRef<THREE.Mesh>(null);useFrame(({clock})=>{if(ref.current)ref.current.position.y=-.05+Math.sin(clock.elapsedTime*.55)*.012});return <mesh ref={ref} receiveShadow rotation={[-Math.PI/2,0,0]} position={[0,-.05,0]}><planeGeometry args={[16.35,11.65,20,16]}/><meshPhysicalMaterial color="#147b91" roughness={.18} metalness={.12} clearcoat={.7} clearcoatRoughness={.16}/></mesh>}
function Causeway({a,b,bend}:{a:[number,number,number];b:[number,number,number];bend:number}){const curve=useMemo(()=>{const A=new THREE.Vector3(...a),B=new THREE.Vector3(...b),mid=A.clone().lerp(B,.5),dir=B.clone().sub(A),perp=new THREE.Vector3(-dir.z,0,dir.x).normalize().multiplyScalar(bend);A.y=.22;B.y=.22;mid.add(perp);mid.y=.22;return new THREE.CatmullRomCurve3([A,mid,B])},[a,b,bend]);const points=useMemo(()=>curve.getSpacedPoints(12),[curve]);return <group><mesh castShadow receiveShadow><tubeGeometry args={[curve,32,.12,8,false]}/><meshStandardMaterial color="#74654f" roughness={.95}/></mesh>{points.map((p,i)=>{const t=curve.getTangent(i/(points.length-1));const a=Math.atan2(t.z,t.x);return <mesh key={i} castShadow position={[p.x,p.y+.07,p.z]} rotation={[0,-a,0]}><boxGeometry args={[.42,.09,.68]}/><meshStandardMaterial color={i%2?"#d7c8a4":"#c5b48e"} roughness={.92}/></mesh>})}</group>}
function Destination({location,selected,reachable,onSelect}:{location:Location;selected:boolean;reachable:boolean;onSelect:()=>void}){const kind=location.kind;const colour=kind==="frozen"?"#d5e6e5":kind==="oasis"?"#d5b45c":kind==="volcano"?"#6b4030":kind==="city"||kind==="monument"?"#7b9253":kind==="pirate"?"#6e7650":"#708f53";return <group position={location.position} onClick={(e)=>{e.stopPropagation();onSelect()}}>
 <mesh castShadow receiveShadow position={[0,-.3,0]} scale={[1.35,.46,1.05]}><cylinderGeometry args={[1,1.14,1,18]}/><meshStandardMaterial color="#4b3c28" roughness={1}/></mesh><mesh castShadow receiveShadow position={[0,-.03,0]} scale={[1.28,.26,1]}><cylinderGeometry args={[1,1.03,1,18]}/><meshStandardMaterial color={colour} roughness={.96}/></mesh>{reachable&&<mesh rotation={[-Math.PI/2,0,0]} position={[0,.12,0]}><ringGeometry args={[1.08,1.35,36]}/><meshBasicMaterial color="#ffd86b" transparent opacity={.9}/></mesh>}<Model kind={kind}/><Html center position={[0,1.42,0]} transform distanceFactor={7.8}><div className={`${styles.worldLabel} ${selected?styles.worldLabelSelected:""}`}>{location.name}</div></Html></group>}
function Model({kind}:{kind:Kind}){if(kind==="frozen")return <group>{[-.5,0,.5].map((x,i)=><mesh key={i} castShadow position={[x,.48,(i-1)*.12]}><coneGeometry args={[.42,1.25-i*.1,6]}/><meshStandardMaterial color={i==1?"#f7fbfa":"#dce9e8"}/></mesh>)}</group>;if(kind==="ruins"||kind==="temple")return <group>{[-.5,0,.5].map((x,i)=><mesh key={i} castShadow position={[x,.55,0]}><cylinderGeometry args={[.1,.13,.95,10]}/><meshStandardMaterial color="#c9ba8e"/></mesh>)}<mesh castShadow position={[0,1.02,0]}><boxGeometry args={[1.35,.15,.32]}/><meshStandardMaterial color="#b7a97e"/></mesh></group>;if(kind==="oasis")return <group><mesh rotation={[-Math.PI/2,0,0]} position={[0,.24,0]}><circleGeometry args={[.45,24]}/><meshStandardMaterial color="#2c91a0"/></mesh><Palm position={[-.55,.1,.15]}/><Palm position={[.58,.1,-.15]}/></group>;if(kind==="volcano")return <group><mesh castShadow position={[0,.48,0]}><coneGeometry args={[.72,1.25,9]}/><meshStandardMaterial color="#5a3c31"/></mesh><mesh position={[0,1.04,0]} rotation={[-Math.PI/2,0,0]}><ringGeometry args={[.12,.27,20]}/><meshBasicMaterial color="#ef6d2f"/></mesh></group>;if(kind==="city"||kind==="monument")return <group>{[-.5,0,.5].map((x,i)=><group key={i} position={[x,.2,0]}><mesh castShadow position={[0,.32,0]}><boxGeometry args={[.48,.65,.48]}/><meshStandardMaterial color="#c59a45" metalness={.2}/></mesh><mesh castShadow position={[0,.73,0]}><sphereGeometry args={[.3,18,9,0,Math.PI*2,0,Math.PI/2]}/><meshStandardMaterial color="#e0b24b" metalness={.25}/></mesh></group>)}</group>;if(kind==="pirate"||kind==="haven"||kind==="port")return <group><mesh castShadow position={[0,.38,0]}><boxGeometry args={[1.0,.5,.65]}/><meshStandardMaterial color="#8a6240"/></mesh><mesh castShadow position={[0,.72,0]} rotation={[0,Math.PI/4,0]}><coneGeometry args={[.72,.45,4]}/><meshStandardMaterial color="#6f452d"/></mesh></group>;if(kind==="forest")return <group>{[[-.55,.1,.15],[0,.1,-.25],[.55,.1,.1]].map((p,i)=><Pine key={i} position={p as [number,number,number]}/>)}</group>;return <group><mesh castShadow position={[0,.38,0]}><coneGeometry args={[.55,.9,4]}/><meshStandardMaterial color="#dec98e"/></mesh></group>}
function Palm({position}:{position:[number,number,number]}){return <group position={position}><mesh castShadow position={[0,.42,0]}><cylinderGeometry args={[.06,.1,.82,8]}/><meshStandardMaterial color="#76522e"/></mesh>{[0,1.57,3.14,4.71].map((r,i)=><mesh key={i} castShadow position={[0,.88,0]} rotation={[0,r,-.55]}><coneGeometry args={[.14,.68,5]}/><meshStandardMaterial color="#3d7742"/></mesh>)}</group>}
function Pine({position}:{position:[number,number,number]}){return <group position={position}><mesh castShadow position={[0,.25,0]}><cylinderGeometry args={[.05,.08,.5,8]}/><meshStandardMaterial color="#5b432b"/></mesh><mesh castShadow position={[0,.68,0]}><coneGeometry args={[.28,.75,7]}/><meshStandardMaterial color="#2c5e45"/></mesh></group>}
function ExplorerPiece({colour,route,lane}:{colour:Colour;route:string[];lane:number}){const group=useRef<THREE.Group>(null);const routeRef=useRef<string[]>(route);const index=useRef(0);useEffect(()=>{routeRef.current=route;index.current=0},[route]);useFrame((_,delta)=>{if(!group.current)return;const ids=routeRef.current;const next=ids[Math.min(index.current+1,ids.length-1)];const target=new THREE.Vector3(...BY_ID[next].position).add(new THREE.Vector3((lane-1.5)*.16,.56,(lane%2?1:-1)*.14));group.current.position.lerp(target,1-Math.pow(.001,delta));if(group.current.position.distanceTo(target)<.08&&index.current<ids.length-1)index.current++});const start=BY_ID[route[0]||"camp"].position;return <group ref={group} position={[start[0],.56,start[2]]}><mesh castShadow><cylinderGeometry args={[.27,.31,.12,24]}/><meshStandardMaterial color={COLOUR[colour]} metalness={.3}/></mesh><mesh castShadow position={[0,.42,0]}><capsuleGeometry args={[.15,.36,5,10]}/><meshStandardMaterial color={COLOUR[colour]}/></mesh><mesh castShadow position={[0,.75,0]}><sphereGeometry args={[.15,16,10]}/><meshStandardMaterial color="#d7b18a"/></mesh></group>}
