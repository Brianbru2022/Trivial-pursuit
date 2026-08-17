export type CategoryId = "history" | "science" | "world" | "culture" | "nature" | "wildcard";
export type ThemeId = "victorian" | "cosmic" | "manor";

export type Theme = {
  id: ThemeId;
  name: string;
  strapline: string;
  boardName: string;
  hostName: string;
  accent: string;
  accent2: string;
  surface: string;
  backdrop: string;
  texture: string;
  rewardName: string;
  finaleName: string;
};

export type BoardNode = {
  id: number;
  x: number;
  y: number;
  category: CategoryId;
  kind: "category" | "risk" | "choice" | "portal" | "finale";
  label: string;
  links: number[];
};

export type Question = {
  id: string;
  category: CategoryId;
  question: string;
  answer: string;
  alternatives?: string[];
  explanation: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  artCue: string;
};

export const categories: Record<CategoryId, { name: string; symbol: string; color: string; neutralArt: string }> = {
  history: { name: "History", symbol: "⌛", color: "#d08a57", neutralArt: "ARCHIVE" },
  science: { name: "Science", symbol: "⚗", color: "#71c7cf", neutralArt: "LAB" },
  world: { name: "World", symbol: "⌖", color: "#73b879", neutralArt: "ATLAS" },
  culture: { name: "Arts & Culture", symbol: "✦", color: "#bd83d6", neutralArt: "GALLERY" },
  nature: { name: "Nature", symbol: "❧", color: "#d5b85f", neutralArt: "FIELD" },
  wildcard: { name: "Wildcard", symbol: "?", color: "#e66f7d", neutralArt: "MYSTERY" },
};

export const themes: Theme[] = [
  {
    id: "victorian",
    name: "Victorian Explorer",
    strapline: "Chart an impossible atlas of knowledge",
    boardName: "The Grand Expedition",
    hostName: "Professor Wren",
    accent: "#d9b56d",
    accent2: "#6aa89a",
    surface: "#1a211d",
    backdrop: "radial-gradient(circle at 48% 40%, #3b4737 0%, #1a2623 34%, #0c1212 78%)",
    texture: "linear-gradient(125deg, rgba(233,216,166,.08), transparent 30%, rgba(255,255,255,.02) 31%, transparent 63%)",
    rewardName: "artefact",
    finaleName: "The Royal Society Vault",
  },
  {
    id: "cosmic",
    name: "Orbital Archive",
    strapline: "Navigate a living library between the stars",
    boardName: "The Celestial Index",
    hostName: "ARIA-9",
    accent: "#8dd9ff",
    accent2: "#d899ff",
    surface: "#11172e",
    backdrop: "radial-gradient(circle at 50% 40%, #263c6d 0%, #10182f 36%, #050811 80%)",
    texture: "radial-gradient(circle at 12% 25%, rgba(255,255,255,.55) 0 1px, transparent 1.8px), radial-gradient(circle at 76% 16%, rgba(255,255,255,.35) 0 1px, transparent 1.8px), radial-gradient(circle at 68% 82%, rgba(255,255,255,.4) 0 1px, transparent 1.8px)",
    rewardName: "data core",
    finaleName: "The Singularity Archive",
  },
  {
    id: "manor",
    name: "Midnight Manor",
    strapline: "Outwit the house before the house outwits you",
    boardName: "The House of Questions",
    hostName: "Mr Blackwood",
    accent: "#dcad73",
    accent2: "#9b7fc7",
    surface: "#211719",
    backdrop: "radial-gradient(circle at 50% 38%, #4b3031 0%, #211719 38%, #0f0b0c 82%)",
    texture: "repeating-linear-gradient(90deg, rgba(255,220,180,.028) 0 1px, transparent 1px 34px), repeating-linear-gradient(0deg, rgba(255,220,180,.02) 0 1px, transparent 1px 34px)",
    rewardName: "curiosity",
    finaleName: "The Locked Observatory",
  },
];

export const boardNodes: BoardNode[] = [
  { id: 0, x: 50, y: 50, category: "wildcard", kind: "finale", label: "Nexus", links: [1, 2, 3, 4, 5, 6] },
  { id: 1, x: 50, y: 25, category: "history", kind: "category", label: "Archive", links: [0, 2, 6, 7, 8] },
  { id: 2, x: 70, y: 36, category: "science", kind: "category", label: "Laboratory", links: [0, 1, 3, 9, 10] },
  { id: 3, x: 70, y: 64, category: "world", kind: "category", label: "Atlas", links: [0, 2, 4, 11, 12] },
  { id: 4, x: 50, y: 75, category: "culture", kind: "category", label: "Gallery", links: [0, 3, 5, 13, 14] },
  { id: 5, x: 30, y: 64, category: "nature", kind: "category", label: "Field Notes", links: [0, 4, 6, 15, 16] },
  { id: 6, x: 30, y: 36, category: "wildcard", kind: "choice", label: "Choice", links: [0, 1, 5, 17, 18] },
  { id: 7, x: 38, y: 10, category: "history", kind: "category", label: "Chronicle", links: [1, 8, 18] },
  { id: 8, x: 62, y: 10, category: "culture", kind: "risk", label: "Double Dare", links: [1, 7, 9] },
  { id: 9, x: 82, y: 23, category: "science", kind: "category", label: "Theory", links: [2, 8, 10] },
  { id: 10, x: 91, y: 46, category: "world", kind: "portal", label: "Passage", links: [2, 9, 11, 16] },
  { id: 11, x: 86, y: 70, category: "nature", kind: "category", label: "Wilds", links: [3, 10, 12] },
  { id: 12, x: 68, y: 89, category: "culture", kind: "risk", label: "High Stakes", links: [3, 11, 13] },
  { id: 13, x: 43, y: 93, category: "culture", kind: "category", label: "Stage", links: [4, 12, 14] },
  { id: 14, x: 20, y: 82, category: "history", kind: "category", label: "Relics", links: [4, 13, 15] },
  { id: 15, x: 8, y: 60, category: "nature", kind: "category", label: "Expedition", links: [5, 14, 16] },
  { id: 16, x: 10, y: 34, category: "world", kind: "portal", label: "Passage", links: [5, 10, 15, 17] },
  { id: 17, x: 21, y: 15, category: "science", kind: "category", label: "Workshop", links: [6, 16, 18] },
  { id: 18, x: 31, y: 8, category: "wildcard", kind: "risk", label: "Mystery", links: [6, 7, 17] },
];

export const questions: Question[] = [
  { id: "h1", category: "history", difficulty: 2, question: "Which English king signed the Magna Carta in 1215?", answer: "King John", alternatives: ["John", "John of England"], explanation: "King John sealed Magna Carta at Runnymede in 1215.", artCue: "ornamental archive shelves and sealed parchment, no names or readable text" },
  { id: "h2", category: "history", difficulty: 2, question: "The ancient city of Pompeii was buried by the eruption of which volcano?", answer: "Mount Vesuvius", alternatives: ["Vesuvius"], explanation: "Mount Vesuvius erupted in AD 79, burying Pompeii and Herculaneum.", artCue: "classical museum display cases, no volcano silhouette or map" },
  { id: "h3", category: "history", difficulty: 3, question: "Who was the first woman to fly solo across the Atlantic Ocean?", answer: "Amelia Earhart", alternatives: ["Earhart"], explanation: "Amelia Earhart completed the solo transatlantic flight in 1932.", artCue: "period travel trunk, goggles and abstract clouds, no portrait or aircraft markings" },
  { id: "s1", category: "science", difficulty: 2, question: "What is the chemical symbol for gold?", answer: "Au", alternatives: ["A U"], explanation: "Gold's symbol Au comes from the Latin aurum.", artCue: "elegant laboratory glassware with warm reflections, no periodic-table symbols" },
  { id: "s2", category: "science", difficulty: 2, question: "Which planet has the shortest day in our Solar System?", answer: "Jupiter", explanation: "Jupiter rotates once in roughly ten hours, the fastest rotation of any planet in the Solar System.", artCue: "abstract observatory interior and star charts with no recognisable planet" },
  { id: "s3", category: "science", difficulty: 3, question: "What part of a cell contains most of its genetic material?", answer: "The nucleus", alternatives: ["Nucleus"], explanation: "In eukaryotic cells, most genetic material is stored in the nucleus.", artCue: "antique microscope and geometric biological motifs, no cell diagram" },
  { id: "w1", category: "world", difficulty: 2, question: "What is the capital city of Iceland?", answer: "Reykjavík", alternatives: ["Reykjavik"], explanation: "Reykjavík is Iceland's capital and largest city.", artCue: "decorative compass, travel labels without text and cool northern light, no landmarks or map outlines" },
  { id: "w2", category: "world", difficulty: 2, question: "Which river flows through Budapest?", answer: "The Danube", alternatives: ["Danube"], explanation: "The Danube divides Buda and Pest as it passes through the Hungarian capital.", artCue: "ornamental bridge details and abstract water ripples, no identifiable skyline" },
  { id: "w3", category: "world", difficulty: 3, question: "Which country has the city of Valparaíso?", answer: "Chile", explanation: "Valparaíso is a major Pacific port city in Chile.", artCue: "generic harbour luggage and nautical instruments, no flags, maps or distinctive skyline" },
  { id: "c1", category: "culture", difficulty: 2, question: "Who wrote the novel Pride and Prejudice?", answer: "Jane Austen", alternatives: ["Austen"], explanation: "Jane Austen's Pride and Prejudice was published in 1813.", artCue: "Regency-era writing desk and closed books with blank spines, no portrait or titles" },
  { id: "c2", category: "culture", difficulty: 2, question: "Which composer wrote The Four Seasons?", answer: "Antonio Vivaldi", alternatives: ["Vivaldi"], explanation: "Vivaldi published the four violin concertos as part of Il cimento dell'armonia e dell'inventione.", artCue: "ornamental concert hall and unlabelled sheet music without readable notes or names" },
  { id: "c3", category: "culture", difficulty: 3, question: "In Greek mythology, who was the god of the sea?", answer: "Poseidon", explanation: "Poseidon was the Greek god associated with the sea, earthquakes and horses.", artCue: "museum columns and blue mosaic patterns, no trident, deity or sea-god iconography" },
  { id: "n1", category: "nature", difficulty: 2, question: "What is the largest species of shark?", answer: "Whale shark", explanation: "The whale shark is the world's largest living fish species.", artCue: "naturalist field desk with shells and watercolour textures, no shark silhouette" },
  { id: "n2", category: "nature", difficulty: 2, question: "Which tree produces acorns?", answer: "Oak", alternatives: ["Oak tree"], explanation: "Acorns are the nuts produced by trees and shrubs in the genus Quercus, the oaks.", artCue: "botanical cabinet and pressed leaves, no oak leaves or acorns" },
  { id: "n3", category: "nature", difficulty: 3, question: "What is the name for animals that are active primarily at night?", answer: "Nocturnal", alternatives: ["Nocturnal animals"], explanation: "Nocturnal animals are most active during the night and rest during the day.", artCue: "moonlit naturalist study with abstract foliage, no identifiable nocturnal animal" },
  { id: "x1", category: "wildcard", difficulty: 2, question: "How many sides does a dodecagon have?", answer: "12", alternatives: ["Twelve"], explanation: "A dodecagon is a polygon with twelve sides.", artCue: "ornamental geometric drafting tools, avoid any twelve-sided shape" },
  { id: "x2", category: "wildcard", difficulty: 3, question: "Which language has the most native speakers worldwide?", answer: "Mandarin Chinese", alternatives: ["Mandarin", "Chinese"], explanation: "Mandarin Chinese has the world's largest number of native speakers.", artCue: "international library entrance with abstract typographic shapes, no readable language samples" },
];

export function getTheme(id: ThemeId) {
  return themes.find((theme) => theme.id === id) ?? themes[0];
}

export function getReachable(startId: number, steps: number): number[] {
  let frontier = new Set<number>([startId]);
  for (let step = 0; step < steps; step += 1) {
    const next = new Set<number>();
    frontier.forEach((id) => boardNodes[id].links.forEach((link) => next.add(link)));
    frontier = next;
  }
  frontier.delete(startId);
  return [...frontier];
}

export function getQuestion(category: CategoryId, used: string[]): Question {
  const pool = questions.filter((q) => (category === "wildcard" ? true : q.category === category) && !used.includes(q.id));
  const fallback = questions.filter((q) => category === "wildcard" || q.category === category);
  const source = pool.length ? pool : fallback.length ? fallback : questions;
  return source[Math.floor(Math.random() * source.length)];
}
