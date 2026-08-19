"use client";

import {Canvas,useFrame,useThree} from "@react-three/fiber";
import {ContactShadows,Html} from "@react-three/drei";
import {useEffect,useMemo,useRef,useState} from "react";
import * as THREE from "three";
import Dice3D from "./Dice3D";
import styles from "./Discovery3DPrototype.module.css";

type ExplorerColour="red"|"blue"|"green"|"amber";
type LocationId="camp"|"frozen"|"ruins"|"oasis"|"golden";
type Location={id:LocationId;name:string;position:[number,number,number];kind:"camp"|"frozen"|"ruins"|"oasis"|"golden"};

const LOCATIONS:Location[]=[
 {id:"camp",name:"Expedition Camp",position:[0,.34,0],kind:"camp"},
 {id:"frozen",name:"Frozen Wastes",position:[-4.2,.35,-2.4],kind:"frozen"},
 {id:"ruins",name:"Ancient Ruins",position:[-2.0,.35,2.8],kind:"ruins"},
 {id:"oasis",name:"Desert Oasis",position:[2.3,.35,2.7],kind:"oasis"},
 {id:"golden",name:"Golden City",position:[4.4,.35,-1.8],kind:"golden"},
];
const BY_ID=Object.fromEntries(LOCATIONS.map(l=>[l.id,l])) as Record<LocationId,Location>;
const CONNECTIONS:[LocationId,LocationId][]=[["camp","frozen"],["camp","ruins"],["camp","oasis"],["camp","golden"],["ruins","oasis"]];
const COLOURS:Record<ExplorerColour,string>={red:"#b63a2d",blue:"#2d67b6",green:"#4f8f4d",amber:"#c58a2d"};

export default function Discovery3DPrototype(){
 const [active,setActive]=useState<ExplorerColour>("red");
 const [positions,setPositions]=useState<Record<ExplorerColour,LocationId>>({red:"camp",blue:"camp",green:"camp",amber:"camp"});
 const [targets,setTargets]=useState<Record<ExplorerColour,LocationId>>({red:"camp",blue:"camp",green:"camp",amber:"camp"});
 const [selected,setSelected]=useState<LocationId>("camp");
 const move=(id:LocationId)=>{setSelected(id);setTargets(v=>({...v,[active]:id}));setPositions(v=>({...v,[active]:id}));};
 return <main className={styles.page}>
   <header className={styles.header}>
     <div><small>VERTICAL SLICE</small><h1>DISCOVERY LEGENDS</h1></div>
     <p>Isometric board-world prototype</p>
     <div className={styles.playerButtons}>{(["red","blue","green","amber"] as ExplorerColour[]).map(c=><button key={c} onClick={()=>setActive(c)} className={active===c?styles.active:""}><i style={{background:COLOURS[c]}}/>{c}</button>)}</div>
   </header>
   <section className={styles.boardShell}>
     <Canvas orthographic shadows dpr={[1,1.6]} camera={{position:[11,10,11],zoom:60,near:.1,far:100}}>
       <CameraRig/>
       <color attach="background" args={["#102b35"]}/>
       <ambientLight intensity={1.05}/>
       <hemisphereLight args={["#d8ecff","#42351f",1.2]}/>
       <directionalLight castShadow position={[-6,12,8]} intensity={3.1} shadow-mapSize-width={2048} shadow-mapSize-height={2048}/>
       <BoardWorld onSelect={move} selected={selected}/>
       {(["red","blue","green","amber"] as ExplorerColour[]).map((c,i)=><Explorer key={c} colour={c} target={targets[c]} lane={i}/>) }
       <ContactShadows position={[0,.03,0]} opacity={.34} scale={18} blur={2.8} far={8}/>
     </Canvas>
     <aside className={styles.locationCard}><small>SELECTED DESTINATION</small><strong>{BY_ID[selected].name}</strong><span>Tap any 3D destination to send the active explorer there.</span></aside>
     <div className={styles.diceDock}><Dice3D onResult={()=>{}}/></div>
   </section>
 </main>;
}

function CameraRig(){const {camera}=useThree();useEffect(()=>{camera.lookAt(0,0,0);camera.updateProjectionMatrix()},[camera]);return null}

function BoardWorld({onSelect,selected}:{onSelect:(id:LocationId)=>void;selected:LocationId}){
 return <group>
   <Tabletop/>
   <Water/>
   {CONNECTIONS.map(([a,b])=><Causeway key={`${a}-${b}`} a={BY_ID[a].position} b={BY_ID[b].position}/>) }
   <Camp location={BY_ID.camp} onSelect={onSelect} selected={selected==="camp"}/>
   <Frozen location={BY_ID.frozen} onSelect={onSelect} selected={selected==="frozen"}/>
   <Ruins location={BY_ID.ruins} onSelect={onSelect} selected={selected==="ruins"}/>
   <Oasis location={BY_ID.oasis} onSelect={onSelect} selected={selected==="oasis"}/>
   <Golden location={BY_ID.golden} onSelect={onSelect} selected={selected==="golden"}/>
 </group>;
}

function Tabletop(){return <mesh receiveShadow position={[0,-.46,0]}><boxGeometry args={[13.5,.7,10]}/><meshStandardMaterial color="#372719" roughness={.82}/></mesh>}
function Water(){
 const ref=useRef<THREE.Mesh>(null);useFrame(({clock})=>{if(ref.current)ref.current.rotation.z=Math.sin(clock.elapsedTime*.12)*.006});
 return <mesh ref={ref} receiveShadow rotation={[-Math.PI/2,0,0]} position={[0,-.08,0]}><planeGeometry args={[13,9,1,1]}/><meshPhysicalMaterial color="#176477" roughness={.28} metalness={.08} clearcoat={.42} clearcoatRoughness={.2}/></mesh>
}
function Causeway({a,b}:{a:[number,number,number];b:[number,number,number]}){
 const A=new THREE.Vector3(...a),B=new THREE.Vector3(...b);const distance=A.distanceTo(B);const steps=Math.max(5,Math.floor(distance/.42));
 return <group>{Array.from({length:steps+1},(_,i)=>{const t=i/steps;const p=A.clone().lerp(B,t);const next=A.clone().lerp(B,Math.min(1,t+.01));const ang=Math.atan2(next.z-p.z,next.x-p.x);return <mesh key={i} castShadow receiveShadow position={[p.x,.23,p.z]} rotation={[0,-ang,0]}><boxGeometry args={[.34,.12,.72]}/><meshStandardMaterial color={i%2?"#c5b38b":"#d9c59c"} roughness={.9}/></mesh>})}</group>
}

function Island({position,scale=[1.8,.35,1.45],colour="#5f833c",children,onClick}:{position:[number,number,number];scale?:[number,number,number];colour?:string;children:React.ReactNode;onClick?:()=>void}){
 return <group position={position} onClick={(e)=>{e.stopPropagation();onClick?.()}}>
   <mesh castShadow receiveShadow position={[0,-.18,0]} scale={scale}><cylinderGeometry args={[1,1.13,1,32]}/><meshStandardMaterial color="#473a24" roughness={1}/></mesh>
   <mesh castShadow receiveShadow scale={[scale[0]*.96,.2,scale[2]*.96]}><cylinderGeometry args={[1,1.02,1,32]}/><meshStandardMaterial color={colour} roughness={.94}/></mesh>
   {children}
 </group>
}
function LocationLabel({name,selected}:{name:string;selected:boolean}){return <Html center position={[0,1.25,0]} transform distanceFactor={9}><div className={`${styles.worldLabel} ${selected?styles.worldLabelSelected:""}`}>{name}</div></Html>}
function Marker({selected}:{selected:boolean}){return <mesh castShadow position={[0,.34,0]}><cylinderGeometry args={[.36,.42,.12,32]}/><meshStandardMaterial color={selected?"#f4d06f":"#1a2828"} metalness={.35} roughness={.42}/></mesh>}

function Camp({location,onSelect,selected}:{location:Location;onSelect:(id:LocationId)=>void;selected:boolean}){return <Island position={location.position} scale={[1.65,.34,1.3]} colour="#5b8744" onClick={()=>onSelect(location.id)}><Marker selected={selected}/><mesh castShadow position={[-.45,.35,.1]}><coneGeometry args={[.52,.82,4]}/><meshStandardMaterial color="#d7c58b" roughness={.92}/></mesh><mesh castShadow position={[.45,.28,-.12]}><boxGeometry args={[.7,.5,.55]}/><meshStandardMaterial color="#7f5733"/></mesh><LocationLabel name={location.name} selected={selected}/></Island>}
function Frozen({location,onSelect,selected}:{location:Location;onSelect:(id:LocationId)=>void;selected:boolean}){return <Island position={location.position} scale={[1.65,.38,1.35]} colour="#b7ced1" onClick={()=>onSelect(location.id)}><Marker selected={selected}/>{[[-.55,.3,.15],[.05,.38,-.25],[.58,.26,.16]].map((p,i)=><mesh key={i} castShadow position={p as [number,number,number]}><coneGeometry args={[.52-i*.07,1.25-i*.12,5]}/><meshStandardMaterial color={i===1?"#f4f6f0":"#dce7e6"}/></mesh>)}<LocationLabel name={location.name} selected={selected}/></Island>}
function Ruins({location,onSelect,selected}:{location:Location;onSelect:(id:LocationId)=>void;selected:boolean}){return <Island position={location.position} colour="#66854c" onClick={()=>onSelect(location.id)}><Marker selected={selected}/>{[-.55,0,.55].map((x,i)=><group key={i} position={[x,.22,(i-1)*.08]}><mesh castShadow><cylinderGeometry args={[.13,.15,1.05,12]}/><meshStandardMaterial color="#c8ba8e" roughness={.9}/></mesh><mesh castShadow position={[0,.58,0]}><boxGeometry args={[.34,.12,.34]}/><meshStandardMaterial color="#d4c79c"/></mesh></group>)}<mesh castShadow position={[0,.7,0]}><boxGeometry args={[1.6,.16,.36]}/><meshStandardMaterial color="#b9aa7e"/></mesh><LocationLabel name={location.name} selected={selected}/></Island>}
function Oasis({location,onSelect,selected}:{location:Location;onSelect:(id:LocationId)=>void;selected:boolean}){return <Island position={location.position} scale={[1.8,.32,1.3]} colour="#c7a85b" onClick={()=>onSelect(location.id)}><Marker selected={selected}/><mesh position={[0,.23,0]} rotation={[-Math.PI/2,0,0]}><circleGeometry args={[.55,24]}/><meshStandardMaterial color="#2d8995" metalness={.08} roughness={.25}/></mesh>{[[-.7,.15,.2],[.72,.12,-.15]].map((p,i)=><Palm key={i} position={p as [number,number,number]}/>)}<mesh castShadow position={[0,.34,.58]}><coneGeometry args={[.42,.7,4]}/><meshStandardMaterial color="#e2c074"/></mesh><LocationLabel name={location.name} selected={selected}/></Island>}
function Palm({position}:{position:[number,number,number]}){return <group position={position}><mesh castShadow position={[0,.42,0]}><cylinderGeometry args={[.07,.1,.85,10]}/><meshStandardMaterial color="#79542f"/></mesh>{[0,Math.PI/2,Math.PI,Math.PI*1.5].map((r,i)=><mesh key={i} castShadow position={[0,.88,0]} rotation={[0,r,-.55]}><coneGeometry args={[.15,.72,5]}/><meshStandardMaterial color="#3f743f"/></mesh>)}</group>}
function Golden({location,onSelect,selected}:{location:Location;onSelect:(id:LocationId)=>void;selected:boolean}){return <Island position={location.position} scale={[1.8,.36,1.4]} colour="#72884b" onClick={()=>onSelect(location.id)}><Marker selected={selected}/>{[-.55,0,.55].map((x,i)=><group key={i} position={[x,.18,(i-1)*.12]}><mesh castShadow position={[0,.34,0]}><boxGeometry args={[.55,.65,.55]}/><meshStandardMaterial color="#c49a45" metalness={.2}/></mesh><mesh castShadow position={[0,.76,0]}><sphereGeometry args={[.35,18,10,0,Math.PI*2,0,Math.PI/2]}/><meshStandardMaterial color="#e0b44d" metalness={.28}/></mesh></group>)}<LocationLabel name={location.name} selected={selected}/></Island>}

function Explorer({colour,target,lane}:{colour:ExplorerColour;target:LocationId;lane:number}){
 const group=useRef<THREE.Group>(null);const targetPos=useMemo(()=>new THREE.Vector3(...BY_ID[target].position).add(new THREE.Vector3((lane-1.5)*.18,.48,(lane%2?1:-1)*.16)),[target,lane]);
 useFrame((_,delta)=>{if(!group.current)return;group.current.position.lerp(targetPos,1-Math.pow(.001,delta));});
 return <group ref={group} position={[lane*.2-.3,.8,lane%2?.2:-.2]}>
   <mesh castShadow><cylinderGeometry args={[.27,.32,.12,24]}/><meshStandardMaterial color={COLOURS[colour]} metalness={.32} roughness={.4}/></mesh>
   <mesh castShadow position={[0,.38,0]}><capsuleGeometry args={[.16,.38,5,10]}/><meshStandardMaterial color={COLOURS[colour]} roughness={.6}/></mesh>
   <mesh castShadow position={[0,.72,0]}><sphereGeometry args={[.16,18,12]}/><meshStandardMaterial color="#d7b18a"/></mesh>
   <mesh castShadow position={[0,.86,0]}><cylinderGeometry args={[.24,.2,.08,18]}/><meshStandardMaterial color="#4a3825"/></mesh>
 </group>
}
