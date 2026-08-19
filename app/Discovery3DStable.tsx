"use client";

import {Canvas,useFrame,useThree} from "@react-three/fiber";
import {ContactShadows} from "@react-three/drei";
import {useEffect,useMemo,useRef,useState} from "react";
import * as THREE from "three";
import Dice3D,{DiceResultIcon} from "./Dice3D";
import styles from "./Discovery3DStable.module.css";

type Colour="red"|"blue"|"green"|"amber";
type Kind="camp"|"frozen"|"ruins"|"oasis"|"temple"|"haven"|"forest"|"city"|"volcano"|"pirate"|"port"|"monument";
type Location={id:string;name:string;kind:Kind;position:[number,number,number]};
type Explorer={name:string;colour:Colour;location:string};

const COLOUR:Record<Colour,string>={red:"#c74336",blue:"#3476d1",green:"#56a05a",amber:"#d79a35"};
const LOCATIONS:Location[]=[
 {id:"camp",name:"Expedition Camp",kind:"camp",position:[-7,0,3.7]},
 {id:"haven",name:"Cliff Haven",kind:"haven",position:[-6.4,0,.2]},
 {id:"frozen",name:"Frozen Wastes",kind:"frozen",position:[-5.1,0,-3.2]},
 {id:"ruins",name:"Ancient Ruins",kind:"ruins",position:[-2.2,0,-4.0]},
 {id:"oasis",name:"Desert Oasis",kind:"oasis",position:[1.1,0,-3.7]},
 {id:"temple",name:"Lost Temple",kind:"temple",position:[4.6,0,-2.8]},
 {id:"forest",name:"Enchanted Forest",kind:"forest",position:[-1.1,0,-.3]},
 {id:"city",name:"Golden City",kind:"city",position:[3.0,0,-.1]},
 {id:"volcano",name:"Volcanic Isle",kind:"volcano",position:[5.0,0,3.0]},
 {id:"pirate",name:"Pirate Cove",kind:"pirate",position:[-4.2,0,3.8]},
 {id:"port",name:"Merchant Port",kind:"port",position:[-.2,0,4.1]},
 {id:"monument",name:"The Great Monument",kind:"monument",position:[3.8,0,4.2]},
];
const BY_ID=Object.fromEntries(LOCATIONS.map(l=>[l.id,l])) as Record<string,Location>;
const EDGES:[string,string][]=[
 ["camp","haven"],["camp","pirate"],["haven","frozen"],["haven","forest"],["frozen","ruins"],["ruins","forest"],["ruins","oasis"],["oasis","temple"],["oasis","city"],["forest","city"],["forest","pirate"],["forest","port"],["city","temple"],["city","volcano"],["city","monument"],["pirate","port"],["port","monument"],["volcano","monument"],["temple","volcano"]
];
const ADJ=(()=>{const m:Record<string,string[]>={};LOCATIONS.forEach(l=>m[l.id]=[]);EDGES.forEach(([a,b])=>{m[a].push(b);m[b].push(a)});return m})();

function reachableWithin(start:string,steps:number){const dist:Record<string,number>={[start]:0};const q=[start];while(q.length){const a=q.shift()!;for(const b of ADJ[a])if(dist[b]===undefined){dist[b]=dist[a]+1;q.push(b)}}return Object.keys(dist).filter(id=>id!==start&&dist[id]<=steps)}
function shortestPath(start:string,end:string){const prev:Record<string,string|undefined>={[start]:undefined};const q=[start];while(q.length){const a=q.shift()!;if(a===end)break;for(const b of ADJ[a])if(!(b in prev)){prev[b]=a;q.push(b)}}if(!(end in prev))return[start];const out=[end];let p=prev[end];while(p){out.push(p);p=prev[p]}return out.reverse()}

export default function Discovery3DStable(){
 const [players,setPlayers]=useState<Explorer[]>([
  {name:"Red Explorer",colour:"red",location:"camp"},
  {name:"Blue Explorer",colour:"blue",location:"camp"},
  {name:"Green Explorer",colour:"green",location:"camp"},
  {name:"Amber Explorer",colour:"amber",location:"camp"},
 ]);
 const [active,setActive]=useState(0),[roll,setRoll]=useState<number|null>(null),[reachable,setReachable]=useState<string[]>([]),[selected,setSelected]=useState("camp"),[routes,setRoutes]=useState<Record<number,string[]>>({0:["camp"],1:["camp"],2:["camp"],3:["camp"]}),[message,setMessage]=useState("Roll the die."),[moving,setMoving]=useState(false);
 const player=players[active];
 function applyRoll(v:number){if(moving)return;setRoll(v);setReachable(reachableWithin(player.location,v));setMessage(`Rolled ${v}. Choose a highlighted island.`)}
 function visit(id:string){if(!reachable.includes(id)||moving)return;const path=shortestPath(player.location,id);setRoutes(r=>({...r,[active]:path}));setSelected(id);setReachable([]);setMoving(true);setMessage(`Travelling to ${BY_ID[id].name}...`);setTimeout(()=>{setPlayers(ps=>ps.map((p,i)=>i===active?{...p,location:id}:p));setMoving(false);setMessage(`Arrived at ${BY_ID[id].name}. End turn when ready.`)},Math.max(900,(path.length-1)*550))}
 function endTurn(){if(moving)return;const n=(active+1)%players.length;setActive(n);setRoll(null);setReachable([]);setSelected(players[n].location);setMessage(`${players[n].name}: roll the die.`)}
 return <main className={styles.page}>
  <header className={styles.header}><div><small>STABLE 3D BOARD TEST</small><h1>DISCOVERY LEGENDS</h1></div><div className={styles.players}>{players.map((p,i)=><button key={p.colour} className={i===active?styles.active:""} onClick={()=>{if(!moving){setActive(i);setSelected(p.location)}}><i style={{background:COLOUR[p.colour]}}/>{p.name}</button>)}</div></header>
  <section className={styles.stage}>
   <Canvas orthographic shadows dpr={[1,1.5]} camera={{position:[17,15,17],zoom:37,near:.1,far:100}}>
    <FixedCamera/>
    <color attach="background" args={["#0f2730"]}/>
    <ambientLight intensity={1.25}/><hemisphereLight args={["#dceeff","#4b3a25",1.2]}/><directionalLight castShadow position={[-8,14,10]} intensity={3.4} shadow-mapSize-width={2048} shadow-mapSize-height={2048}/>
    <Board reachable={reachable} selected={selected} onSelect={visit}/>
    {players.map((p,i)=><ExplorerPiece key={p.colour} colour={p.colour} route={routes[i]||[p.location]} lane={i} active={i===active}/>) }
    <ContactShadows position={[0,-.02,0]} opacity={.38} scale={25} blur={2.6} far={10}/>
   </Canvas>
   {roll!==null&&<DiceResultIcon value={roll}/>}<aside className={styles.info}><small>DESTINATION</small><strong>{BY_ID[selected].name}</strong><span>{message}</span></aside>
   <div className={styles.dice}><Dice3D onResult={applyRoll}/></div>
   <button className={styles.endTurn} onClick={endTurn} disabled={moving}>END TURN</button>
  </section>
 </main>
}

function FixedCamera(){const {camera}=useThree();useEffect(()=>{camera.position.set(17,15,17);camera.lookAt(0,0,0);const ortho=camera as THREE.OrthographicCamera;ortho.zoom=37;ortho.updateProjectionMatrix()},[camera]);return null}
function Board({reachable,selected,onSelect}:{reachable:string[];selected:string;onSelect:(id:string)=>void}){return <group>
 <mesh receiveShadow position={[0,-.48,0]}><boxGeometry args={[20,.8,14]}/><meshStandardMaterial color="#352419" roughness={.9}/></mesh>
 <mesh receiveShadow rotation={[-Math.PI/2,0,0]} position={[0,-.05,0]}><planeGeometry args={[19.5,13.5]}/><meshPhysicalMaterial color="#14798d" roughness={.22} clearcoat={.5}/></mesh>
 {EDGES.map(([a,b])=><Bridge key={`${a}-${b}`} a={BY_ID[a].position} b={BY_ID[b].position}/>) }
 {LOCATIONS.map(l=><Island key={l.id} location={l} selected={selected===l.id} reachable={reachable.includes(l.id)} onClick={()=>onSelect(l.id)}/>)}
 </group>}
function Bridge({a,b}:{a:[number,number,number];b:[number,number,number]}){const A=new THREE.Vector3(...a),B=new THREE.Vector3(...b);const d=A.distanceTo(B);const mid=A.clone().lerp(B,.5);const angle=Math.atan2(B.z-A.z,B.x-A.x);return <mesh castShadow receiveShadow position={[mid.x,.16,mid.z]} rotation={[0,-angle,0]}><boxGeometry args={[d,.16,.42]}/><meshStandardMaterial color="#d1c19d" roughness={.95}/></mesh>}
function Island({location,selected,reachable,onClick}:{location:Location;selected:boolean;reachable:boolean;onClick:()=>void}){const c=location.kind==="frozen"?"#dce8e7":location.kind==="oasis"?"#d7bd69":location.kind==="volcano"?"#7b4739":location.kind==="city"||location.kind==="monument"?"#8da45e":"#729257";return <group position={location.position} onClick={(e)=>{e.stopPropagation();onClick()}}>
 <mesh castShadow receiveShadow position={[0,-.25,0]} scale={[1.15,.42,.9]}><cylinderGeometry args={[1,1.14,1,20]}/><meshStandardMaterial color="#4d3d28" roughness={1}/></mesh>
 <mesh castShadow receiveShadow scale={[1.1,.22,.86]}><cylinderGeometry args={[1,1.03,1,20]}/><meshStandardMaterial color={c} roughness={.95}/></mesh>
 {reachable&&<mesh rotation={[-Math.PI/2,0,0]} position={[0,.15,0]}><ringGeometry args={[.9,1.13,40]}/><meshBasicMaterial color="#79ffb0"/></mesh>}
 {selected&&<mesh rotation={[-Math.PI/2,0,0]} position={[0,.17,0]}><ringGeometry args={[1.14,1.24,40]}/><meshBasicMaterial color="#f5cf69"/></mesh>}
 <Model kind={location.kind}/>
 </group>}
function Model({kind}:{kind:Kind}){if(kind==="frozen")return <group>{[-.35,.2,.7].map((x,i)=><mesh key={i} castShadow position={[x,.45,(i-1)*.08]}><coneGeometry args={[.32,1.05,6]}/><meshStandardMaterial color="#f0f5f3"/></mesh>)}</group>;if(kind==="ruins"||kind==="temple")return <group>{[-.4,0,.4].map(x=><mesh key={x} castShadow position={[x,.45,0]}><cylinderGeometry args={[.09,.12,.9,10]}/><meshStandardMaterial color="#d1c49b"/></mesh>)}<mesh castShadow position={[0,.9,0]}><boxGeometry args={[1.1,.12,.25]}/><meshStandardMaterial color="#b9aa81"/></mesh></group>;if(kind==="oasis")return <group><mesh position={[0,.2,0]} rotation={[-Math.PI/2,0,0]}><circleGeometry args={[.38,24]}/><meshStandardMaterial color="#2c91a1"/></mesh><mesh castShadow position={[-.45,.45,0]}><cylinderGeometry args={[.05,.08,.8,8]}/><meshStandardMaterial color="#76522e"/></mesh></group>;if(kind==="volcano")return <mesh castShadow position={[0,.45,0]}><coneGeometry args={[.55,1.15,8]}/><meshStandardMaterial color="#623c31"/></mesh>;if(kind==="city"||kind==="monument")return <group>{[-.38,0,.38].map(x=><mesh key={x} castShadow position={[x,.4,0]}><boxGeometry args={[.4,.7,.4]}/><meshStandardMaterial color="#c59b45"/></mesh>)}<mesh castShadow position={[0,.85,0]}><sphereGeometry args={[.3,16,8,0,Math.PI*2,0,Math.PI/2]}/><meshStandardMaterial color="#ddb44b"/></mesh></group>;if(kind==="forest")return <group>{[-.4,0,.4].map(x=><mesh key={x} castShadow position={[x,.55,0]}><coneGeometry args={[.25,.8,7]}/><meshStandardMaterial color="#2f6848"/></mesh>)}</group>;return <mesh castShadow position={[0,.4,0]}><boxGeometry args={[.75,.6,.6]}/><meshStandardMaterial color="#a36f45"/></mesh>}
function ExplorerPiece({colour,route,lane,active}:{colour:Colour;route:string[];lane:number;active:boolean}){const ref=useRef<THREE.Group>(null),seg=useRef(0);useEffect(()=>{seg.current=0},[route]);useFrame((_,delta)=>{if(!ref.current)return;const idx=Math.min(seg.current,route.length-1),next=Math.min(idx+1,route.length-1);const p=BY_ID[route[next]].position;const target=new THREE.Vector3(p[0]+(lane-1.5)*.2,.65,p[2]+(lane%2?.16:-.16));ref.current.position.lerp(target,1-Math.pow(.002,delta));if(ref.current.position.distanceTo(target)<.06&&next>idx)seg.current=next});const s=BY_ID[route[0]].position;return <group ref={ref} position={[s[0]+(lane-1.5)*.2,.65,s[2]+(lane%2?.16:-.16)]}>
 <mesh castShadow><cylinderGeometry args={[active?.3:.26,active?.34:.3,.12,24]}/><meshStandardMaterial color={active?"#f0cd66":"#c6a76c"}/></mesh><mesh castShadow position={[0,.38,0]}><capsuleGeometry args={[.15,.34,5,10]}/><meshStandardMaterial color={COLOUR[colour]}/></mesh><mesh castShadow position={[0,.7,0]}><sphereGeometry args={[.15,16,10]}/><meshStandardMaterial color="#ddb78f"/></mesh></group>}
