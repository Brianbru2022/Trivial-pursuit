export type VictorianSiteKind = "start" | "coal" | "iron" | "engineering" | "university" | "port" | "railway" | "event" | "exhibition";
export type ResourceKey = "coal" | "iron" | "knowledge" | "capital";
export type ComponentKey = "boiler" | "wheels" | "pistons" | "firebox" | "cab" | "tender";

export type VictorianSite = {
  id: number;
  name: string;
  shortName: string;
  kind: VictorianSiteKind;
  x: number;
  y: number;
  links: number[];
  reward?: Partial<Record<ResourceKey, number>>;
};

export const victorianSites: VictorianSite[] = [
  { id: 0, name: "Edinburgh Workshop", shortName: "Edinburgh", kind: "start", x: 54, y: 17, links: [1, 2] },
  { id: 1, name: "Scottish Coalfields", shortName: "Coalfields", kind: "coal", x: 43, y: 24, links: [0, 3], reward: { coal: 2 } },
  { id: 2, name: "University of Edinburgh", shortName: "University", kind: "university", x: 67, y: 25, links: [0, 4], reward: { knowledge: 2 } },
  { id: 3, name: "Glasgow Foundries", shortName: "Glasgow", kind: "iron", x: 35, y: 34, links: [1, 5, 6], reward: { iron: 2 } },
  { id: 4, name: "York Railway Works", shortName: "York", kind: "railway", x: 66, y: 38, links: [2, 6, 7], reward: { capital: 1 } },
  { id: 5, name: "Liverpool Docks", shortName: "Liverpool", kind: "port", x: 31, y: 50, links: [3, 8], reward: { capital: 2 } },
  { id: 6, name: "Manchester Engineering Works", shortName: "Manchester", kind: "engineering", x: 49, y: 45, links: [3, 4, 8, 9], reward: { iron: 1, knowledge: 1 } },
  { id: 7, name: "Railway Mania", shortName: "Railway Mania", kind: "event", x: 73, y: 51, links: [4, 9, 10] },
  { id: 8, name: "Birmingham Factories", shortName: "Birmingham", kind: "engineering", x: 43, y: 61, links: [5, 6, 11], reward: { iron: 1, capital: 1 } },
  { id: 9, name: "Cambridge Scientific Society", shortName: "Cambridge", kind: "university", x: 65, y: 62, links: [6, 7, 11], reward: { knowledge: 2 } },
  { id: 10, name: "East Coast Railway", shortName: "East Coast", kind: "railway", x: 78, y: 66, links: [7, 12], reward: { capital: 1 } },
  { id: 11, name: "Oxford Patent Office", shortName: "Oxford", kind: "event", x: 54, y: 72, links: [8, 9, 12] },
  { id: 12, name: "Crystal Palace, London", shortName: "Crystal Palace", kind: "exhibition", x: 68, y: 82, links: [10, 11] },
];

export const componentRecipes: Record<ComponentKey, { name: string; cost: Partial<Record<ResourceKey, number>> }> = {
  boiler: { name: "Boiler", cost: { iron: 2, coal: 1 } },
  wheels: { name: "Wheels", cost: { iron: 2, capital: 1 } },
  pistons: { name: "Pistons", cost: { iron: 1, knowledge: 2 } },
  firebox: { name: "Firebox", cost: { iron: 1, coal: 2 } },
  cab: { name: "Cab", cost: { capital: 2, knowledge: 1 } },
  tender: { name: "Tender", cost: { iron: 1, coal: 1, capital: 1 } },
};

export const componentOrder = Object.keys(componentRecipes) as ComponentKey[];

export function reachableSites(startId: number, steps: number) {
  let frontier = new Set<number>([startId]);
  for (let i = 0; i < steps; i += 1) {
    const next = new Set<number>();
    frontier.forEach((id) => victorianSites[id].links.forEach((link) => next.add(link)));
    frontier = next;
  }
  frontier.delete(startId);
  return [...frontier];
}
