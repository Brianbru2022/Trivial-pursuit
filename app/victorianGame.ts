export type VictorianSiteKind = "start" | "coal" | "iron" | "engineering" | "university" | "port" | "railway" | "event" | "exhibition";
export type ResourceKey = "coal" | "iron" | "knowledge" | "capital";
export type ComponentKey = "boiler" | "wheels" | "pistons" | "firebox" | "cab" | "tender";

export type VictorianSite = { id:number; name:string; shortName:string; kind:VictorianSiteKind; x:number; y:number; links:number[]; reward?:Partial<Record<ResourceKey,number>> };

// A deliberately fictionalised railway: clear board-game movement matters more than geographic accuracy.
export const victorianSites: VictorianSite[] = [
  {id:0,name:"Inventor's Workshop",shortName:"WORKSHOP",kind:"start",x:13,y:21,links:[1]},
  {id:1,name:"Coal Depot",shortName:"COAL",kind:"coal",x:25,y:21,links:[0,2],reward:{coal:2}},
  {id:2,name:"Iron Foundry",shortName:"IRON",kind:"iron",x:37,y:21,links:[1,3],reward:{iron:2}},
  {id:3,name:"Engineering Works",shortName:"WORKS",kind:"engineering",x:49,y:21,links:[2,4,8]},
  {id:4,name:"Railway Junction",shortName:"JUNCTION",kind:"railway",x:61,y:21,links:[3,5]},
  {id:5,name:"University",shortName:"UNIVERSITY",kind:"university",x:73,y:21,links:[4,6],reward:{knowledge:2}},
  {id:6,name:"Investors' Club",shortName:"CAPITAL",kind:"port",x:85,y:29,links:[5,7],reward:{capital:2}},
  {id:7,name:"Railway Mania",shortName:"EVENT",kind:"event",x:85,y:46,links:[6,11]},
  {id:8,name:"Patent Office",shortName:"PATENT",kind:"event",x:49,y:40,links:[3,9]},
  {id:9,name:"City Docks",shortName:"DOCKS",kind:"port",x:37,y:49,links:[8,10],reward:{capital:2}},
  {id:10,name:"Industrial Exchange",shortName:"EXCHANGE",kind:"iron",x:49,y:58,links:[9,11],reward:{iron:1,capital:1}},
  {id:11,name:"Grand Engineering Works",shortName:"GRAND WORKS",kind:"engineering",x:68,y:58,links:[7,10,12]},
  {id:12,name:"Express Railway",shortName:"EXPRESS",kind:"railway",x:68,y:72,links:[11,13]},
  {id:13,name:"London Terminus",shortName:"LONDON",kind:"railway",x:80,y:72,links:[12,14]},
  {id:14,name:"Crystal Palace, Great Exhibition",shortName:"EXHIBITION",kind:"exhibition",x:90,y:72,links:[13]},
];

export const componentRecipes: Record<ComponentKey,{name:string;cost:Partial<Record<ResourceKey,number>>;questions:number;needed:number}> = {
  boiler:{name:"Boiler",cost:{iron:2,coal:1},questions:1,needed:1},
  wheels:{name:"Wheels",cost:{iron:2,capital:1},questions:1,needed:1},
  pistons:{name:"Pistons",cost:{iron:1,knowledge:2},questions:3,needed:2},
  firebox:{name:"Firebox",cost:{iron:1,coal:2},questions:2,needed:2},
  cab:{name:"Cab",cost:{capital:2,knowledge:1},questions:3,needed:2},
  tender:{name:"Tender",cost:{iron:1,coal:1,capital:1},questions:3,needed:2},
};
export const componentOrder=Object.keys(componentRecipes) as ComponentKey[];

export function reachableSites(startId:number,steps:number){let frontier=new Set<number>([startId]);for(let i=0;i<steps;i+=1){const next=new Set<number>();frontier.forEach(id=>victorianSites[id].links.forEach(link=>next.add(link)));frontier=next;}frontier.delete(startId);return [...frontier];}
