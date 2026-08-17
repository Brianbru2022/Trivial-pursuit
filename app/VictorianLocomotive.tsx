"use client";

import type { ComponentKey } from "./victorianGame";
import styles from "./VictorianBoard.module.css";

type Props = { completed: ComponentKey[] };

export default function VictorianLocomotive({ completed }: Props) {
  const done = (key: ComponentKey) => completed.includes(key);
  return (
    <div className={styles.locoBlueprint} aria-label={`${completed.length} of 6 locomotive components complete`}>
      <svg viewBox="0 0 760 210" role="img" aria-label="Victorian locomotive under construction">
        <g className={styles.blueprintGrid}>
          <path d="M20 180H735M40 25V190M120 25V190M200 25V190M280 25V190M360 25V190M440 25V190M520 25V190M600 25V190M680 25V190" />
          <path d="M20 60H735M20 100H735M20 140H735" />
        </g>
        <g className={`${styles.locoPart} ${done("wheels") ? styles.locoDone : ""}`}>
          <circle cx="195" cy="154" r="38"/><circle cx="294" cy="154" r="38"/><circle cx="390" cy="154" r="34"/>
          <circle cx="195" cy="154" r="13"/><circle cx="294" cy="154" r="13"/><circle cx="390" cy="154" r="12"/>
          <path d="M194 154L390 154M195 154L228 128M294 154L326 128M390 154L357 127"/>
        </g>
        <g className={`${styles.locoPart} ${done("boiler") ? styles.locoDone : ""}`}>
          <rect x="130" y="73" width="285" height="65" rx="31"/><rect x="112" y="88" width="35" height="38" rx="7"/>
          <path d="M165 73V48H202V73M174 48V34H193V48"/>
        </g>
        <g className={`${styles.locoPart} ${done("firebox") ? styles.locoDone : ""}`}>
          <rect x="400" y="83" width="72" height="59" rx="8"/><path d="M410 89H459V132H410Z"/>
        </g>
        <g className={`${styles.locoPart} ${done("cab") ? styles.locoDone : ""}`}>
          <path d="M459 53H555V143H459Z"/><path d="M472 66H514V100H472Z"/><path d="M455 53H562L548 39H470Z"/>
        </g>
        <g className={`${styles.locoPart} ${done("tender") ? styles.locoDone : ""}`}>
          <path d="M563 88H694L681 143H574Z"/><path d="M580 88L595 66H665L682 88"/>
          <circle cx="596" cy="157" r="24"/><circle cx="666" cy="157" r="24"/>
        </g>
        <g className={`${styles.locoPart} ${done("pistons") ? styles.locoDone : ""}`}>
          <path d="M225 121L355 168M225 168L355 121"/><rect x="236" y="127" width="26" height="12" rx="4"/><rect x="331" y="151" width="26" height="12" rx="4"/>
        </g>
        <g className={styles.locoBase}><path d="M95 143H715V167H95Z"/></g>
      </svg>
      <div className={styles.locoProgress}><span>{completed.length}/6 COMPLETE</span><b>{completed.length === 6 ? "LOCOMOTIVE READY FOR LONDON" : "ENGINEERING DRAWING No. 1851"}</b></div>
    </div>
  );
}
