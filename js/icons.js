// Every icon in the app, drawn on the same 24px grid at the same hairline
// weight as the rules in the layout. Nothing imported, nothing rasterised.

const svg = (d, extra = "") =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"
    stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"${extra}>${d}</svg>`;

export const ICON = {
  home: svg('<path d="M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5h-5v5H5a1 1 0 0 1-1-1z"/>'),
  menu: svg('<path d="M4 7h16M4 12h16M4 17h10"/>'),
  // the mark's eye, reduced to a line drawing
  checkin: svg('<path d="M2.5 12S6 6.5 12 6.5 21.5 12 21.5 12 18 17.5 12 17.5 2.5 12 2.5 12Z"/>' +
               '<circle cx="12" cy="12" r="2.4"/>'),
  account: svg('<circle cx="12" cy="8" r="3.4"/><path d="M4.8 20c1.1-3.6 3.9-5.4 7.2-5.4s6.1 1.8 7.2 5.4"/>'),
  bag: svg('<path d="M5.6 8h12.8l-1 11.2a1.6 1.6 0 0 1-1.6 1.4H8.2a1.6 1.6 0 0 1-1.6-1.4z"/>' +
           '<path d="M9 8V6.6a3 3 0 0 1 6 0V8"/>'),
  search: svg('<circle cx="11" cy="11" r="6.2"/><path d="m20 20-3.6-3.6"/>'),
  check: svg('<path d="m5 12.5 4.5 4.5L19 7.5"/>'),
  map: svg('<path d="M12 21s7-6.3 7-11a7 7 0 1 0-14 0c0 4.7 7 11 7 11Z"/><circle cx="12" cy="10" r="2.6"/>'),
  phone: svg('<path d="M6.2 3.6h3l1.5 4-2 1.4a12 12 0 0 0 5.3 5.3l1.4-2 4 1.5v3a1.8 1.8 0 0 1-2 1.8A15.8 15.8 0 0 1 4.4 5.6a1.8 1.8 0 0 1 1.8-2Z"/>'),
  instagram: svg('<rect x="3.6" y="3.6" width="16.8" height="16.8" rx="4.6"/>' +
                 '<circle cx="12" cy="12" r="3.9"/><circle cx="16.9" cy="7.1" r=".9" fill="currentColor"/>'),
  share: svg('<path d="M12 15.5V4m0 0L8.2 7.8M12 4l3.8 3.8"/><path d="M5.5 13v6.2a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1V13"/>'),
  trash: svg('<path d="M5.5 7h13M10 7V5.4h4V7m-7 0 .8 12.2a1.4 1.4 0 0 0 1.4 1.3h5.6a1.4 1.4 0 0 0 1.4-1.3L17.5 7"/>'),
  install: svg('<path d="M12 4v10m0 0 4-4m-4 4-4-4"/><path d="M5 16v2.5a1.5 1.5 0 0 0 1.5 1.5h11a1.5 1.5 0 0 0 1.5-1.5V16"/>'),
};

export const icon = (name) => ICON[name] || "";
