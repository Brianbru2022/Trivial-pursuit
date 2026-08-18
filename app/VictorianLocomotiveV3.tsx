"use client";

import type { ComponentKey } from "./victorianGame";

type Props = { completed: ComponentKey[] };

export default function VictorianLocomotiveV3({ completed }: Props) {
  const done = (key: ComponentKey) => completed.includes(key);
  const part = (key: ComponentKey) => done(key) ? "url(#finished)" : "url(#blueprint)";
  const stroke = (key: ComponentKey) => done(key) ? "#d6a84c" : "#8d7657";
  return (
    <svg viewBox="0 0 930 245" role="img" aria-label={`${completed.length} of 6 locomotive components complete`} style={{width:"100%",height:"100%",display:"block"}}>
      <defs>
        <linearGradient id="finished" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#214f43"/><stop offset=".45" stopColor="#123a31"/><stop offset="1" stopColor="#071a16"/></linearGradient>
        <linearGradient id="blueprint" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#d6c39a" stopOpacity=".24"/><stop offset="1" stopColor="#8b7556" stopOpacity=".08"/></linearGradient>
        <linearGradient id="brass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#f5d477"/><stop offset=".45" stopColor="#a86b22"/><stop offset="1" stopColor="#6e3d10"/></linearGradient>
        <filter id="shadow"><feDropShadow dx="0" dy="5" stdDeviation="4" floodColor="#000" floodOpacity=".42"/></filter>
      </defs>
      <g opacity=".23" stroke="#8c7353" strokeWidth="1"><path d="M20 35H910M20 75H910M20 115H910M20 155H910M20 195H910"/><path d="M60 15V220M160 15V220M260 15V220M360 15V220M460 15V220M560 15V220M660 15V220M760 15V220M860 15V220"/></g>
      <g filter="url(#shadow)">
        <path d="M66 185H890V204H66Z" fill="#332114" stroke="#b67b31" strokeWidth="3"/>
        <g fill={part("wheels")} stroke={stroke("wheels")} strokeWidth="4">
          {[220,330,450].map((x)=><g key={x}><circle cx={x} cy="181" r="43"/><circle cx={x} cy="181" r="14"/><path d={`M${x-31} 181H${x+31}M${x} 150V212M${x-23} 158L${x+23} 204M${x+23} 158L${x-23} 204`}/></g>)}
          <circle cx="680" cy="185" r="31"/><circle cx="770" cy="185" r="31"/><circle cx="849" cy="185" r="31"/>
        </g>
        <g fill={part("boiler")} stroke={stroke("boiler")} strokeWidth="4">
          <rect x="132" y="79" width="355" height="76" rx="38"/><rect x="103" y="95" width="49" height="46" rx="9"/>
          <path d="M170 79V44H215V79M178 44V25H207V44"/>
          {done("boiler") && <><path d="M250 81V153M345 81V153" stroke="url(#brass)" strokeWidth="8"/><circle cx="139" cy="117" r="23" fill="none" stroke="url(#brass)" strokeWidth="5"/></>}
        </g>
        <g fill={part("firebox")} stroke={stroke("firebox")} strokeWidth="4"><rect x="468" y="92" width="87" height="70" rx="8"/>{done("firebox")&&<rect x="484" y="111" width="53" height="34" rx="4" fill="#351309" stroke="#e3a84b"/>}</g>
        <g fill={part("cab")} stroke={stroke("cab")} strokeWidth="4"><path d="M543 62H666V164H543Z"/><path d="M536 62H675L658 44H553Z"/><path d="M562 80H613V119H562Z" fill={done("cab")?"#0d1b19":"transparent"}/></g>
        <g fill={part("tender")} stroke={stroke("tender")} strokeWidth="4"><path d="M672 105H867L849 164H690Z"/><path d="M694 105L713 82H829L850 105"/>{done("tender")&&<path d="M714 89L829 89" stroke="#17120c" strokeWidth="12" strokeDasharray="7 5"/>}</g>
        <g stroke={stroke("pistons")} strokeWidth={done("pistons")?7:4} fill="none"><path d="M210 148L445 191M223 194L437 145"/><rect x="242" y="144" width="34" height="14" rx="5"/><rect x="398" y="175" width="34" height="14" rx="5"/></g>
        {completed.length>0&&<g stroke="url(#brass)" strokeWidth="3" fill="none" opacity=".95"><path d="M102 207H882"/><path d="M100 212H884" opacity=".45"/></g>}
      </g>
    </svg>
  );
}
