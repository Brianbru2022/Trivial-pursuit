"use client";

import {Canvas,useFrame,useThree} from "@react-three/fiber";
import {ContactShadows,Html} from "@react-three/drei";
import {useEffect,useMemo,useRef,useState} from "react";
import * as THREE from "three";
import Dice3D,{DiceResultIcon} from "./Dice3D";
import styles from "./Discovery3DPlayable.module.css";

type Colour="red"|"blue"|"green"|"amber";
type Resource="influence"|"knowledge"|"relics";
type Kind="camp"|"frozen"|"ruins"|"oasis"|"temple"|"haven"|"forest"|"city"|"volcano"|"pirate"|"port"|"monument";
type Location={id:string;name:string;kind:Kind;position:[number,number,number];reward?:Resource};
type Explorer={name:string;colour:Colour;location:string;influence:number;knowledge:number;relics:number;glory:number;discoveries:string[]};
type Discovery={name:string;glory:number;requirement:Partial<Record<Resource,number>>};

const COLOUR:Record<Colour,string>={red:"#c44337",blue:"#3a76cf",green:"#579b58",amber:"#d29a35"};
const LOCATIONS:Location[]=[
 {id:"camp",name:"Expedition Camp",kind:"camp",position:[-8.4,.4,3.8]},
 {id:"frozen",name:"Frozen Wastes",kind:"frozen",position:[-6.4,.4,-4.2],reward:"knowledge"},
 {id:"ruins",name:"Ancient Ruins",kind:"ruins",position:[-2.6,.4,-5.1],reward:"relics"},
 {id:"oasis",name:"Desert Oasis",kind:"oasis",position:[2.2,.4,-4.7],reward:"influence"},
 {id:"temple",name:"Lost Temple",kind:"temple",position:[7.2,.4,-3.4],reward:"relics"},
 {id:"haven",name:"Cliff Haven",kind:"haven",position:[-7.2,.4,-.1],reward:"influence"},
 {id:"forest",name:"Enchanted Forest",kind:"forest",position:[-1.5,.4,-.4],reward:"knowledge"},
 {id:"city",name:"Golden City",kind:"city",position:[4.0,.4,-.2],reward:"influence"},
 {id:"volcano",name:"Volcanic Isle",kind:"volcano",position:[7.8,.4,3.6]},
 {id:"pirate",name:"Pirate Cove",kind:"pirate",position:[-5.0,.4,4.8],reward:"relics"},
 {id:"port",name:"Merchant Port",kind:"port",position:[.2,.4,5.0]},
 {id:"monument",name:"The Great Monument",kind:"monument",position:[5.6,.4,5.2]},
];
const BY_ID=Object.fromEntries(LOCATIONS.map(l=>[l.id,l])) as Record<string,Location>;
const EDGES:[string,string,number][]=[
 ["camp","haven",-.4],["camp","pirate",.32],["haven","frozen",-.35],["haven","forest",.35],["frozen","ruins",-.28],["ruins","forest",.32],["ruins","oasis",-.25],["oasis","temple",.3],["oasis","city",-.28],["forest","city",.18],["forest","pirate",-.3],["forest","port",.28],["city","temple",-.2],["city","volcano",.28],["city","monument",-.2],["pirate","port",-.22],["port","monument",.18],["volcano","monument",-.18],["temple","volcano",.25]
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
function shortestPath(start:string,end:string){const prev:Record<string,string|undefined>={[start]:undefined};const q=[start];while(q.length){const a=q.shift()!;if(a===end)break;for(const b of ADJ[a])if(!(b in prev)){prev[b]=a;q.push(b)}}if(!(end in prev))return[start];const out=[end];let p=prev[end];while(p){out.push(p);p=prev[p]}return out.reverse()}

export default function Discovery3DPlayable(){
 const [players,setPlayers]=useState<Explorer[]>([
  {name:"Red Explorer",colour:"red",location:"camp",influence:1,knowledge:1,relics:0,glory:0,discoveries:[]},
  {name:"Blue Explorer",colour:"blue",location:"camp",influence:1,knowledge:1,relics:0,glory:0,discoveries:[]},
  {name:"Green Explorer",colour:"green",location:"camp",influence:1,knowledge:1,relics:0,glory:0,discoveries:[]},
  {name:"Amber Explorer",colour:"amber",location:"camp",influence:1,knowledge:1,relics:0,glory:0,discoveries:[]},
 ]);
 const [active,setActive]=useState(0),[roll,setRoll]=useState<number|null>(null),[reachable,setReachable]=useState<string[]>([]),[selected,setSelected]=useState("camp"),[focus,setFocus]=useState("camp"),[routes,setRoutes]=useState<Record<number,string[]>>({0:["camp"],1:["camp"],2:["camp"],3:["camp"]}),[message,setMessage]=useState("Roll the expedition die."),[winner,setWinner]=useState<string|null>(null),[card,setCard]=useState<string|null>(null),[moving,setMoving]=useState(false);
 const player=players[active];
 const canEnterMonument=(p:Explorer)=>p.discoveries.length>=3&&p.influence>=3&&p.knowledge>=3&&p.relics>=2;
 function applyRoll(v:number){if(moving||card||winner)return;setRoll(v);const ids=reachableWithin(player.location,v).filter(id=>id!=="monument"||canEnterMonument(player));setReachable(ids);setMessage(`Rolled ${v}. Choose any glowing destination within ${v} travel point${v===1?"":"s"}.`)}
 function quickRoll(){applyRoll(Math.floor(Math.random()*6)+1)}
 function visit(id:string){if(!reachable.includes(id)||moving)return;const path=shortestPath(player.location,id);setRoutes(r=>({...r,[active]:path}));setSelected(id);setFocus(id);setReachable([]);setMoving(true);setMessage(`Travelling to ${BY_ID[id].name}…`);const delay=Math.max(900,(path.length-1)*600);window.setTimeout(()=>{setPlayers(ps=>ps.map((p,i)=>i===active?{...p,location:id}:p));setMoving(false);resolve(id)},delay)}
 function resolve(id:string){const loc=BY_ID[id];let resolvedPlayer:Explorer|undefined;setPlayers(ps=>ps.map((p,i)=>{if(i!==active)return p;let n={...p};if(loc.reward)n={...n,[loc.reward]:n[loc.reward]+2};if(loc.kind==="volcano")n=Math.random()<.5?{...n,glory:n.glory+2}:{...n,influence:Math.max(0,n.influence-1)};if(loc.kind==="port"){const keys:Resource[]=["influence","knowledge","relics"];const poorest=[...keys].sort((a,b)=>n[a]-n[b])[0];n={...n,[poorest]:n[poorest]+1}}resolvedPlayer=n;return n}));
  if(loc.kind==="temple"||loc.kind==="city")window.setTimeout(()=>drawDiscovery(),50);
  else if(loc.kind==="volcano")setCard("Volcanic Gamble resolved — gain 2 Glory or lose 1 Influence.");
  else if(loc.kind==="monument"&&resolvedPlayer&&canEnterMonument(resolvedPlayer)){setWinner(resolvedPlayer.name);setCard(`${resolvedPlayer.name} reaches the Great Monument and becomes a legend!`)}
  else setCard(loc.reward?`${loc.name}: gain 2 ${loc.reward}.`:`${loc.name}: expedition action resolved.`);
  setMessage("Resolve the destination, then end your turn.")
 }
 function drawDiscovery(){const current=players[active];const d=DISCOVERIES[Math.floor(Math.random()*DISCOVERIES.length)];const ok=Object.entries(d.requirement).every(([k,v])=>current[k as Resource]>=v!);if(ok){setPlayers(ps=>ps.map((p,i)=>i===active?{...p,discoveries:[...p.discoveries,d.name],glory:p.glory+d.glory}:p));setCard(`${d.name} acquired — +${d.glory} Glory.`)}else setCard(`${d.name} discovered, but you lack the resources to claim it.`)}
 function endTurn(){if(moving)return;const n=(active+1)%players.length;setActive(n);setRoll(null);setReachable([]);setCard(null);setFocus(players[n].location);setSelected(players[n].location);setMessage(`${players[n].name}: roll the die.`)}
 return <main className={styles.page}>
  <header className={styles.header}><div><small>PLAYABLE 3D PROTOTYPE</small><h1>DISCOVERY LEGENDS</h1></div><div className={styles.status}>{players.map((p,i)=><button key={p.colour} onClick={()=>{if(!moving){setActive(i);setFocus(p.location);setSelected(p.location)}}} className={i===active?styles.active:""}><i style={{background:COLOUR[p.colour]}}/>{p.name}<span>★ {p.glory}</span></button>)}</div></header>
  <section className={styles.boardShell}>
   <Canvas orthographic shadows dpr={[1,1.55]} camera={{position:[15,13,15],zoom:41,near:.1,far:120}}>
    <CameraRig focus={focus} moving={moving}/><fog attach="fog" args={["#102934",27,46]}/><color attach="background" args={["#102934"]}/><ambientLight intensity={.72}/><hemisphereLight args={["#dceeff","#51412c",1.35]}/><directionalLight castShadow position={[-10,17,11]} intensity={4.0} shadow-mapSize-width={2048} shadow-mapSize-height={2048}/><directionalLight position={[10,8,-8]} intensity={.75} color="#ffd79c"/>
    <Tabletop/><Water/>{EDGES.map(([a,b,bend])=><Causeway key={`${a}-${b}`} a={BY_ID[a].position} b={BY_ID[b].position} bend={bend}/>) }
    {LOCATIONS.map(l=><Destination key={l.id} location={l} selected={selected===l.id} reachable={reachable.includes(l.id)} onSelect={()=>visit(l.id)}/>)}
    {players.map((p,i)=><ExplorerPiece key={p.colour} colour={p.colour} route={routes[i]||[p.location]} lane={i} active={i===active}/>) }
    <ContactShadows position={[0,.02,0]} opacity={.46} scale={27} blur={2.8} far={12}/>
   </Canvas>
   {roll!==null&&<DiceResultIcon value={roll}/>}<aside className={styles.locationCard}><small>DESTINATION</small><strong>{BY_ID[selected].name}</strong><span>{message}</span></aside>
   <div className={styles.diceDock}><Dice3D onResult={applyRoll}/><button className={styles.rollFallback} onClick={quickRoll}>ROLL DIE</button></div>
   <div className={styles.turnPanel}><strong>{player.name}</strong><div><span>Influence <b>{player.influence}</b></span><span>Knowledge <b>{player.knowledge}</b></span><span>Relics <b>{player.relics}</b></span><span>Glory <b>{player.glory}</b></span></div><small>{player.discoveries.length} Discoveries</small><button onClick={endTurn} disabled={moving}>END TURN</button></div>
   {card&&<div className={styles.card}><small>EXPEDITION RESULT</small><strong>{card}</strong><button onClick={()=>setCard(null)}>CONTINUE</button></div>}
  </section>
 </main>
}

function CameraRig({focus,moving}:{focus:string;moving:boolean}){const {camera}=useThree();const target=useMemo(()=>new THREE.Vector3(...BY_ID[focus].position),[focus]);useFrame((_,delta)=>{const ortho=camera as THREE.OrthographicCamera;const yaw=0.68+THREE.MathUtils.clamp(target.x/25,-.18,.18);const distance=moving?16.5:19.5;const desired=new THREE.Vector3(target.x+Math.sin(yaw)*distance,target.y+(moving?11.5:13.5),target.z+Math.cos(yaw)*distance);camera.position.lerp(desired,1-Math.pow(.002,delta));const look=new THREE.Vector3(target.x,.25,target.z);camera.lookAt(look);const targetZoom=moving?57:49;ortho.zoom=THREE.MathUtils.lerp(ortho.zoom,targetZoom,1-Math.pow(.004,delta));ortho.updateProjectionMatrix()});return null}
function Tabletop(){return <group><mesh receiveShadow position={[0,-.58,0]}><boxGeometry args={[23,.9,16]}/><meshStandardMaterial color="#302116" roughness={.88}/></mesh><mesh receiveShadow position={[0,-.1,0]}><boxGeometry args={[22.5,.08,15.5]}/><meshStandardMaterial color="#8c6c3b" metalness={.15} roughness={.55}/></mesh></group>}
function Water(){const ref=useRef<THREE.Mesh>(null);useFrame(({clock})=>{if(ref.current)ref.current.position.y=-.05+Math.sin(clock.elapsedTime*.55)*.012});return <mesh ref={ref} receiveShadow rotation={[-Math.PI/2,0,0]} position={[0,-.05,0]}><planeGeometry args={[22.3,15.3,24,18]}/><meshPhysicalMaterial color="#147b91" roughness={.18} metalness={.12} clearcoat={.7} clearcoatRoughness={.16}/></mesh>}
function Causeway({a,b,bend}:{a:[number,number,number];b:[number,number,number];bend:number}){const curve=useMemo(()=>{const A=new THREE.Vector3(...a),B=new THREE.Vector3(...b),mid=A.clone().lerp(B,.5),dir=B.clone().sub(A),perp=new THREE.Vector3(-dir.z,0,dir.x).normalize().multiplyScalar(bend);A.y=.22;B.y=.22;mid.add(perp);mid.y=.22;return new THREE.CatmullRomCurve3([A,mid,B])},[a,b,bend]);const points=useMemo(()=>curve.getSpacedPoints(14),[curve]);return <group><mesh castShadow receiveShadow><tubeGeometry args={[curve,36,.13,8,false]}/><meshStandardMaterial color="#74654f" roughness={.95}/></mesh>{points.map((p,i)=>{const t=curve.getTangent(i/(points.length-1));const a=Math.atan2(t.z,t.x);return <mesh key={i} castShadow position={[p.x,p.y+.07,p.z]} rotation={[0,-a,0]}><boxGeometry args={[.44,.09,.72]}/><meshStandardMaterial color={i%2?"#d7c8a4":"#c5b48e"} roughness={.92}/></mesh>})}</group>}
function Destination({location,selected,reachable,onSelect}:{location:Location;selected:boolean;reachable:boolean;onSelect:()=>void}){const kind=location.kind;const colour=kind==="frozen"?"#d5e6e5":kind==="oasis"?"#d5b45c":kind==="volcano"?"#6b4030":kind==="city"||kind==="monument"?"#7b9253":kind==="pirate"?"#6e7650":"#708f53";return <group position={location.position} onClick={(e)=>{e.stopPropagation();onSelect()}}>
 <mesh castShadow receiveShadow position={[0,-.34,0]} scale={[1.55,.52,1.18]}><cylinderGeometry args={[1,1.16,1,18]}/><meshStandardMaterial color="#493b28" roughness={1}/></mesh><mesh castShadow receiveShadow position={[0,-.04,0]} scale={[1.48,.28,1.12]}><cylinderGeometry args={[1,1.03,1,18]}/><meshStandardMaterial color={colour} roughness={.96}/></mesh>{reachable&&<mesh rotation={[-Math.PI/2,0,0]} position={[0,.14,0]}><ringGeometry args={[1.22,1.5,48]}/><meshBasicMaterial color="#7dffb2" transparent opacity={.9}/></mesh>}
 <Model kind={kind}/><Html center transform distanceFactor={10} position={[0,1.7,0]}><div className={`${styles.worldLabel} ${reachable?styles.reachable:""} ${selected?styles.selected:""}`}>{location.name}</div></Html></group>}
function Model({kind}:{kind:Kind}){if(kind==="frozen")return <group>{[-.55,.05,.55].map((x,i)=><mesh key={i} castShadow position={[x,.45,(i-1)*.1]}><coneGeometry args={[.5-i*.04,1.35-i*.1,6]}/><meshStandardMaterial color="#edf5f4"/></mesh>)}</group>;if(kind==="ruins"||kind==="temple")return <group>{[-.5,0,.5].map((x,i)=><mesh key={i} castShadow position={[x,.5,0]}><cylinderGeometry args={[.11,.14,1.1,10]}/><meshStandardMaterial color="#d2c59b"/></mesh>)}<mesh castShadow position={[0,1.05,0]}><boxGeometry args={[1.4,.14,.3]}/><meshStandardMaterial color="#b8aa81"/></mesh></group>;if(kind==="oasis")return <group><mesh position={[0,.23,0]} rotation={[-Math.PI/2,0,0]}><circleGeometry args={[.48,24]}/><meshStandardMaterial color="#2c91a1"/></mesh><Palm position={[-.6,.12,.1]}/><Palm position={[.6,.12,-.1]}/></group>;if(kind==="volcano")return <group><mesh castShadow position={[0,.4,0]}><coneGeometry args={[.72,1.45,8]}/><meshStandardMaterial color="#603c31"/></mesh><mesh position={[0,1.08,0]}><cylinderGeometry args={[.23,.32,.08,18]}/><meshBasicMaterial color="#ff6b31"/></mesh></group>;if(kind==="city"||kind==="monument")return <group>{[-.5,0,.5].map((x,i)=><mesh key={i} castShadow position={[x,.42,(i-1)*.1]}><boxGeometry args={[.5,.75,.5]}/><meshStandardMaterial color="#c59b45"/></mesh>)}<mesh castShadow position={[0,.95,0]}><sphereGeometry args={[.35,18,9,0,Math.PI*2,0,Math.PI/2]}/><meshStandardMaterial color="#deb64d"/></mesh></group>;if(kind==="forest")return <group>{[[-.6,.1,-.25],[0,.1,.25],[.55,.1,-.2]].map((p,i)=><Pine key={i} position={p as [number,number,number]}/>)}</group>;return <group><mesh castShadow position={[0,.38,0]}><boxGeometry args={[.95,.62,.7]}/><meshStandardMaterial color="#a26d43"/></mesh><mesh castShadow position={[0,.78,0]} rotation={[0,Math.PI/4,0]}><coneGeometry args={[.65,.5,4]}/><meshStandardMaterial color="#73472c"/></mesh></group>}
function Palm({position}:{position:[number,number,number]}){return <group position={position}><mesh castShadow position={[0,.35,0]}><cylinderGeometry args={[.055,.08,.7,8]}/><meshStandardMaterial color="#73502d"/></mesh>{[0,Math.PI/2,Math.PI,Math.PI*1.5].map((r,i)=><mesh key={i} castShadow position={[0,.75,0]} rotation={[0,r,-.55]}><coneGeometry args={[.12,.58,5]}/><meshStandardMaterial color="#3f7744"/></mesh>)}</group>}
function Pine({position}:{position:[number,number,number]}){return <group position={position}><mesh castShadow position={[0,.28,0]}><cylinderGeometry args={[.05,.08,.56,8]}/><meshStandardMaterial color="#5a432a"/></mesh><mesh castShadow position={[0,.72,0]}><coneGeometry args={[.3,.78,7]}/><meshStandardMaterial color="#2e6547"/></mesh></group>}
function ExplorerPiece({colour,route,lane,active}:{colour:Colour;route:string[];lane:number;active:boolean}){const group=useRef<THREE.Group>(null),[segment,setSegment]=useState(0);useEffect(()=>setSegment(0),[route]);useFrame((_,delta)=>{if(!group.current)return;const idx=Math.min(segment,route.length-1),next=Math.min(idx+1,route.length-1);const target=new THREE.Vector3(...BY_ID[route[next]].position).add(new THREE.Vector3((lane-1.5)*.25,.7,(lane%2?1:-1)*.22));group.current.position.lerp(target,1-Math.pow(.003,delta));if(group.current.position.distanceTo(target)<.08&&next>idx)setSegment(next)});const start=BY_ID[route[0]].position;return <group ref={group} position={[start[0]+(lane-1.5)*.25,.7,start[2]+(lane%2?1:-1)*.22]}>
 <mesh castShadow><cylinderGeometry args={[active?.34:.29,active?.38:.33,.13,28]}/><meshStandardMaterial color={active?"#f2d06a":"#c4a66c"} metalness={.35}/></mesh><mesh castShadow position={[0,.43,0]}><capsuleGeometry args={[.18,.42,6,10]}/><meshStandardMaterial color={COLOUR[colour]}/></mesh><mesh castShadow position={[0,.78,0]}><sphereGeometry args={[.17,18,12]}/><meshStandardMaterial color="#ddb78e"/></mesh><Html center position={[0,1.23,0]} distanceFactor={11}><div className={styles.pawnTag}>{colour.toUpperCase()}</div></Html></group>}
