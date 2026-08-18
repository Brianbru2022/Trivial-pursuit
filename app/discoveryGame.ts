export type ExplorerColour = "red" | "blue" | "green" | "amber";
export type ResourceKey = "influence" | "knowledge" | "relics";
export type LocationKind = "harbour" | "knowledge" | "relic" | "influence" | "event" | "discovery" | "glory" | "monument";

export type Location = {
  id: string;
  name: string;
  kind: LocationKind;
  x: number;
  y: number;
  neighbours: string[];
  subtitle: string;
  symbol: string;
};

export type Explorer = {
  name: string;
  colour: ExplorerColour;
  location: string;
  influence: number;
  knowledge: number;
  relics: number;
  glory: number;
  discoveries: DiscoveryCard[];
  abilityUsed: boolean;
};

export type DiscoveryCard = {
  id: string;
  title: string;
  text: string;
  glory: number;
  symbol: string;
};

export type EventCard = {
  id: string;
  title: string;
  text: string;
  apply: (explorer: Explorer) => Explorer;
};

export const locations: Location[] = [
  { id:"cliff", name:"Cliff Haven", kind:"harbour", x:13, y:48, neighbours:["frozen","pirate"], subtitle:"Gateway to the unknown", symbol:"⚓" },
  { id:"frozen", name:"Frozen Wastes", kind:"knowledge", x:26, y:20, neighbours:["cliff","ancient"], subtitle:"Ice-bound secrets", symbol:"❄" },
  { id:"ancient", name:"Ancient Ruins", kind:"discovery", x:46, y:18, neighbours:["frozen","desert","enchanted"], subtitle:"Forgotten civilisation", symbol:"⌂" },
  { id:"desert", name:"Desert Oasis", kind:"influence", x:65, y:22, neighbours:["ancient","lost","golden"], subtitle:"Caravans and patrons", symbol:"☀" },
  { id:"lost", name:"Lost Temple", kind:"relic", x:84, y:28, neighbours:["desert","volcanic"], subtitle:"A sealed sanctuary", symbol:"◆" },
  { id:"volcanic", name:"Volcanic Isle", kind:"event", x:86, y:58, neighbours:["lost","golden","sun"], subtitle:"Danger changes everything", symbol:"▲" },
  { id:"golden", name:"Golden City", kind:"glory", x:65, y:49, neighbours:["desert","volcanic","enchanted","sun"], subtitle:"Fame, fortune and rivalry", symbol:"♛" },
  { id:"enchanted", name:"Enchanted Forest", kind:"knowledge", x:44, y:46, neighbours:["ancient","golden","merchant","jungle"], subtitle:"Nature keeps its own lore", symbol:"❧" },
  { id:"pirate", name:"Pirate Cove", kind:"event", x:18, y:72, neighbours:["cliff","merchant"], subtitle:"Risk and opportunity", symbol:"☠" },
  { id:"merchant", name:"Merchant Port", kind:"influence", x:34, y:78, neighbours:["pirate","enchanted","jungle"], subtitle:"Trade, bargains and favours", symbol:"⚖" },
  { id:"jungle", name:"Jungle Ruins", kind:"relic", x:54, y:76, neighbours:["merchant","enchanted","sun"], subtitle:"Treasures beneath the canopy", symbol:"◈" },
  { id:"sun", name:"Temple of the Sun", kind:"discovery", x:73, y:74, neighbours:["jungle","golden","volcanic","monument"], subtitle:"The last great revelation", symbol:"☼" },
  { id:"monument", name:"The Great Monument", kind:"monument", x:91, y:78, neighbours:["sun"], subtitle:"Where legends are remembered", symbol:"✦" },
];

export const byLocation = Object.fromEntries(locations.map(l => [l.id, l])) as Record<string, Location>;

export const discoveryDeck: DiscoveryCard[] = [
  { id:"astrolabe", title:"Astrolabe", text:"Ancient navigation knowledge. Gain 1 Knowledge.", glory:2, symbol:"✺" },
  { id:"idol", title:"Golden Idol", text:"A priceless ceremonial relic. Gain 1 Relic.", glory:3, symbol:"♜" },
  { id:"codex", title:"Lost Codex", text:"A language no scholar has seen for centuries.", glory:2, symbol:"▤" },
  { id:"crown", title:"Sun Crown", text:"A royal object of extraordinary workmanship.", glory:4, symbol:"♛" },
  { id:"map", title:"Navigator's Map", text:"Your next journey may travel one extra path.", glory:1, symbol:"⌖" },
  { id:"mask", title:"Jade Mask", text:"A mysterious face from a forgotten kingdom.", glory:3, symbol:"◉" },
];

export const eventDeck: EventCard[] = [
  { id:"storm", title:"Monsoon", text:"The route is treacherous. Lose 1 Influence, but gain 1 Knowledge.", apply:e=>({...e,influence:Math.max(0,e.influence-1),knowledge:e.knowledge+1}) },
  { id:"patron", title:"Royal Patron", text:"A wealthy patron funds your expedition. Gain 2 Influence.", apply:e=>({...e,influence:e.influence+2}) },
  { id:"find", title:"Lucky Find", text:"A local guide uncovers a forgotten object. Gain 1 Relic.", apply:e=>({...e,relics:e.relics+1}) },
  { id:"press", title:"Newspaper Fame", text:"Your discoveries make the front page. Gain 2 Glory.", apply:e=>({...e,glory:e.glory+2}) },
  { id:"rival", title:"Rival Expedition", text:"Competitors steal the headlines. Lose 1 Glory.", apply:e=>({...e,glory:Math.max(0,e.glory-1)}) },
  { id:"calm", title:"Favourable Winds", text:"A perfect crossing. Gain 1 Influence and 1 Glory.", apply:e=>({...e,influence:e.influence+1,glory:e.glory+1}) },
];

export function createExplorer(name:string, colour:ExplorerColour): Explorer {
  return { name, colour, location:"cliff", influence:1, knowledge:1, relics:0, glory:0, discoveries:[], abilityUsed:false };
}

export function reachableWithin(start:string, travelPoints:number): Record<string,number> {
  const distance:Record<string,number> = {[start]:0};
  const queue=[start];
  while(queue.length){
    const current=queue.shift()!;
    const d=distance[current];
    if(d>=travelPoints) continue;
    for(const n of byLocation[current].neighbours){
      if(distance[n]===undefined || distance[n]>d+1){
        distance[n]=d+1;
        queue.push(n);
      }
    }
  }
  delete distance[start];
  return distance;
}

export function resolveLocation(explorer:Explorer, location:Location){
  switch(location.kind){
    case "knowledge": return {...explorer, knowledge:explorer.knowledge+1, glory:explorer.glory+1};
    case "influence": return {...explorer, influence:explorer.influence+1, glory:explorer.glory+1};
    case "relic": return {...explorer, relics:explorer.relics+1, glory:explorer.glory+1};
    case "glory": return {...explorer, glory:explorer.glory+2};
    default: return explorer;
  }
}

export function monumentReady(explorer:Explorer){
  return explorer.influence>=3 && explorer.knowledge>=3 && explorer.relics>=2;
}

export function totalLegendScore(explorer:Explorer){
  return explorer.glory + explorer.influence + explorer.knowledge + explorer.relics*2 + explorer.discoveries.reduce((n,c)=>n+c.glory,0);
}
