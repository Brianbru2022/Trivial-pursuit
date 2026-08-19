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
 {id:"camp",name:"Expedition Camp",position:[0,.38,.1],kind:"camp"},
 {id:"frozen",name:"Frozen Wastes",position:[-4.1,.38,-2.55],kind:"frozen"},
 {id:"ruins",name:"Ancient Ruins",position:[-2.75,.38,2.45],kind:"ruins"},
 {id:"oasis",name:"Desert Oasis",position:[2.15,.38,2.55],kind:"oasis"},
 {id:"golden",name:"Golden City",position:[4.25,.38,-1.75],kind:"golden"},
];
const BY_ID=Object.fromEntries(LOCATIONS.map(l=>[l.id,l])) as Record<LocationId,Location>;
const CONNECTIONS:[LocationId,LocationId,number][]=[
 ["camp","frozen",-.55],["camp","ruins",.52],["camp","oasis",-.34],["camp","golden",.45],["ruins","oasis",.28]
];
const COLOURS:Record<ExplorerColour,string>={red:"#b83d32",blue:"#326fc5",green:"#4f9251",amber:"#c99231"};

export default function Discovery3DPrototype(){
 const [active,setActive]=useState<ExplorerColour>("red");
 const [targets,setTargets]=useState<Record<ExplorerColour,LocationId>>({red:"camp",blue:"camp",green:"camp",amber:"camp"});
 const [selected,setSelected]=useState<LocationId>("camp");
 const move=(id:LocationId)=>{setSelected(id);setTargets(v=>({...v,[active]:id}));};
 return <main className={styles.page}>
   <header className={styles.header}>
     <div><small>3D BOARD-WORLD STUDY</small><h1>DISCOVERY LEGENDS</h1></div>
     <p>Premium tabletop art-direction slice</p>
     <div className={styles.playerButtons}>{(["red","blue","green","amber"] as ExplorerColour[]).map(c=><button key={c} onClick={()=>setActive(c)} className={active===c?styles.active:""}><i style={{background:COLOURS[c]}}/>{c}</button>)}</div>
   </header>
   <section className={styles.boardShell}>
     <Canvas orthographic shadows dpr={[1,1.7]} camera={{position:[11.5,9.5,11.5],zoom:62,near:.1,far:100}}>
       <CameraRig/>
       <fog attach="fog" args={["#0f2730",18,31]}/>
       <color attach="background" args={["#102a35"]}/>
       <ambientLight intensity={.8}/>
       <hemisphereLight args={["#dcecff","#55442b",1.35]}/>
       <directionalLight castShadow position={[-7,13,8]} intensity={3.7} shadow-mapSize-width={2048} shadow-mapSize-height={2048} shadow-bias={-.0003}/>
       <directionalLight position={[7,7,-5]} intensity={.8} color="#ffd99a"/>
       <BoardWorld onSelect={move} selected={selected}/>
       {(["red","blue","green","amber"] as ExplorerColour[]).map((c,i)=><Explorer key={c} colour={c} target={targets[c]} lane={i}/>) }
       <ContactShadows position={[0,.03,0]} opacity={.48} scale={19} blur={2.7} far={9}/>
     </Canvas>
     <aside className={styles.locationCard}><small>DESTINATION</small><strong>{BY_ID[selected].name}</strong><span>Tap a location to send the selected explorer across the board.</span></aside>
     <div className={styles.diceDock}><Dice3D onResult={()=>{}}/></div>
   </section>
 </main>;
}

function CameraRig(){const {camera}=useThree();useEffect(()=>{camera.lookAt(0,.15,0);camera.updateProjectionMatrix()},[camera]);return null}

function BoardWorld({onSelect,selected}:{onSelect:(id:LocationId)=>void;selected:LocationId}){
 return <group>
   <Tabletop/>
   <Water/>
   <WaveGlints/>
   {CONNECTIONS.map(([a,b,bend])=><Causeway key={`${a}-${b}`} a={BY_ID[a].position} b={BY_ID[b].position} bend={bend}/>) }
   <Camp location={BY_ID.camp} onSelect={onSelect} selected={selected==="camp"}/>
   <Frozen location={BY_ID.frozen} onSelect={onSelect} selected={selected==="frozen"}/>
   <Ruins location={BY_ID.ruins} onSelect={onSelect} selected={selected==="ruins"}/>
   <Oasis location={BY_ID.oasis} onSelect={onSelect} selected={selected==="oasis"}/>
   <Golden location={BY_ID.golden} onSelect={onSelect} selected={selected==="golden"}/>
 </group>;
}

function Tabletop(){return <group><mesh receiveShadow position={[0,-.53,0]}><boxGeometry args={[14.3,.82,10.5]}/><meshStandardMaterial color="#302116" roughness={.87}/></mesh><mesh receiveShadow position={[0,-.09,0]}><boxGeometry args={[13.85,.07,10.05]}/><meshStandardMaterial color="#8c6b39" metalness={.18} roughness={.55}/></mesh></group>}
function Water(){
 const ref=useRef<THREE.Mesh>(null);useFrame(({clock})=>{if(ref.current){ref.current.position.y=-.045+Math.sin(clock.elapsedTime*.55)*.012;ref.current.rotation.z=Math.sin(clock.elapsedTime*.12)*.004}});
 return <mesh ref={ref} receiveShadow rotation={[-Math.PI/2,0,0]} position={[0,-.05,0]}><planeGeometry args={[13.65,9.85,18,14]}/><meshPhysicalMaterial color="#16788c" roughness={.2} metalness={.13} clearcoat={.66} clearcoatRoughness={.18}/></mesh>
}
function WaveGlints(){const group=useRef<THREE.Group>(null);useFrame(({clock})=>{if(group.current)group.current.position.x=Math.sin(clock.elapsedTime*.16)*.15});const glints=[[-4.7,-.02,.5],[-3.8,-.02,3.3],[-.8,-.02,-3.7],[2.4,-.02,-2.8],[4.9,-.02,.8],[1.8,-.02,3.6]];return <group ref={group}>{glints.map((p,i)=><mesh key={i} rotation={[-Math.PI/2,0,i*.5]} position={p as [number,number,number]}><planeGeometry args={[1.1,.035]}/><meshBasicMaterial color="#8ed4d8" transparent opacity={.38}/></mesh>)}</group>}

function Causeway({a,b,bend}:{a:[number,number,number];b:[number,number,number];bend:number}){
 const curve=useMemo(()=>{const A=new THREE.Vector3(...a),B=new THREE.Vector3(...b);const mid=A.clone().lerp(B,.5);const dir=B.clone().sub(A);const perp=new THREE.Vector3(-dir.z,0,dir.x).normalize().multiplyScalar(bend);mid.add(perp);mid.y=.22;A.y=.22;B.y=.22;return new THREE.CatmullRomCurve3([A,mid,B])},[a,b,bend]);
 const points=useMemo(()=>curve.getSpacedPoints(18),[curve]);
 return <group>
   <mesh castShadow receiveShadow><tubeGeometry args={[curve,40,.15,8,false]}/><meshStandardMaterial color="#77664e" roughness={.95}/></mesh>
   {points.map((p,i)=>{const tangent=curve.getTangent(i/(points.length-1));const ang=Math.atan2(tangent.z,tangent.x);return <mesh key={i} castShadow receiveShadow position={[p.x,p.y+.08,p.z]} rotation={[0,-ang,0]}><boxGeometry args={[.46,.1,.72]}/><meshStandardMaterial color={i%2?"#d6c7a5":"#c4b28d"} roughness={.92}/></mesh>})}
 </group>
}

function Island({position,colour="#6d8e4d",rim="#55432b",children,onClick,selected=false,scale=[1.8,1.45]}:{position:[number,number,number];colour?:string;rim?:string;children:React.ReactNode;onClick?:()=>void;selected?:boolean;scale?:[number,number]}){
 return <group position={position} onClick={(e)=>{e.stopPropagation();onClick?.()}}>
   <mesh castShadow receiveShadow position={[0,-.31,0]} scale={[scale[0]*1.05,.48,scale[1]*1.05]}><cylinderGeometry args={[1,1.16,1,18]}/><meshStandardMaterial color={rim} roughness={1}/></mesh>
   <mesh castShadow receiveShadow position={[0,-.05,0]} scale={[scale[0],.28,scale[1]]}><cylinderGeometry args={[1,1.03,1,18]}/><meshStandardMaterial color={colour} roughness={.95}/></mesh>
   <mesh castShadow receiveShadow position={[-.25,.09,.08]} scale={[scale[0]*.72,.17,scale[1]*.67]}><cylinderGeometry args={[1,1.03,1,15]}/><meshStandardMaterial color={new THREE.Color(colour).offsetHSL(.02,.02,.08)} roughness={.96}/></mesh>
   {selected&&<mesh position={[0,.03,0]} rotation={[-Math.PI/2,0,0]}><ringGeometry args={[1.25,1.45,48]}/><meshBasicMaterial color="#f2c85f" transparent opacity={.82}/></mesh>}
   {children}
 </group>
}
function LocationLabel({name,selected}:{name:string;selected:boolean}){return <Html center position={[0,1.55,0]} transform distanceFactor={8.2}><div className={`${styles.worldLabel} ${selected?styles.worldLabelSelected:""}`}>{name}</div></Html>}
function Marker({selected}:{selected:boolean}){return <mesh castShadow position={[0,.39,0]}><cylinderGeometry args={[.34,.39,.13,28]}/><meshStandardMaterial color={selected?"#f5cf68":"#15211f"} metalness={.5} roughness={.35}/></mesh>}
function Rock({position,scale=.28,colour="#776b59"}:{position:[number,number,number];scale?:number;colour?:string}){return <mesh castShadow position={position} scale={[scale,scale*.72,scale]} rotation={[0,position[0]*.8,0]}><dodecahedronGeometry args={[1,0]}/><meshStandardMaterial color={colour} roughness={1}/></mesh>}
function Pine({position,scale=1}:{position:[number,number,number];scale?:number}){return <group position={position} scale={scale}><mesh castShadow position={[0,.25,0]}><cylinderGeometry args={[.055,.08,.5,8]}/><meshStandardMaterial color="#5a432a"/></mesh><mesh castShadow position={[0,.65,0]}><coneGeometry args={[.28,.7,7]}/><meshStandardMaterial color="#27543f" roughness={.95}/></mesh><mesh castShadow position={[0,.95,0]}><coneGeometry args={[.2,.48,7]}/><meshStandardMaterial color="#32634a" roughness={.95}/></mesh></group>}

function Camp({location,onSelect,selected}:{location:Location;onSelect:(id:LocationId)=>void;selected:boolean}){return <Island position={location.position} colour="#62894e" onClick={()=>onSelect(location.id)} selected={selected} scale={[1.65,1.3]}><Marker selected={selected}/><mesh castShadow position={[-.52,.38,.06]} rotation={[0,.35,0]}><coneGeometry args={[.55,.9,4]}/><meshStandardMaterial color="#dec98f" roughness={.9}/></mesh><mesh castShadow position={[.48,.29,-.22]}><boxGeometry args={[.78,.56,.62]}/><meshStandardMaterial color="#835b35"/></mesh><mesh castShadow position={[.46,.63,-.22]} rotation={[0,Math.PI/4,0]}><coneGeometry args={[.58,.42,4]}/><meshStandardMaterial color="#6d4126"/></mesh>{[[-1,.12,.4],[.9,.12,.45],[.8,.12,-.65]].map((p,i)=><Rock key={i} position={p as [number,number,number]} scale={.18+i*.03}/>) }<LocationLabel name={location.name} selected={selected}/></Island>}
function Frozen({location,onSelect,selected}:{location:Location;onSelect:(id:LocationId)=>void;selected:boolean}){return <Island position={location.position} colour="#d5e2e0" rim="#667078" onClick={()=>onSelect(location.id)} selected={selected} scale={[1.75,1.4]}><Marker selected={selected}/>{[[-.65,.42,.12],[.02,.5,-.26],[.62,.35,.16]].map((p,i)=><group key={i} position={p as [number,number,number]}><mesh castShadow><coneGeometry args={[.58-i*.05,1.5-i*.12,6]}/><meshStandardMaterial color={i===1?"#e9efed":"#cbd9dc"}/></mesh><mesh castShadow position={[0,.43,0]}><coneGeometry args={[.34-i*.03,.7-i*.05,6]}/><meshStandardMaterial color="#f7faf8"/></mesh></group>)}{[[-1,.1,.65],[.95,.11,-.65]].map((p,i)=><Rock key={i} position={p as [number,number,number]} scale={.2} colour="#8a9395"/>)}<LocationLabel name={location.name} selected={selected}/></Island>}
function Ruins({location,onSelect,selected}:{location:Location;onSelect:(id:LocationId)=>void;selected:boolean}){return <Island position={location.position} colour="#708f53" onClick={()=>onSelect(location.id)} selected={selected} scale={[1.9,1.48]}><Marker selected={selected}/>{[-.62,-.2,.24,.66].map((x,i)=><group key={i} position={[x,.25,(i%2?-.16:.12)]}><mesh castShadow><cylinderGeometry args={[.12,.15,1.05-(i%2)*.22,10]}/><meshStandardMaterial color="#c6b98e" roughness={.95}/></mesh><mesh castShadow position={[0,.58-(i%2)*.11,0]}><boxGeometry args={[.31,.11,.31]}/><meshStandardMaterial color="#d2c59b"/></mesh></group>)}<mesh castShadow position={[0,.72,-.06]} rotation={[0,.08,0]}><boxGeometry args={[1.65,.15,.34]}/><meshStandardMaterial color="#b7aa80"/></mesh>{[[-1.05,.1,.62],[1.0,.1,.58],[-.95,.1,-.62]].map((p,i)=><Pine key={i} position={p as [number,number,number]} scale={.78+i*.08}/>)}<LocationLabel name={location.name} selected={selected}/></Island>}
function Oasis({location,onSelect,selected}:{location:Location;onSelect:(id:LocationId)=>void;selected:boolean}){return <Island position={location.position} colour="#d0b25f" rim="#725b31" onClick={()=>onSelect(location.id)} selected={selected} scale={[1.92,1.4]}><Marker selected={selected}/><mesh position={[0,.22,0]} rotation={[-Math.PI/2,0,0]}><circleGeometry args={[.6,28]}/><meshPhysicalMaterial color="#2d91a1" roughness={.2} clearcoat={.6}/></mesh>{[[-.78,.15,.15],[.74,.12,-.2],[-.25,.12,-.68]].map((p,i)=><Palm key={i} position={p as [number,number,number]} scale={i===2?.82:1}/>)}<mesh castShadow position={[.05,.37,.72]} rotation={[0,.5,0]}><coneGeometry args={[.45,.74,4]}/><meshStandardMaterial color="#e6c776"/></mesh>{[[-1,.09,.62],[1.03,.09,.55]].map((p,i)=><Rock key={i} position={p as [number,number,number]} scale={.19} colour="#9c8251"/>)}<LocationLabel name={location.name} selected={selected}/></Island>}
function Palm({position,scale=1}:{position:[number,number,number];scale?:number}){return <group position={position} scale={scale}><mesh castShadow position={[0,.42,0]}><cylinderGeometry args={[.065,.1,.86,9]}/><meshStandardMaterial color="#76522e"/></mesh>{[0,Math.PI/2,Math.PI,Math.PI*1.5].map((r,i)=><mesh key={i} castShadow position={[0,.89,0]} rotation={[0,r,-.56]}><coneGeometry args={[.15,.75,5]}/><meshStandardMaterial color="#3d7742"/></mesh>)}</group>}
function Golden({location,onSelect,selected}:{location:Location;onSelect:(id:LocationId)=>void;selected:boolean}){return <Island position={location.position} colour="#778f51" onClick={()=>onSelect(location.id)} selected={selected} scale={[1.92,1.46]}><Marker selected={selected}/>{[-.68,0,.68].map((x,i)=><group key={i} position={[x,.18,(i-1)*.13]}><mesh castShadow position={[0,.34,0]}><boxGeometry args={[.58,.68,.58]}/><meshStandardMaterial color={i===1?"#d7a84a":"#bc9140"} metalness={.26}/></mesh><mesh castShadow position={[0,.79,0]}><sphereGeometry args={[.36,20,10,0,Math.PI*2,0,Math.PI/2]}/><meshStandardMaterial color="#e2b84d" metalness={.34}/></mesh></group>)}<mesh castShadow position={[0,.3,-.75]}><boxGeometry args={[1.75,.18,.28]}/><meshStandardMaterial color="#d0ad58" metalness={.2}/></mesh>{[[-1.08,.08,.62],[1.06,.08,.57]].map((p,i)=><Rock key={i} position={p as [number,number,number]} scale={.21} colour="#756942"/>)}<LocationLabel name={location.name} selected={selected}/></Island>}

function Explorer({colour,target,lane}:{colour:ExplorerColour;target:LocationId;lane:number}){
 const group=useRef<THREE.Group>(null);const targetPos=useMemo(()=>new THREE.Vector3(...BY_ID[target].position).add(new THREE.Vector3((lane-1.5)*.22,.52,(lane%2?1:-1)*.18)),[target,lane]);
 useFrame((_,delta)=>{if(!group.current)return;group.current.position.lerp(targetPos,1-Math.pow(.0008,delta));group.current.rotation.y+=delta*.35});
 return <group ref={group} position={[lane*.18-.3,.85,lane%2?.18:-.18]}>
   <mesh castShadow position={[0,.02,0]}><cylinderGeometry args={[.29,.34,.12,28]}/><meshStandardMaterial color="#c3a56c" metalness={.35} roughness={.35}/></mesh>
   <mesh castShadow position={[0,.13,0]}><cylinderGeometry args={[.25,.28,.1,28]}/><meshStandardMaterial color={COLOURS[colour]} metalness={.2} roughness={.45}/></mesh>
   <mesh castShadow position={[0,.45,0]}><capsuleGeometry args={[.16,.38,6,10]}/><meshStandardMaterial color={COLOURS[colour]} roughness={.58}/></mesh>
   <mesh castShadow position={[0,.78,0]}><sphereGeometry args={[.16,18,12]}/><meshStandardMaterial color="#d9b48d" roughness={.7}/></mesh>
   <mesh castShadow position={[0,.92,0]}><cylinderGeometry args={[.25,.2,.09,18]}/><meshStandardMaterial color="#463421"/></mesh>
   <mesh castShadow position={[0,.98,0]}><cylinderGeometry args={[.09,.14,.13,14]}/><meshStandardMaterial color="#463421"/></mesh>
 </group>
}