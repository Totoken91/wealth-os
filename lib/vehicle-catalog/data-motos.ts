import type { CatalogEntry } from "./types";

/**
 * Catalogue motos — prix neuf catalogue France au lancement (TTC, € ronds).
 * Couverture insistée : Yamaha. Plus quelques Honda / Kawasaki / KTM /
 * BMW / Ducati / Triumph pour avoir un éventail réaliste.
 */
export const MOTO_CATALOG: CatalogEntry[] = [
  // ========= Yamaha — roadsters MT =========
  { id: "yamaha-mt-03", brand: "Yamaha", model: "MT-03", category: "motorcycle", segment: "moto-roadster", yearStart: 2016, msrpEur: 6300, fuel: "essence", power: 42 },
  { id: "yamaha-mt-07-2014", brand: "Yamaha", model: "MT-07", category: "motorcycle", segment: "moto-roadster", yearStart: 2014, yearEnd: 2020, msrpEur: 7000, fuel: "essence", power: 75 },
  { id: "yamaha-mt-07-2021", brand: "Yamaha", model: "MT-07", trim: "2021+", category: "motorcycle", segment: "moto-roadster", yearStart: 2021, msrpEur: 7900, fuel: "essence", power: 73 },
  { id: "yamaha-mt-09-2017", brand: "Yamaha", model: "MT-09", trim: "2017-2020", category: "motorcycle", segment: "moto-roadster", yearStart: 2017, yearEnd: 2020, msrpEur: 9300, fuel: "essence", power: 115 },
  { id: "yamaha-mt-09-2021", brand: "Yamaha", model: "MT-09", trim: "2021+", category: "motorcycle", segment: "moto-roadster", yearStart: 2021, msrpEur: 10500, fuel: "essence", power: 119 },
  { id: "yamaha-mt-09-sp", brand: "Yamaha", model: "MT-09 SP", category: "motorcycle", segment: "moto-roadster", yearStart: 2018, msrpEur: 12500, fuel: "essence", power: 119 },
  { id: "yamaha-mt-10-2022", brand: "Yamaha", model: "MT-10", trim: "2022+", category: "motorcycle", segment: "moto-roadster", yearStart: 2022, msrpEur: 14500, fuel: "essence", power: 165 },
  { id: "yamaha-mt-10-sp", brand: "Yamaha", model: "MT-10 SP", category: "motorcycle", segment: "moto-roadster", yearStart: 2017, msrpEur: 17500, fuel: "essence", power: 165 },
  { id: "yamaha-mt-125", brand: "Yamaha", model: "MT-125", category: "motorcycle", segment: "moto-roadster", yearStart: 2014, msrpEur: 4900, fuel: "essence", power: 15 },

  // ========= Yamaha — sportives R =========
  { id: "yamaha-r125", brand: "Yamaha", model: "YZF-R125", category: "motorcycle", segment: "moto-sportive", yearStart: 2008, msrpEur: 5500, fuel: "essence", power: 15 },
  { id: "yamaha-r3", brand: "Yamaha", model: "YZF-R3", category: "motorcycle", segment: "moto-sportive", yearStart: 2015, msrpEur: 6700, fuel: "essence", power: 42 },
  { id: "yamaha-r7", brand: "Yamaha", model: "YZF-R7", category: "motorcycle", segment: "moto-sportive", yearStart: 2022, msrpEur: 9300, fuel: "essence", power: 73 },
  { id: "yamaha-r6-2017", brand: "Yamaha", model: "YZF-R6", trim: "2017-2020", category: "motorcycle", segment: "moto-sportive", yearStart: 2017, yearEnd: 2020, msrpEur: 13500, fuel: "essence", power: 118 },
  { id: "yamaha-r1-2015", brand: "Yamaha", model: "YZF-R1", trim: "Crossplane 2015+", category: "motorcycle", segment: "moto-sportive", yearStart: 2015, msrpEur: 19500, fuel: "essence", power: 200 },
  { id: "yamaha-r1m", brand: "Yamaha", model: "YZF-R1M", category: "motorcycle", segment: "moto-sportive", yearStart: 2015, msrpEur: 26500, fuel: "essence", power: 200, iconic: true },

  // ========= Yamaha — XSR (heritage) =========
  { id: "yamaha-xsr-125", brand: "Yamaha", model: "XSR125", category: "motorcycle", segment: "moto-roadster", yearStart: 2021, msrpEur: 5300, fuel: "essence", power: 15 },
  { id: "yamaha-xsr-700", brand: "Yamaha", model: "XSR700", category: "motorcycle", segment: "moto-roadster", yearStart: 2016, msrpEur: 8500, fuel: "essence", power: 73 },
  { id: "yamaha-xsr-900", brand: "Yamaha", model: "XSR900", trim: "2022+", category: "motorcycle", segment: "moto-roadster", yearStart: 2022, msrpEur: 11500, fuel: "essence", power: 119 },
  { id: "yamaha-xsr-900-gp", brand: "Yamaha", model: "XSR900 GP", category: "motorcycle", segment: "moto-sportive", yearStart: 2024, msrpEur: 14500, fuel: "essence", power: 119 },

  // ========= Yamaha — trail / aventure =========
  { id: "yamaha-tenere-700", brand: "Yamaha", model: "Ténéré 700", category: "motorcycle", segment: "moto-trail", yearStart: 2019, msrpEur: 10500, fuel: "essence", power: 73 },
  { id: "yamaha-tenere-700-world-raid", brand: "Yamaha", model: "Ténéré 700", trim: "World Raid", category: "motorcycle", segment: "moto-trail", yearStart: 2022, msrpEur: 13500, fuel: "essence", power: 73 },
  { id: "yamaha-tracer-7", brand: "Yamaha", model: "Tracer 7", category: "motorcycle", segment: "moto-gt", yearStart: 2021, msrpEur: 9500, fuel: "essence", power: 73 },
  { id: "yamaha-tracer-9", brand: "Yamaha", model: "Tracer 9", category: "motorcycle", segment: "moto-gt", yearStart: 2021, msrpEur: 12000, fuel: "essence", power: 119 },
  { id: "yamaha-tracer-9-gt", brand: "Yamaha", model: "Tracer 9 GT", trim: "GT+", category: "motorcycle", segment: "moto-gt", yearStart: 2023, msrpEur: 15500, fuel: "essence", power: 119 },

  // ========= Yamaha — scooters / supersport tour =========
  { id: "yamaha-tmax-560", brand: "Yamaha", model: "TMAX 560", trim: "Tech Max", category: "motorcycle", segment: "moto-scooter", yearStart: 2020, msrpEur: 13500, fuel: "essence", power: 47 },
  { id: "yamaha-xmax-300", brand: "Yamaha", model: "XMAX 300", category: "motorcycle", segment: "moto-scooter", yearStart: 2017, msrpEur: 6500, fuel: "essence", power: 28 },
  { id: "yamaha-xmax-125", brand: "Yamaha", model: "XMAX 125", category: "motorcycle", segment: "moto-scooter", yearStart: 2017, msrpEur: 4900, fuel: "essence", power: 12 },
  { id: "yamaha-niken", brand: "Yamaha", model: "Niken GT", category: "motorcycle", segment: "moto-gt", yearStart: 2018, msrpEur: 17500, fuel: "essence", power: 115, iconic: true },

  // ========= Honda =========
  { id: "honda-cb125r", brand: "Honda", model: "CB125R", category: "motorcycle", segment: "moto-roadster", yearStart: 2018, msrpEur: 4500, fuel: "essence", power: 15 },
  { id: "honda-cb500f", brand: "Honda", model: "CB500F", category: "motorcycle", segment: "moto-roadster", yearStart: 2013, msrpEur: 6500, fuel: "essence", power: 47 },
  { id: "honda-hornet-750", brand: "Honda", model: "Hornet 750 (CB750)", category: "motorcycle", segment: "moto-roadster", yearStart: 2023, msrpEur: 8000, fuel: "essence", power: 92 },
  { id: "honda-cb650r", brand: "Honda", model: "CB650R", category: "motorcycle", segment: "moto-roadster", yearStart: 2019, msrpEur: 8800, fuel: "essence", power: 95 },
  { id: "honda-cb1000r", brand: "Honda", model: "CB1000R", category: "motorcycle", segment: "moto-roadster", yearStart: 2018, msrpEur: 13500, fuel: "essence", power: 145 },
  { id: "honda-cbr500r", brand: "Honda", model: "CBR500R", category: "motorcycle", segment: "moto-sportive", yearStart: 2013, msrpEur: 6900, fuel: "essence", power: 47 },
  { id: "honda-cbr650r", brand: "Honda", model: "CBR650R", category: "motorcycle", segment: "moto-sportive", yearStart: 2019, msrpEur: 9500, fuel: "essence", power: 95 },
  { id: "honda-fireblade-sp", brand: "Honda", model: "CBR1000RR-R Fireblade SP", category: "motorcycle", segment: "moto-sportive", yearStart: 2020, msrpEur: 28500, fuel: "essence", power: 217 },
  { id: "honda-africa-twin-1100", brand: "Honda", model: "Africa Twin CRF1100L", category: "motorcycle", segment: "moto-trail", yearStart: 2020, msrpEur: 14500, fuel: "essence", power: 102 },
  { id: "honda-africa-twin-adv-sports", brand: "Honda", model: "Africa Twin", trim: "Adventure Sports DCT", category: "motorcycle", segment: "moto-trail", yearStart: 2020, msrpEur: 18500, fuel: "essence", power: 102 },
  { id: "honda-nc750x", brand: "Honda", model: "NC750X", category: "motorcycle", segment: "moto-trail", yearStart: 2014, msrpEur: 9000, fuel: "essence", power: 58 },
  { id: "honda-forza-750", brand: "Honda", model: "Forza 750", category: "motorcycle", segment: "moto-scooter", yearStart: 2021, msrpEur: 11500, fuel: "essence", power: 58 },

  // ========= Kawasaki =========
  { id: "kawasaki-z650", brand: "Kawasaki", model: "Z650", category: "motorcycle", segment: "moto-roadster", yearStart: 2017, msrpEur: 7700, fuel: "essence", power: 68 },
  { id: "kawasaki-z900", brand: "Kawasaki", model: "Z900", category: "motorcycle", segment: "moto-roadster", yearStart: 2017, msrpEur: 9900, fuel: "essence", power: 125 },
  { id: "kawasaki-z-h2", brand: "Kawasaki", model: "Z H2", category: "motorcycle", segment: "moto-roadster", yearStart: 2020, msrpEur: 19500, fuel: "essence", power: 200 },
  { id: "kawasaki-ninja-650", brand: "Kawasaki", model: "Ninja 650", category: "motorcycle", segment: "moto-sportive", yearStart: 2017, msrpEur: 8500, fuel: "essence", power: 68 },
  { id: "kawasaki-ninja-zx10r", brand: "Kawasaki", model: "Ninja ZX-10R", category: "motorcycle", segment: "moto-sportive", yearStart: 2021, msrpEur: 19500, fuel: "essence", power: 203 },
  { id: "kawasaki-ninja-zx4rr", brand: "Kawasaki", model: "Ninja ZX-4RR", category: "motorcycle", segment: "moto-sportive", yearStart: 2023, msrpEur: 11500, fuel: "essence", power: 80 },
  { id: "kawasaki-versys-650", brand: "Kawasaki", model: "Versys 650", category: "motorcycle", segment: "moto-trail", yearStart: 2015, msrpEur: 8500, fuel: "essence", power: 68 },

  // ========= Suzuki =========
  { id: "suzuki-sv650", brand: "Suzuki", model: "SV650", category: "motorcycle", segment: "moto-roadster", yearStart: 2016, msrpEur: 7400, fuel: "essence", power: 75 },
  { id: "suzuki-gsx-s750", brand: "Suzuki", model: "GSX-S750", category: "motorcycle", segment: "moto-roadster", yearStart: 2017, msrpEur: 8500, fuel: "essence", power: 114 },
  { id: "suzuki-gsxr1000-r", brand: "Suzuki", model: "GSX-R1000R", category: "motorcycle", segment: "moto-sportive", yearStart: 2017, msrpEur: 18500, fuel: "essence", power: 202 },
  { id: "suzuki-vstrom-650", brand: "Suzuki", model: "V-Strom 650", category: "motorcycle", segment: "moto-trail", yearStart: 2017, msrpEur: 9000, fuel: "essence", power: 71 },

  // ========= KTM =========
  { id: "ktm-390-duke", brand: "KTM", model: "390 Duke", category: "motorcycle", segment: "moto-roadster", yearStart: 2017, msrpEur: 5800, fuel: "essence", power: 44 },
  { id: "ktm-790-duke", brand: "KTM", model: "790 Duke", category: "motorcycle", segment: "moto-roadster", yearStart: 2018, yearEnd: 2022, msrpEur: 9800, fuel: "essence", power: 105 },
  { id: "ktm-890-duke", brand: "KTM", model: "890 Duke", trim: "R", category: "motorcycle", segment: "moto-roadster", yearStart: 2020, msrpEur: 12500, fuel: "essence", power: 121 },
  { id: "ktm-1290-super-duke-r", brand: "KTM", model: "1290 Super Duke R", category: "motorcycle", segment: "moto-roadster", yearStart: 2014, msrpEur: 19500, fuel: "essence", power: 180 },
  { id: "ktm-rc-390", brand: "KTM", model: "RC 390", category: "motorcycle", segment: "moto-sportive", yearStart: 2014, msrpEur: 6500, fuel: "essence", power: 44 },
  { id: "ktm-890-adventure", brand: "KTM", model: "890 Adventure", category: "motorcycle", segment: "moto-trail", yearStart: 2021, msrpEur: 13500, fuel: "essence", power: 105 },
  { id: "ktm-1290-super-adv-s", brand: "KTM", model: "1290 Super Adventure S", category: "motorcycle", segment: "moto-trail", yearStart: 2017, msrpEur: 19500, fuel: "essence", power: 160 },

  // ========= BMW Motorrad =========
  { id: "bmw-r1250gs", brand: "BMW", model: "R 1250 GS", category: "motorcycle", segment: "moto-trail", yearStart: 2019, yearEnd: 2023, msrpEur: 18500, fuel: "essence", power: 136 },
  { id: "bmw-r1300gs", brand: "BMW", model: "R 1300 GS", category: "motorcycle", segment: "moto-trail", yearStart: 2024, msrpEur: 20500, fuel: "essence", power: 145 },
  { id: "bmw-s1000rr", brand: "BMW", model: "S 1000 RR", trim: "M Package", category: "motorcycle", segment: "moto-sportive", yearStart: 2019, msrpEur: 24500, fuel: "essence", power: 207 },
  { id: "bmw-m1000rr", brand: "BMW", model: "M 1000 RR", category: "motorcycle", segment: "moto-sportive", yearStart: 2021, msrpEur: 35500, fuel: "essence", power: 212, iconic: true },
  { id: "bmw-f900r", brand: "BMW", model: "F 900 R", category: "motorcycle", segment: "moto-roadster", yearStart: 2020, msrpEur: 11500, fuel: "essence", power: 105 },
  { id: "bmw-r-ninet", brand: "BMW", model: "R nineT", category: "motorcycle", segment: "moto-roadster", yearStart: 2014, msrpEur: 16500, fuel: "essence", power: 109 },

  // ========= Triumph =========
  { id: "triumph-trident-660", brand: "Triumph", model: "Trident 660", category: "motorcycle", segment: "moto-roadster", yearStart: 2021, msrpEur: 8500, fuel: "essence", power: 81 },
  { id: "triumph-street-triple-rs", brand: "Triumph", model: "Street Triple 765 RS", category: "motorcycle", segment: "moto-roadster", yearStart: 2020, msrpEur: 12500, fuel: "essence", power: 130 },
  { id: "triumph-speed-triple-1200-rs", brand: "Triumph", model: "Speed Triple 1200 RS", category: "motorcycle", segment: "moto-roadster", yearStart: 2021, msrpEur: 19500, fuel: "essence", power: 180 },
  { id: "triumph-tiger-900-gt-pro", brand: "Triumph", model: "Tiger 900", trim: "GT Pro", category: "motorcycle", segment: "moto-trail", yearStart: 2020, msrpEur: 16500, fuel: "essence", power: 95 },

  // ========= Ducati =========
  { id: "ducati-monster-937", brand: "Ducati", model: "Monster", trim: "+", category: "motorcycle", segment: "moto-roadster", yearStart: 2021, msrpEur: 12500, fuel: "essence", power: 111 },
  { id: "ducati-streetfighter-v4-s", brand: "Ducati", model: "Streetfighter V4 S", category: "motorcycle", segment: "moto-roadster", yearStart: 2020, msrpEur: 25500, fuel: "essence", power: 208 },
  { id: "ducati-panigale-v2", brand: "Ducati", model: "Panigale V2", category: "motorcycle", segment: "moto-sportive", yearStart: 2020, msrpEur: 17500, fuel: "essence", power: 155 },
  { id: "ducati-panigale-v4-s", brand: "Ducati", model: "Panigale V4 S", category: "motorcycle", segment: "moto-sportive", yearStart: 2018, msrpEur: 28500, fuel: "essence", power: 214 },
  { id: "ducati-multistrada-v4-s", brand: "Ducati", model: "Multistrada V4 S", category: "motorcycle", segment: "moto-trail", yearStart: 2021, msrpEur: 22500, fuel: "essence", power: 170 },
  { id: "ducati-scrambler-icon", brand: "Ducati", model: "Scrambler Icon 800", category: "motorcycle", segment: "moto-roadster", yearStart: 2015, msrpEur: 9500, fuel: "essence", power: 73 },

  // ========= Aprilia / MV / Royal Enfield / Harley =========
  { id: "aprilia-rs660", brand: "Aprilia", model: "RS 660", category: "motorcycle", segment: "moto-sportive", yearStart: 2021, msrpEur: 11500, fuel: "essence", power: 100 },
  { id: "aprilia-tuono-660", brand: "Aprilia", model: "Tuono 660", category: "motorcycle", segment: "moto-roadster", yearStart: 2021, msrpEur: 11000, fuel: "essence", power: 95 },
  { id: "aprilia-rsv4-factory", brand: "Aprilia", model: "RSV4 Factory", category: "motorcycle", segment: "moto-sportive", yearStart: 2021, msrpEur: 26500, fuel: "essence", power: 217 },
  { id: "mv-agusta-brutale-800-rr", brand: "MV Agusta", model: "Brutale 800 RR", category: "motorcycle", segment: "moto-roadster", yearStart: 2018, msrpEur: 16500, fuel: "essence", power: 140 },
  { id: "royal-enfield-meteor-350", brand: "Royal Enfield", model: "Meteor 350", category: "motorcycle", segment: "moto-cruiser", yearStart: 2021, msrpEur: 4500, fuel: "essence", power: 20 },
  { id: "royal-enfield-int-650", brand: "Royal Enfield", model: "Interceptor 650", category: "motorcycle", segment: "moto-roadster", yearStart: 2018, msrpEur: 6500, fuel: "essence", power: 47 },
  { id: "harley-sportster-s", brand: "Harley-Davidson", model: "Sportster S", category: "motorcycle", segment: "moto-cruiser", yearStart: 2021, msrpEur: 18500, fuel: "essence", power: 121 },
];
