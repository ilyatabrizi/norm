// The card. Placeholder prices and copy until the client sends the real one —
// the shape is what matters, and swapping the contents touches nothing else.
//
// The drink names stay in Latin on purpose. In a specialty café in Iran that is
// how they are written on the board, and they are the brand's own nouns; the
// serif they are set in is the one piece of the old Latin design that survives
// the translation. Everything a person reads *about* a drink is Persian.
//
// options: groups the bag renders on the line; `add` is added to the base price.
// tag:     a short flag drawn next to the name.

const MILK = {
  id: "milk", label: "شیر", default: "کامل",
  choices: [{ id: "کامل", add: 0 }, { id: "جو دوسر", add: 15000 },
            { id: "بادام", add: 18000 }, { id: "بدون لاکتوز", add: 15000 }],
};
const SHOT = {
  id: "shot", label: "غلظت", default: "معمولی",
  choices: [{ id: "معمولی", add: 0 }, { id: "یک شات بیشتر", add: 20000 },
            { id: "بدون کافئین", add: 0 }],
};
const SERVE = {
  id: "serve", label: "سرو", default: "گرم",
  choices: [{ id: "گرم", add: 0 }, { id: "سرد", add: 10000 }],
};
const SIZE = {
  id: "size", label: "اندازه", default: "معمولی",
  choices: [{ id: "معمولی", add: 0 }, { id: "بزرگ", add: 25000 }],
};
const SWEET = {
  id: "sweet", label: "شیرینی", default: "همان‌طور که هست",
  choices: [{ id: "همان‌طور که هست", add: 0 }, { id: "نصف شیرینی", add: 0 },
            { id: "بدون شکر", add: 0 }],
};

export const CATEGORIES = [
  { id: "espresso", name: "اسپرسو",   note: "بلند خودمان، همان لحظه" },
  { id: "brew",     name: "قهوه دمی", note: "تک‌خاستگاه، فنجان به فنجان" },
  { id: "matcha",   name: "ماچا",     note: "درجهٔ تشریفاتی، همان موقع هم‌زده" },
  { id: "cold",     name: "سرد",      note: "روی یخ" },
  { id: "bites",    name: "خوراکی",   note: "هر صبح تازه پخته می‌شود" },
];

export const ITEMS = [
  /* ------------------------------------------------------------- espresso */
  { id: "espresso", cat: "espresso", name: "Espresso", price: 68000,
    desc: "دو شات ریسترتو. کوتاه، غلیظ، بی‌عذرخواهی.", options: [SHOT] },
  { id: "americano", cat: "espresso", name: "Americano", price: 82000,
    desc: "اسپرسو که با آب داغ بلندتر شده.", options: [SHOT, SERVE] },
  { id: "cortado", cat: "espresso", name: "Cortado", price: 92000,
    desc: "نصف اسپرسو، نصف شیر گرم.", options: [MILK, SHOT] },
  { id: "cappuccino", cat: "espresso", name: "Cappuccino", price: 98000,
    desc: "شش اونس، فوم خشک، کاکائو اگر بخواهید.", options: [MILK, SHOT] },
  { id: "flat-white", cat: "espresso", name: "Flat White", price: 110000,
    desc: "دو شات ریسترتو زیر یک لایه میکروفوم.", options: [MILK, SHOT] },
  { id: "latte", cat: "espresso", name: "Latte", price: 110000,
    desc: "همان بلند و آرام همیشگی.", options: [MILK, SHOT, SERVE, SIZE] },
  { id: "spanish", cat: "espresso", name: "Spanish Latte", price: 132000,
    desc: "شیر عسلی، اسپرسو، یک نوک انگشت نمک.", options: [MILK, SERVE, SIZE] },
  { id: "mocha", cat: "espresso", name: "Mocha", price: 138000,
    desc: "شکلات تلخ هفتاد درصد، بخار خورده تا ته فنجان.", options: [MILK, SHOT, SERVE] },
  { id: "caramel-macchiato", cat: "espresso", name: "Caramel Macchiato", price: 142000,
    desc: "وانیل، شیر، و اسپرسو که آخر از همه ریخته می‌شود.", options: [MILK, SERVE, SIZE] },

  /* ----------------------------------------------------------------- brew */
  { id: "v60", cat: "brew", name: "V60", price: 128000,
    desc: "تک‌خاستگاه چرخشی. بپرسید امروز کدام است.", tag: "فیلتر" },
  { id: "chemex", cat: "brew", name: "Chemex", price: 148000,
    desc: "برای دو نفر دم می‌کشد، سر میز ریخته می‌شود.", tag: "دو نفره" },
  { id: "cold-brew", cat: "brew", name: "Cold Brew", price: 118000,
    desc: "هجده ساعت در آب سرد. هیچ چیز اضافه نشده.", options: [SIZE] },
  { id: "espresso-tonic", cat: "brew", name: "Espresso Tonic", price: 135000,
    desc: "تونیک، یخ، و یک دوبل از بالا.", tag: "جدید" },

  /* --------------------------------------------------------------- matcha */
  { id: "matcha-latte", cat: "matcha", name: "Matcha Latte", price: 158000,
    desc: "درجهٔ تشریفاتی، اول هم‌زده، بعد شیر.", options: [MILK, SERVE, SIZE, SWEET],
    tag: "خودمان" },
  { id: "dirty-matcha", cat: "matcha", name: "Dirty Matcha", price: 175000,
    desc: "ماچا لاته با یک شات که از وسطش رد می‌شود.", options: [MILK, SERVE, SWEET] },
  { id: "strawberry-matcha", cat: "matcha", name: "Strawberry Matcha", price: 182000,
    desc: "توت‌فرنگی له‌شده زیر ماچای سرد.", options: [MILK, SWEET] },
  { id: "hojicha", cat: "matcha", name: "Hojicha Latte", price: 152000,
    desc: "چای سبز برشته. برشته و کم‌کافئین.", options: [MILK, SERVE, SWEET] },
  { id: "matcha-shot", cat: "matcha", name: "Straight Matcha", price: 120000,
    desc: "فقط با آب هم‌زده. همان‌طور که باید باشد.", options: [SERVE] },

  /* ----------------------------------------------------------------- cold */
  { id: "iced-latte", cat: "cold", name: "Iced Latte", price: 118000,
    desc: "دو شات، شیر سرد، و یخ زیاد.", options: [MILK, SHOT, SIZE] },
  { id: "affogato", cat: "cold", name: "Affogato", price: 125000,
    desc: "بستنی وانیلی که در اسپرسو غرق می‌شود.", options: [SHOT] },
  { id: "frappe", cat: "cold", name: "Coffee Frappé", price: 145000,
    desc: "میکس‌شده، غلیظ، آن‌قدر سرد که دندان تیر بکشد.", options: [MILK, SWEET] },
  { id: "lemonade", cat: "cold", name: "Mint Lemonade", price: 98000,
    desc: "آبلیموی تازه، نعنا، سودا.", options: [SWEET] },

  /* ---------------------------------------------------------------- bites */
  { id: "basque", cat: "bites", name: "Basque Cheesecake", price: 165000,
    desc: "روی سوخته، وسط نرم. هر صبح تازه.", tag: "هر روز" },
  { id: "brownie", cat: "bites", name: "Walnut Brownie", price: 128000,
    desc: "تیره، سنگین، گرم اگر بخواهید." },
  { id: "croissant", cat: "bites", name: "Butter Croissant", price: 98000,
    desc: "همین‌جا ورق می‌خورد، روزی دو بار پخته می‌شود." },
  { id: "cookie", cat: "bites", name: "Sea Salt Cookie", price: 78000,
    desc: "تکه‌های شکلات، نمک دریا روی آن." },
  { id: "carrot", cat: "bites", name: "Carrot Cake", price: 148000,
    desc: "پنیر خامه‌ای، گردو، دارچین." },
];

export const byId = (id) => ITEMS.find((i) => i.id === id);
export const inCat = (cat) => ITEMS.filter((i) => i.cat === cat);
