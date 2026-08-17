export type VictorianSiteKind = "start" | "coal" | "iron" | "engineering" | "university" | "port" | "railway" | "event" | "exhibition";
export type ResourceKey = "coal" | "iron" | "knowledge" | "capital";
export type ComponentKey = "boiler" | "wheels" | "pistons" | "firebox" | "cab" | "tender";

export type VictorianSite = { id:number; name:string; shortName:string; kind:VictorianSiteKind; x:number; y:number; links:number[]; reward?:Partial<Record<ResourceKey,number>>; major?:boolean };

// A deliberately designed board-game railway. The loop is symmetrical and readable;
// the scenery is decorative rather than geographically prescriptive.
export const victorianSites: VictorianSite[] = [
  {id:0,name:"Inventor's Workshop",shortName:"WORKSHOP",kind:"start",x:14,y:28,links:[1,15],major:true},
  {id:1,name:"Coal Depot",shortName:"COAL",kind:"coal",x:25,y:18,links:[0,2],reward:{coal:2}},
  {id:2,name:"Iron Foundry",shortName:"IRON",kind:"iron",x:39,y:14,links:[1,3],reward:{iron:2}},
  {id:3,name:"University",shortName:"UNIVERSITY",kind:"university",x:54,y:14,links:[2,4],reward:{knowledge:2},major:true},
  {id:4,name:"Engineering Works",shortName:"WORKS",kind:"engineering",x:69,y:18,links:[3,5,16],major:true},
  {id:5,name:"Investors' Club",shortName:"CAPITAL",kind:"port",x:81,y:28,links:[4,6],reward:{capital:2}},
  {id:6,name:"Railway Mania",shortName:"EVENT",kind:"event",x:87,y:42,links:[5,7]},
  {id:7,name:"East Junction",shortName:"JUNCTION",kind:"railway",x:87,y:58,links:[6,8,18],major:true},
  {id:8,name:"Grand Engineering Works",shortName:"GRAND WORKS",kind:"engineering",x:78,y:72,links:[7,9,17],major:true},
  {id:9,name:"Industrial Exchange",shortName:"EXCHANGE",kind:"iron",x:64,y:80,links:[8,10],reward:{iron:1,capital:1}},
  {id:10,name:"Coal Sidings",shortName:"COAL",kind:"coal",x:49,y:82,links:[9,11],reward:{coal:2}},
  {id:11,name:"Patent Office",shortName:"PATENT",kind:"event",x:34,y:80,links:[10,12]},
  {id:12,name:"City Docks",shortName:"DOCKS",kind:"port",x:21,y:72,links:[11,13],reward:{capital:2},major:true},
  {id:13,name:"West Junction",shortName:"JUNCTION",kind:"railway",x:12,y:58,links:[12,14]},
  {id:14,name:"Scientific Institute",shortName:"INSTITUTE",kind:"university",x:10,y:43,links:[13,15],reward:{knowledge:2}},
  {id:15,name:"Foundry Lane",shortName:"IRON",kind:"iron",x:10,y:34,links:[14,0],reward:{iron:2}},

  // One clear express shortcut through the middle of the board.
  {id:16,name:"Express Junction",shortName:"EXPRESS",kind:"railway",x:58,y:39,links:[4,17]},
  {id:17,name:"Central Engineering Hall",shortName:"CENTRAL WORKS",kind:"engineering",x:58,y:58,links:[16,8],major:true},

  // Crystal Palace is a finish spur, not another stop on the loop.
  {id:18,name:"Crystal Palace, Great Exhibition",shortName:"EXHIBITION",kind:"exhibition",x:94,y:58,links:[7],major:true},
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
