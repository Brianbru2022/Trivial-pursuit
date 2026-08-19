"use client";

import { useState } from "react";
import Discovery3DStyled from "./Discovery3DStyled";
import AsterVale2D from "./AsterVale2D";

export default function DiscoveryEncounterTest(){
  const [mode,setMode]=useState<"world"|"ruins">("world");
  if(mode==="ruins") return <AsterVale2D onBack={()=>setMode("world")}/>;
  return <div style={{position:"relative",height:"100svh",overflow:"hidden"}}>
    <Discovery3DStyled/>
    <button onClick={()=>setMode("ruins")} style={{position:"fixed",zIndex:80,right:18,bottom:76,padding:"11px 16px",border:"1px solid #b98b3f",borderRadius:10,background:"#173d2f",color:"#f0d28d",fontFamily:"Georgia,serif",letterSpacing:'.06em',boxShadow:'0 8px 22px #0008'}}>TEST ANCIENT RUINS</button>
  </div>;
}
