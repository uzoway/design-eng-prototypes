/*
 * The three canned searches. Every source is invented: the prototype is
 * public, so no real site names, people or images. Their addresses use the
 * reserved .example domain so none of them can point at a real site.
 */

export type Source = {
  id: string;
  name: string;
  /** Shown as the result's address, before the breadcrumb. */
  url: string;
  /** Hue for the letter favicon and the placeholder thumbnail. */
  hue: number;
};

/** A run of overview text. Bold runs are the "lead" words Google bolds. */
export type Run = string | { bold: string };

/** The little pill after a sentence that names where it came from. */
export type Cite = { sources: string[]; more?: number };

export type Line = { runs: Run[]; cite?: Cite };

export type Block =
  | { kind: "p"; line: Line }
  | { kind: "ul"; items: Line[] }
  | { kind: "h"; text: string }
  | { kind: "ol"; items: Line[] };

export type SourceCard = { source: string; title: string; description: string };

export type Result = {
  source: string;
  breadcrumb: string;
  title: string;
  date?: string;
  snippet: string;
};

export type Question = { question: string; answer: string };

export type Search = {
  id: "egg" | "tomato" | "cup";
  query: string;
  overview: Block[];
  cards: SourceCard[];
  results: Result[];
  questions: Question[];
};

export const SOURCES: Record<string, Source> = {
  kitchen: { id: "kitchen", name: "Simple Kitchen", url: "https://www.simplekitchen.example", hue: 14 },
  egg: { id: "egg", name: "The Egg Guide", url: "https://theeggguide.example", hue: 42 },
  daily: { id: "daily", name: "Home Cook Daily", url: "https://www.homecookdaily.example", hue: 200 },
  garden: { id: "garden", name: "Garden Basics", url: "https://gardenbasics.example", hue: 128 },
  plant: { id: "plant", name: "Plant Facts", url: "https://www.plantfacts.example", hue: 96 },
  history: { id: "history", name: "Food History Notes", url: "https://foodhistorynotes.example", hue: 280 },
  measure: { id: "measure", name: "Measure Right", url: "https://www.measureright.example", hue: 222 },
  baking: { id: "baking", name: "Baking Notes", url: "https://bakingnotes.example", hue: 330 },
};

const EGG: Search = {
  id: "egg",
  query: "how long to boil an egg",
  overview: [
    {
      kind: "p",
      line: {
        runs: ["For large, fridge-cold eggs, timing depends on how you like the yolk:"],
        cite: { sources: ["kitchen"], more: 1 },
      },
    },
    {
      kind: "ul",
      items: [
        { runs: [{ bold: "6 minutes:" }, " Runny yolk with a just-set white"] },
        { runs: [{ bold: "7 to 8 minutes:" }, " Jammy, soft-set yolk"] },
        { runs: [{ bold: "10 minutes:" }, " Classic hard-boiled egg with a firm, creamy yolk"] },
        {
          runs: [
            { bold: "12 minutes:" },
            " Firm all the way through (much longer and the white turns rubbery and a gray ring forms around the yolk)",
          ],
          cite: { sources: ["egg", "daily"], more: 2 },
        },
      ],
    },
    { kind: "h", text: "Quick steps for evenly cooked eggs" },
    {
      kind: "ol",
      items: [
        {
          runs: [{ bold: "Boil the water first:" }, " Bring a pot of water to a rolling boil over high heat."],
          cite: { sources: ["kitchen"] },
        },
        {
          runs: [{ bold: "Lower the eggs in:" }, " Use a slotted spoon so they don't crack on the bottom of the pot."],
          cite: { sources: ["daily"] },
        },
        {
          runs: [{ bold: "Start the timer:" }, " Turn the heat down to a gentle boil and time from when the eggs go in."],
        },
        {
          runs: [{ bold: "Cool them quickly:" }, " Move the eggs to a bowl of ice water for a few minutes to stop the cooking and make them easier to peel."],
          cite: { sources: ["egg"] },
        },
      ],
    },
  ],
  cards: [
    {
      source: "kitchen",
      title: "How long to boil eggs, from runny to fully set",
      description: "A minute-by-minute guide: 6 minutes for runny, 8 for jammy, 10 for a classic hard-boiled egg…",
    },
    {
      source: "egg",
      title: "The boiled egg timing chart",
      description: "Cold eggs, boiling water and an ice bath are the three things that make timings reliable…",
    },
    {
      source: "daily",
      title: "Soft, jammy or hard-boiled? Pick your egg",
      description: "Photos of each yolk at one-minute intervals, plus tips for peeling eggs cleanly…",
    },
  ],
  results: [
    {
      source: "kitchen",
      breadcrumb: "Recipes › Eggs",
      title: "How to Boil Eggs Perfectly Every Time",
      date: "14 Mar 2025",
      snippet:
        "Lower fridge-cold eggs into boiling water and set a timer: 6 minutes for runny yolks, 8 minutes for jammy, 10 minutes for classic hard-boiled.",
    },
    {
      source: "egg",
      breadcrumb: "Guides › Boiling",
      title: "Boiled Egg Timing Chart (Soft to Hard)",
      snippet:
        "Times assume large eggs straight from the fridge. Add about a minute for extra-large eggs, and take a minute off if they start at room temperature.",
    },
    {
      source: "daily",
      breadcrumb: "Basics › Eggs",
      title: "Why Your Boiled Eggs Are Hard to Peel",
      date: "2 Aug 2024",
      snippet:
        "Very fresh eggs stick to their shells. Starting them in boiling water rather than cold, then chilling them in ice water, makes the shell come away cleanly.",
    },
  ],
  questions: [
    {
      question: "Is 10 minutes long enough to boil an egg?",
      answer: "Yes. Ten minutes in boiling water gives a large egg a fully set white and a firm yolk that's still a little creamy in the middle.",
    },
    {
      question: "Do you put eggs in boiling water or cold water?",
      answer: "Either works, but lowering eggs into water that's already boiling makes the timing more predictable and the eggs easier to peel.",
    },
    {
      question: "How do you know when a boiled egg is done?",
      answer: "Timing is the most reliable test. A hard-boiled egg spun on the counter turns quickly and evenly; a soft one wobbles.",
    },
    {
      question: "Why do you put boiled eggs in ice water?",
      answer: "The cold stops the cooking straight away, so the yolk doesn't overcook, and it helps the shell come away from the white.",
    },
  ],
};

const TOMATO: Search = {
  id: "tomato",
  query: "is a tomato a fruit",
  overview: [
    {
      kind: "p",
      line: {
        runs: ["Yes. Botanically, a tomato is a fruit, but in the kitchen it's usually treated as a vegetable:"],
        cite: { sources: ["garden"], more: 1 },
      },
    },
    {
      kind: "ul",
      items: [
        { runs: [{ bold: "Botanical fruit:" }, " It grows from the flower of the plant and carries the seeds, which is what makes it a fruit"] },
        { runs: [{ bold: "Culinary vegetable:" }, " Cooks group foods by flavor, and tomatoes are savory rather than sweet"] },
        {
          runs: [
            { bold: "Legal vegetable:" },
            " In 1893 the U.S. Supreme Court ruled in Nix v. Hedden that tomatoes count as vegetables for import taxes",
          ],
          cite: { sources: ["history"] },
        },
      ],
    },
    { kind: "h", text: "How to tell a fruit from a vegetable" },
    {
      kind: "ol",
      items: [
        {
          runs: [{ bold: "Look for seeds:" }, " If it develops from a flower and holds seeds, botanists call it a fruit."],
          cite: { sources: ["plant"] },
        },
        {
          runs: [{ bold: "Name the plant part:" }, " Vegetables are other parts of a plant, like roots, leaves or stems."],
        },
        {
          runs: [{ bold: "Think about the dish:" }, " Cucumbers, peppers and squash are fruits too, but they're cooked like vegetables."],
          cite: { sources: ["garden"] },
        },
      ],
    },
  ],
  cards: [
    {
      source: "garden",
      title: "Is a tomato a fruit or a vegetable?",
      description: "Both, depending on who you ask. Botanists and cooks use different definitions…",
    },
    {
      source: "plant",
      title: "Fruits we eat as vegetables",
      description: "Tomatoes, cucumbers, peppers, eggplant and squash all grow from flowers and carry seeds…",
    },
    {
      source: "history",
      title: "The court case that made the tomato a vegetable",
      description: "An 1893 Supreme Court case decided how tomatoes were taxed at the border…",
    },
  ],
  results: [
    {
      source: "garden",
      breadcrumb: "Learn › Vegetables",
      title: "Is a Tomato a Fruit or a Vegetable?",
      date: "9 Jun 2025",
      snippet:
        "A tomato is a fruit because it develops from the flower and contains seeds. Most cooks still treat it as a vegetable because of its savory flavor.",
    },
    {
      source: "plant",
      breadcrumb: "Botany › Fruit",
      title: "11 Fruits You Probably Call Vegetables",
      snippet:
        "Botanically, any part of a plant that grows from the flower and holds seeds is a fruit. That includes tomatoes, cucumbers, peppers and pumpkins.",
    },
    {
      source: "history",
      breadcrumb: "Stories › Law",
      title: "Nix v. Hedden: When the Tomato Went to Court",
      date: "21 Jan 2024",
      snippet:
        "In 1893 the U.S. Supreme Court decided that, for the purposes of import tax, tomatoes should be classed as vegetables, as they are in everyday speech.",
    },
  ],
  questions: [
    {
      question: "Why is a tomato a fruit and not a vegetable?",
      answer: "It grows from the plant's flower and contains seeds, which is the botanical definition of a fruit.",
    },
    {
      question: "Is a cucumber a fruit?",
      answer: "Yes. Like tomatoes, cucumbers grow from flowers and hold seeds, so botanists class them as fruits.",
    },
    {
      question: "What is the difference between a fruit and a vegetable?",
      answer: "A fruit develops from a flower and carries seeds. Vegetables are other edible parts of a plant, such as roots, leaves and stems.",
    },
    {
      question: "Is a potato a fruit or a vegetable?",
      answer: "A potato is a vegetable. It's a tuber, a swollen underground stem that stores energy for the plant.",
    },
  ],
};

const CUP: Search = {
  id: "cup",
  query: "how many ounces in a cup",
  overview: [
    {
      kind: "p",
      line: {
        runs: ["There are 8 fluid ounces in 1 US cup. The answer changes a little with the kind of cup, and for dry ingredients it depends on weight:"],
        cite: { sources: ["measure"], more: 1 },
      },
    },
    {
      kind: "ul",
      items: [
        { runs: [{ bold: "US customary cup:" }, " 8 fluid ounces, about 237 milliliters"] },
        { runs: [{ bold: "US legal cup:" }, " 240 milliliters, about 8.1 fluid ounces, used on nutrition labels"] },
        { runs: [{ bold: "Metric cup:" }, " 250 milliliters, about 8.5 US fluid ounces, used in Australia, Canada and New Zealand"] },
        {
          runs: [
            { bold: "Dry ingredients:" },
            " Weight varies, so 1 cup of all-purpose flour is about 4.25 ounces, while 1 cup of sugar is about 7 ounces",
          ],
          cite: { sources: ["baking"] },
        },
      ],
    },
    { kind: "h", text: "Quick conversions" },
    {
      kind: "ol",
      items: [
        { runs: [{ bold: "1/4 cup:" }, " 2 fluid ounces"], cite: { sources: ["measure"] } },
        { runs: [{ bold: "1/2 cup:" }, " 4 fluid ounces"] },
        { runs: [{ bold: "2 cups:" }, " 16 fluid ounces, or 1 US pint"] },
        { runs: [{ bold: "4 cups:" }, " 32 fluid ounces, or 1 US quart"], cite: { sources: ["measure"] } },
      ],
    },
  ],
  cards: [
    {
      source: "measure",
      title: "Cups to ounces conversion chart",
      description: "Liquid and dry conversions side by side, from 1/8 cup up to a gallon…",
    },
    {
      source: "baking",
      title: "Why bakers weigh flour instead of using cups",
      description: "A cup of flour can weigh anywhere from 4 to 5 ounces depending on how it's scooped…",
    },
    {
      source: "daily",
      title: "Fluid ounces vs. ounces: what's the difference?",
      description: "Fluid ounces measure volume and ounces measure weight. Here's when it matters…",
    },
  ],
  results: [
    {
      source: "measure",
      breadcrumb: "Conversions › Volume",
      title: "How Many Ounces in a Cup? (Liquid and Dry)",
      date: "3 Feb 2025",
      snippet:
        "1 US cup holds 8 fluid ounces. For dry ingredients, measure by weight: a cup of flour weighs about 4.25 ounces and a cup of sugar about 7 ounces.",
    },
    {
      source: "baking",
      breadcrumb: "Tips › Measuring",
      title: "Measuring Cups vs. a Kitchen Scale",
      snippet:
        "Because the same cup can hold very different weights, most bakers measure by weight. Here are the weights of a cup of common baking ingredients.",
    },
    {
      source: "daily",
      breadcrumb: "Basics › Kitchen math",
      title: "Cup, Pint and Quart Conversions",
      date: "17 Oct 2023",
      snippet:
        "2 cups make a pint, 2 pints make a quart and 4 quarts make a gallon. In fluid ounces that's 16, 32 and 128.",
    },
  ],
  questions: [
    {
      question: "Is 8 oz the same as 1 cup?",
      answer: "For liquids, yes: 8 fluid ounces is 1 US cup. For dry ingredients, 8 ounces by weight is usually more or less than a cup.",
    },
    {
      question: "How many ounces are in a cup of dry ingredients?",
      answer: "It depends on the ingredient. A cup of all-purpose flour weighs about 4.25 ounces and a cup of granulated sugar about 7 ounces.",
    },
    {
      question: "How many cups is 16 oz?",
      answer: "16 fluid ounces is 2 US cups, which is also 1 US pint.",
    },
    {
      question: "Is a coffee mug 1 cup?",
      answer: "Usually not. Most mugs hold 10 to 12 fluid ounces, so a mug is closer to a cup and a half.",
    },
  ],
};

export const SEARCHES: Search[] = [EGG, TOMATO, CUP];

export const DEFAULT_SEARCH = EGG;

/** Lowercase, no punctuation, single spaces: "Is a tomato a fruit?" → "is a tomato a fruit". */
export function normalise(text: string) {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * The page for whatever was typed. The three canned queries match however
 * they're capitalised or punctuated; anything else gets the egg page, with
 * the visitor's own words left in the box.
 */
export function searchFor(text: string): Search {
  const key = normalise(text);

  return SEARCHES.find((search) => normalise(search.query) === key) ?? DEFAULT_SEARCH;
}
