// The card. Placeholder prices and copy until the client sends the real one —
// the shape is what matters, and swapping the contents touches nothing else.
//
// options: groups the order sheet renders; `add` is added to the base price.
// tag:     a short flag drawn next to the name.

const MILK = {
  id: "milk", label: "Milk", default: "Whole",
  choices: [{ id: "Whole", add: 0 }, { id: "Oat", add: 15000 },
            { id: "Almond", add: 18000 }, { id: "Lactose-free", add: 15000 }],
};
const SHOT = {
  id: "shot", label: "Strength", default: "Standard",
  choices: [{ id: "Standard", add: 0 }, { id: "Extra shot", add: 20000 },
            { id: "Decaf", add: 0 }],
};
const SERVE = {
  id: "serve", label: "Serve", default: "Hot",
  choices: [{ id: "Hot", add: 0 }, { id: "Iced", add: 10000 }],
};
const SIZE = {
  id: "size", label: "Size", default: "Regular",
  choices: [{ id: "Regular", add: 0 }, { id: "Large", add: 25000 }],
};
const SWEET = {
  id: "sweet", label: "Sweetness", default: "As it comes",
  choices: [{ id: "As it comes", add: 0 }, { id: "Half sweet", add: 0 },
            { id: "No sugar", add: 0 }],
};

export const CATEGORIES = [
  { id: "espresso", name: "Espresso", note: "House blend, pulled to order" },
  { id: "brew",     name: "Brew Bar", note: "Single origin, by the cup" },
  { id: "matcha",   name: "Matcha",   note: "Ceremonial grade, whisked to order" },
  { id: "cold",     name: "Cold",     note: "Built over ice" },
  { id: "bites",    name: "Bites",    note: "Baked in the morning" },
];

export const ITEMS = [
  /* ------------------------------------------------------------- espresso */
  { id: "espresso", cat: "espresso", name: "Espresso", price: 68000,
    desc: "Two ristretto shots. Short, dense, no apology.", options: [SHOT] },
  { id: "americano", cat: "espresso", name: "Americano", price: 82000,
    desc: "Espresso lengthened with hot water.", options: [SHOT, SERVE] },
  { id: "cortado", cat: "espresso", name: "Cortado", price: 92000,
    desc: "Equal parts espresso and warm milk.", options: [MILK, SHOT] },
  { id: "cappuccino", cat: "espresso", name: "Cappuccino", price: 98000,
    desc: "Six ounces, dry foam, cocoa if you ask.", options: [MILK, SHOT] },
  { id: "flat-white", cat: "espresso", name: "Flat White", price: 110000,
    desc: "Double ristretto under thin microfoam.", options: [MILK, SHOT] },
  { id: "latte", cat: "espresso", name: "Latte", price: 110000,
    desc: "The long, quiet one.", options: [MILK, SHOT, SERVE, SIZE] },
  { id: "spanish", cat: "espresso", name: "Spanish Latte", price: 132000,
    desc: "Condensed milk, espresso, a pinch of salt.", options: [MILK, SERVE, SIZE] },
  { id: "mocha", cat: "espresso", name: "Mocha", price: 138000,
    desc: "Seventy percent dark chocolate, steamed through.", options: [MILK, SHOT, SERVE] },
  { id: "caramel-macchiato", cat: "espresso", name: "Caramel Macchiato", price: 142000,
    desc: "Vanilla, milk, espresso poured last.", options: [MILK, SERVE, SIZE] },

  /* ----------------------------------------------------------------- brew */
  { id: "v60", cat: "brew", name: "V60", price: 128000,
    desc: "Rotating single origin. Ask what is on today.", tag: "Filter" },
  { id: "chemex", cat: "brew", name: "Chemex", price: 148000,
    desc: "Brewed for two, poured at the table.", tag: "For 2" },
  { id: "cold-brew", cat: "brew", name: "Cold Brew", price: 118000,
    desc: "Eighteen hours in cold water. Nothing added.", options: [SIZE] },
  { id: "espresso-tonic", cat: "brew", name: "Espresso Tonic", price: 135000,
    desc: "Tonic, ice, a double over the top.", tag: "New" },

  /* --------------------------------------------------------------- matcha */
  { id: "matcha-latte", cat: "matcha", name: "Matcha Latte", price: 158000,
    desc: "Ceremonial grade, whisked, then milk.", options: [MILK, SERVE, SIZE, SWEET], tag: "House" },
  { id: "dirty-matcha", cat: "matcha", name: "Dirty Matcha", price: 175000,
    desc: "Matcha latte with a shot dropped through it.", options: [MILK, SERVE, SWEET] },
  { id: "strawberry-matcha", cat: "matcha", name: "Strawberry Matcha", price: 182000,
    desc: "Crushed strawberry under iced matcha.", options: [MILK, SWEET] },
  { id: "hojicha", cat: "matcha", name: "Hojicha Latte", price: 152000,
    desc: "Roasted green tea. Toasty, low caffeine.", options: [MILK, SERVE, SWEET] },
  { id: "matcha-shot", cat: "matcha", name: "Straight Matcha", price: 120000,
    desc: "Whisked with water. As it is meant to be.", options: [SERVE] },

  /* ----------------------------------------------------------------- cold */
  { id: "iced-latte", cat: "cold", name: "Iced Latte", price: 118000,
    desc: "Double shot, cold milk, a lot of ice.", options: [MILK, SHOT, SIZE] },
  { id: "affogato", cat: "cold", name: "Affogato", price: 125000,
    desc: "Vanilla gelato drowned in espresso.", options: [SHOT] },
  { id: "frappe", cat: "cold", name: "Coffee Frappé", price: 145000,
    desc: "Blended, thick, cold enough to hurt.", options: [MILK, SWEET] },
  { id: "lemonade", cat: "cold", name: "Mint Lemonade", price: 98000,
    desc: "Pressed lemon, mint, soda.", options: [SWEET] },

  /* ---------------------------------------------------------------- bites */
  { id: "basque", cat: "bites", name: "Basque Cheesecake", price: 165000,
    desc: "Burnt top, soft centre. Made each morning.", tag: "Daily" },
  { id: "brownie", cat: "bites", name: "Walnut Brownie", price: 128000,
    desc: "Dark, dense, warm on request." },
  { id: "croissant", cat: "bites", name: "Butter Croissant", price: 98000,
    desc: "Laminated here, baked twice a day." },
  { id: "cookie", cat: "bites", name: "Sea Salt Cookie", price: 78000,
    desc: "Chocolate chunk, flaked salt on top." },
  { id: "carrot", cat: "bites", name: "Carrot Cake", price: 148000,
    desc: "Cream cheese, walnut, cinnamon." },
];

export const byId = (id) => ITEMS.find((i) => i.id === id);
export const inCat = (cat) => ITEMS.filter((i) => i.cat === cat);
