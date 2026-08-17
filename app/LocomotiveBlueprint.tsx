"use client";

import type { ComponentKey } from "./victorianGame";
import styles from "./LocomotiveBlueprint.module.css";

type Props = { components: ComponentKey[] };

export default function LocomotiveBlueprint({ components }: Props) {
  const has = (key: ComponentKey) => components.includes(key);
  return (
    <div className={styles.wrap} aria-label={`${components.length} of 6 locomotive components complete`}>
      <svg viewBox="0 0 900 230" className={styles.svg} role="img">
        <defs>
          <linearGradient id="paper" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#ecd9ad" />
            <stop offset="1" stopColor="#c7ad78" />
          </linearGradient>
          <linearGradient id="greenMetal" x1="0" x2="1">
            <stop offset="0" stopColor="#18372c" />
            <stop offset=".5" stopColor="#315747" />
            <stop offset="1" stopColor="#10261f" />
          </linearGradient>
          <linearGradient id="brass" x1="0" x2="1">
            <stop offset="0" stopColor="#7c511f" />
            <stop offset=".45" stopColor="#d1a653" />
            <stop offset="1" stopColor="#6d4519" />
          </linearGradient>
          <filter id="glow"><feGaussianBlur stdDeviation="2.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        </defs>
        <rect x="1" y="1" width="898" height="228" rx="14" fill="url(#paper)" stroke="#8b6738" strokeWidth="2" />
        <g opacity=".16" stroke="#6a4d2c" strokeWidth="1"><path d="M30 45H870M30 85H870M30 125H870M30 165H870M100 20V210M200 20V210M300 20V210M400 20V210M500 20V210M600 20V210M700 20V210M800 20V210"/></g>
        <g className={styles.blueprint}>
          <line x1="55" y1="180" x2="845" y2="180" />
          <rect x="140" y="82" width="370" height="76" rx="35" />
          <circle cx="200" cy="178" r="42"/><circle cx="300" cy="178" r="42"/><circle cx="400" cy="178" r="42"/><circle cx="515" cy="178" r="28"/>
          <rect x="510" y="72" width="120" height="86" rx="8"/><rect x="650" y="98" width="150" height="62" rx="7"/>
          <rect x="162" y="44" width="28" height="42"/><rect x="155" y="37" width="42" height="10" rx="4"/>
          <rect x="108" y="112" width="35" height="46" rx="15"/><path d="M95 159h65l-18 23h-65z"/>
          <path d="M182 142h255M203 146l87 31M294 146l101 31"/>
        </g>
        {has("boiler") && <g className={styles.complete}><rect x="140" y="82" width="370" height="76" rx="35" fill="url(#greenMetal)"/><rect x="162" y="44" width="28" height="42" fill="url(#greenMetal)"/><rect x="155" y="37" width="42" height="10" rx="4" fill="url(#brass)"/><circle cx="150" cy="120" r="34" fill="url(#brass)"/><circle cx="150" cy="120" r="27" fill="#1b3329"/></g>}
        {has("wheels") && <g className={styles.complete}>{[200,300,400].map(x=><g key={x}><circle cx={x} cy="178" r="42" fill="#17231f" stroke="url(#brass)" strokeWidth="8"/><circle cx={x} cy="178" r="8" fill="#cda250"/><path d={`M${x-30} 178h60M${x} 148v60M${x-22} 156l44 44M${x+22} 156l-44 44`} stroke="#b78d43" strokeWidth="4"/></g>)}</g>}
        {has("pistons") && <g className={styles.complete} filter="url(#glow)"><path d="M185 150L290 177L392 152" fill="none" stroke="#c89d4c" strokeWidth="8"/><rect x="165" y="136" width="42" height="16" rx="6" fill="#203c32" stroke="#c89d4c" strokeWidth="3"/></g>}
        {has("firebox") && <g className={styles.complete}><rect x="430" y="96" width="78" height="62" rx="8" fill="#2c4539" stroke="url(#brass)" strokeWidth="5"/><rect x="447" y="111" width="42" height="32" rx="6" fill="#5f2618"/><path d="M468 139c-22-15-5-28 1-38 5 10 21 23-1 38z" fill="#e98933"/></g>}
        {has("cab") && <g className={styles.complete}><rect x="510" y="72" width="120" height="86" rx="8" fill="url(#greenMetal)" stroke="url(#brass)" strokeWidth="5"/><rect x="532" y="90" width="32" height="34" fill="#c5d4c6" stroke="#c89d4c" strokeWidth="3"/><rect x="577" y="90" width="32" height="34" fill="#c5d4c6" stroke="#c89d4c" strokeWidth="3"/><path d="M500 72h140l-13-16H514z" fill="url(#brass)"/></g>}
        {has("tender") && <g className={styles.complete}><rect x="650" y="98" width="150" height="62" rx="7" fill="url(#greenMetal)" stroke="url(#brass)" strokeWidth="5"/><path d="M662 100h126l-12-20H674z" fill="#33251b"/><circle cx="690" cy="178" r="26" fill="#17231f" stroke="#b78d43" strokeWidth="6"/><circle cx="760" cy="178" r="26" fill="#17231f" stroke="#b78d43" strokeWidth="6"/></g>}
        <text x="28" y="27" className={styles.caption}>ENGINEERING DRAWING No. 1851</text>
        <text x="860" y="27" textAnchor="end" className={styles.progress}>{components.length}/6 COMPLETE</text>
      </svg>
    </div>
  );
}
