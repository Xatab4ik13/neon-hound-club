// Статический справочник мото-марок и моделей.
// Без внешних API — открывается мгновенно, кеш не нужен.
// Если марки/модели нет — юзер вводит вручную через ComboboxWithCustom.
// Обновлять руками: дописать в MOTO_CATALOG.

export const MOTO_CATALOG: Record<string, string[]> = {
  // ── Japan ──────────────────────────────────────────────
  Honda: [
    "CB125R", "CB300R", "CB500F", "CB500X", "CB650R", "CBR125R", "CBR250RR",
    "CBR300R", "CBR500R", "CBR600RR", "CBR650R", "CBR1000RR-R Fireblade",
    "CRF250L", "CRF300L", "CRF300 Rally", "CRF450L", "CRF1100L Africa Twin",
    "NC750X", "X-ADV", "Forza 350", "Forza 750", "PCX 125", "PCX 160",
    "Rebel 300", "Rebel 500", "Rebel 1100", "Shadow 750",
    "Gold Wing", "VFR800", "Transalp 750", "NT1100", "Hornet 750", "Monkey", "Grom",
  ],
  Yamaha: [
    "YZF-R1", "YZF-R3", "YZF-R6", "YZF-R7", "YZF-R15", "YZF-R125",
    "MT-03", "MT-07", "MT-09", "MT-10", "MT-125",
    "Tracer 7", "Tracer 9", "Tenere 700", "Super Tenere 1200",
    "XSR125", "XSR700", "XSR900",
    "WR250F", "WR450F", "WR250R", "YZ250F", "YZ450F",
    "TMAX", "XMAX 125", "XMAX 300", "XMAX 400",
    "Bolt", "V-Star 250", "V-Star 950",
  ],
  Suzuki: [
    "GSX-R125", "GSX-R600", "GSX-R750", "GSX-R1000R", "GSX-S125", "GSX-S750",
    "GSX-S1000", "GSX-S1000GT", "GSX-8S", "GSX-8R", "Hayabusa",
    "SV650", "V-Strom 250", "V-Strom 650", "V-Strom 800DE", "V-Strom 1050",
    "DR-Z400", "DR650S", "RM-Z250", "RM-Z450",
    "Burgman 200", "Burgman 400", "Burgman 650",
    "Katana", "Boulevard M109R", "Boulevard C50",
  ],
  Kawasaki: [
    "Ninja 125", "Ninja 400", "Ninja 500", "Ninja 650", "Ninja ZX-4R",
    "Ninja ZX-6R", "Ninja ZX-10R", "Ninja ZX-14R", "Ninja H2", "Ninja H2 SX",
    "Ninja 1000SX",
    "Z125", "Z400", "Z500", "Z650", "Z650RS", "Z900", "Z900RS", "Z H2",
    "Versys 300", "Versys 650", "Versys 1000",
    "KLR 650", "KLX 230", "KLX 300", "KX 250", "KX 450",
    "Vulcan S", "Vulcan 900", "W800", "Eliminator 500",
  ],

  // ── Europe ─────────────────────────────────────────────
  BMW: [
    "G 310 R", "G 310 GS", "F 750 GS", "F 800 GS", "F 850 GS", "F 900 R",
    "F 900 XR", "R 1250 GS", "R 1300 GS", "R 1250 RT", "R nineT",
    "R nineT Scrambler", "R 18", "R 12", "K 1600 GT", "K 1600 GTL",
    "S 1000 R", "S 1000 RR", "S 1000 XR", "M 1000 RR", "CE 04",
  ],
  Ducati: [
    "Panigale V2", "Panigale V4", "Panigale V4 R", "Panigale V4 S",
    "Streetfighter V2", "Streetfighter V4", "Streetfighter V4 S",
    "Monster", "Monster SP", "Monster Plus",
    "Multistrada V2", "Multistrada V4", "Multistrada V4 S", "Multistrada V4 Pikes Peak",
    "Multistrada V4 Rally", "DesertX", "Hypermotard 950",
    "Scrambler Icon", "Scrambler Nightshift", "Scrambler 1100",
    "Diavel V4", "XDiavel",
  ],
  KTM: [
    "125 Duke", "200 Duke", "250 Duke", "390 Duke", "690 Duke", "790 Duke",
    "890 Duke", "990 Duke", "1290 Super Duke R", "1290 Super Duke GT",
    "RC 125", "RC 390", "RC 8C",
    "390 Adventure", "390 SMC R", "790 Adventure", "890 Adventure", "890 Adventure R",
    "990 Adventure", "1290 Super Adventure S", "1290 Super Adventure R",
    "250 EXC", "300 EXC", "350 EXC-F", "450 EXC-F", "500 EXC-F",
    "250 SX-F", "350 SX-F", "450 SX-F",
    "450 Rally", "690 SMC R", "690 Enduro R",
  ],
  Husqvarna: [
    "Svartpilen 125", "Svartpilen 250", "Svartpilen 401", "Svartpilen 701",
    "Vitpilen 125", "Vitpilen 401", "Vitpilen 701",
    "Norden 901", "Norden 901 Expedition",
    "TE 150", "TE 250", "TE 300", "FE 250", "FE 350", "FE 450", "FE 501",
    "FC 250", "FC 350", "FC 450", "TC 250",
  ],
  Aprilia: [
    "RS 125", "RS 457", "RS 660", "RSV4", "RSV4 Factory",
    "Tuono 125", "Tuono 660", "Tuono V4", "Tuono V4 Factory",
    "Tuareg 660", "SR GT 125", "SR GT 200", "Shiver 900", "Dorsoduro 900",
  ],
  "MV Agusta": [
    "Brutale 800", "Brutale 1000 RR", "Dragster 800", "F3 800", "F3 RR",
    "Superveloce 800", "Turismo Veloce 800", "Rush 1000", "Lucky Explorer 5.5",
    "Lucky Explorer 9.5", "Enduro Veloce",
  ],
  Triumph: [
    "Speed 400", "Scrambler 400 X", "Trident 660", "Daytona 660",
    "Tiger Sport 660", "Street Triple 765 R", "Street Triple 765 RS",
    "Street Triple 765 Moto2", "Speed Triple 1200 RS", "Speed Triple 1200 RR",
    "Tiger 850 Sport", "Tiger 900 GT", "Tiger 900 Rally", "Tiger 1200 GT",
    "Tiger 1200 Rally Explorer",
    "Bonneville T100", "Bonneville T120", "Speedmaster", "Bobber", "Thruxton RS",
    "Scrambler 900", "Scrambler 1200 X", "Scrambler 1200 XE",
    "Rocket 3 R", "Rocket 3 GT", "TF 250-X",
  ],
  "Royal Enfield": [
    "Hunter 350", "Classic 350", "Meteor 350", "Bullet 350",
    "Scram 411", "Himalayan 450", "Interceptor 650", "Continental GT 650",
    "Super Meteor 650", "Shotgun 650",
  ],
  "Moto Guzzi": [
    "V7 Stone", "V7 Special", "V9 Bobber", "V9 Roamer", "V85 TT",
    "V100 Mandello", "Stelvio", "Audace", "Eldorado", "MGX-21",
  ],
  Benelli: [
    "TNT 125", "TNT 135", "TNT 249S", "TNT 600", "Leoncino 250", "Leoncino 500",
    "Leoncino 800", "TRK 251", "TRK 502", "TRK 502X", "TRK 702", "TRK 702X",
    "502C", "752S", "Imperiale 400",
  ],
  CFMoto: [
    "150NK", "300NK", "300SR", "450NK", "450SR", "450MT", "650NK", "650GT",
    "650MT", "700CL-X", "700MT", "800NK", "800MT", "1250TR-G",
    "Papio", "Papio Racer", "Papio CL", "Papio SS",
  ],
  Voge: [
    "300R", "300DS", "300DSX", "300AC", "500R", "525DSX", "525ACX",
    "650DS", "650DSX", "900DSX",
  ],

  // ── USA ────────────────────────────────────────────────
  "Harley-Davidson": [
    "Street Bob", "Softail Standard", "Fat Bob", "Fat Boy", "Heritage Classic",
    "Low Rider S", "Low Rider ST", "Breakout",
    "Sportster S", "Nightster", "Nightster Special",
    "Road King", "Road Glide", "Street Glide", "Electra Glide", "Ultra Limited",
    "CVO Road Glide", "CVO Street Glide", "CVO Pan America",
    "Pan America 1250", "Pan America 1250 Special",
    "X 350", "X 500",
  ],
  Indian: [
    "Scout", "Scout Bobber", "Scout Sixty", "Scout Rogue",
    "FTR 1200", "FTR S", "FTR R Carbon", "FTR Rally", "FTR Sport",
    "Chief", "Chief Bobber", "Chief Dark Horse", "Super Chief",
    "Springfield", "Chieftain", "Roadmaster", "Pursuit", "Challenger",
  ],
  Zero: [
    "FX", "FXE", "S", "SR", "SR/F", "SR/S", "DS", "DSR", "DSR/X",
  ],

  // ── India / Asia ───────────────────────────────────────
  Bajaj: [
    "Pulsar NS125", "Pulsar NS160", "Pulsar NS200", "Pulsar RS200",
    "Pulsar N250", "Pulsar F250", "Dominar 250", "Dominar 400", "Avenger 220",
  ],
  TVS: [
    "Apache RTR 160", "Apache RTR 200 4V", "Apache RR 310", "Ronin",
    "Raider 125", "Jupiter", "NTorq 125",
  ],
  Hero: [
    "Splendor Plus", "Glamour", "Xpulse 200", "Xpulse 200 4V", "Xtreme 160R",
    "Xtreme 200S", "Karizma XMR", "Mavrick 440",
  ],
  Hyosung: [
    "GT250R", "GT650R", "GV250 Aquila", "GV650 Aquila", "GD250N",
  ],

  // ── China ──────────────────────────────────────────────
  Kymco: [
    "Agility 125", "People S 125", "Like 125", "AK 550", "AK 550 Premium",
    "DT X360", "Downtown 350i", "Xciting S 400i",
  ],
  SYM: [
    "Jet 14", "Symphony ST 200", "Fiddle III", "Cruisym 300", "Maxsym TL 500",
    "ADXTG 400", "NH X 125",
  ],

  // ── Vintage / Other Europe ─────────────────────────────
  Vespa: [
    "Primavera 50", "Primavera 125", "Primavera 150", "Sprint 125", "Sprint 150",
    "GTS 125", "GTS 300", "GTS Super 300", "GTV 300", "Elettrica",
  ],
  Piaggio: [
    "Liberty 125", "Medley 125", "Beverly 300", "Beverly 400", "MP3 400", "MP3 530",
  ],
  Jawa: ["Jawa 350", "Jawa 42", "Perak", "Forty Two"],
  Norton: ["Commando 961", "V4SV", "V4CR"],
  "Moto Morini": ["X-Cape 650", "Seiemmezzo SCR", "Seiemmezzo STR", "Corsaro ZZ"],
  Bimota: ["Tesi H2", "KB4", "KB4 RC"],
  Beta: ["RR 125", "RR 250", "RR 300", "RR 350", "RR 390", "RR 430", "RR 480", "Xtrainer 300"],
  GasGas: ["EC 250", "EC 300", "EC 350F", "EX 250F", "EX 350F", "MC 250F", "MC 450F"],
  Sherco: ["125 SE", "250 SE", "300 SE", "300 SEF", "450 SEF"],
  Fantic: ["XEF 250", "XEF 450", "Caballero 500", "Caballero 700"],
  Mash: ["Seventy 125", "Five Hundred", "Black Seven 125", "X-Ride 650"],
  SWM: ["Superdual 600", "Outlaw 500", "Six Days 500", "Gran Milano 440"],
  "Peugeot Motocycles": ["Django 125", "Tweet 125", "Pulsion 125", "Metropolis 400"],

  // ── Russia / Belarus / USSR legacy ─────────────────────
  Ural: ["Gear Up", "cT", "Sportsman", "M70", "Wolf", "Tourist", "Patrol"],
  ИЖ: ["Юпитер-5", "Планета-5", "Юпитер-6", "ИЖ-49", "Планета Спорт", "Юпитер-3"],
  Минск: ["X200", "X250", "C4 200", "C4 250", "D4 125", "TRX 300i", "M1NSK 250", "Lider 200", "Goose 250"],
  Восход: ["3М", "3М-01", "Сова"],
  "Урал-Soviet": ["М-72", "М-67", "ИМЗ-8.103"],
  Днепр: ["МТ-9", "МТ-10", "МТ-11", "МТ-16", "К-750"],
  "ЗиД": ["ЗиД-200", "Курьер"],

  // ── РФ / СНГ сборка и дистрибуция (китайские платформы) ─
  Stels: [
    "Flex 250", "Flame 200", "Trigger 50", "Trigger 125", "Tactic",
    "ATV 600 Leopard", "Delta 150", "Validator 300", "Validator 700", "Benelli TNT 125",
  ],
  Racer: [
    "Panther RC250XZR", "Skyway RC250CK", "Storm RC200CK", "Tiger RC250XZR",
    "Magnum RC250GY-C2", "Nitro RC150-23", "Ranger RC200GY-C2", "Trophy RC150-23X",
    "Enduro RC250-GY8X", "Flash RC150CF", "Tourer RC250CR", "Hooligan",
  ],
  Motoland: [
    "XR250", "XR250 LITE", "XR300 ENDURO", "WRX250 LITE", "WRX250", "WRX300",
    "Enduro ST 250", "FX 250", "FX 300", "Bandit 250", "Blackbull 250",
    "Forester 250", "TT 250", "MX125", "MX140",
  ],
  Avantis: [
    "A2 Lux", "A7 Lux", "Enduro 250", "Enduro 250 21/18", "Enduro 250 21/18 (CB250-F/172FMM-3A)",
    "Enduro 300 Pro", "Enduro 300 CARB", "Enduro 450 Carb", "FX 250", "FX 7",
    "Dakar 250", "Dakar 300", "TTR 250", "Vento 250",
  ],
  Regulmoto: [
    "Sport-003", "Sport-003 Pro", "Sport-005", "Sport-009", "Sport-016",
    "Athlete 250", "Athlete 300", "ZF 250", "ZR 250", "TE-300", "Aqua 200",
  ],
  Apollo: [
    "RXF Freeride 150", "RFZ 150", "RFZ 250", "DB-X18", "AGB-37", "RFZ Open 150",
    "Orion 250", "Z20 Max", "AGB-X18 250",
  ],
  Kayo: [
    "T2 250", "T4 250", "T6 250", "K1 250", "K6 250", "K6-R 250",
    "TT140", "TT125", "MR150", "MR250 Enduro", "Basic YX125",
  ],
  BSE: [
    "M2 125", "M2 250", "M5 250", "PH10 Enduro", "RTC-300R", "S2 Enduro",
    "S6 250", "Z3 200", "Z6 250", "Z7 250", "T7 Enduro",
  ],
  Progasi: [
    "Smart 150", "Race 250", "Race Pro 300", "Palma 250", "Spirit 250",
    "Super Max 250", "Hardway 250", "Hardway 300",
  ],
  Irbis: [
    "TTR 125", "TTR 250", "TTR 250R", "XR 250R", "XR 300R", "Pitbike TTR 125",
    "Z50R", "Intruder 200", "Garpia 250", "Virago 250", "GR 250", "VJ 250",
  ],
  Lifan: [
    "KP 150", "KP 200", "KP 250", "KPR 200", "KPR 250", "KPS 200", "KPT 200",
    "X-Pect 200", "KPV 150", "KPX 250", "LF200-10S", "LF250 V-Twin",
  ],
  Patron: [
    "Sport 250", "Sport 300", "Track 250", "X-Spirit 250", "Vanguard 250",
  ],

  // ── Китай: бренды, активно продающиеся в РФ ────────────
  Kove: [
    "321R", "321RR", "450R", "450 Rally", "450 Rally Pro", "500X", "800X", "800X Pro",
  ],
  QJMotor: [
    "SRK 250", "SRK 350", "SRK 400", "SRK 600", "SRK 700", "SRK 921",
    "SRT 550", "SRT 750", "SRT 800", "SRG 600", "SRC 500", "SRV 550",
    "SVT 650", "Chaser 250",
  ],
  Zontes: [
    "ZT125-G1", "ZT125-U", "ZT155-G1", "ZT155-U", "ZT250-S", "ZT250-R",
    "ZT310-T", "ZT310-X", "ZT310-R", "ZT310-V", "ZT350-T", "ZT350-D",
    "ZT350-GK", "ZT703F", "ZT703RR",
  ],
  Wuyang: ["WY125", "WY150", "WY200"],
  Geon: [
    "Pantera 250", "Stinger 250", "Terrax 250", "Nac 250", "Tossa 250",
    "X-Road 250", "X-Road 700", "X-Pit 150",
  ],
  "Senke": ["SK150", "SK200", "SK250", "SK300"],
  Haojue: ["DR160", "DR300", "TR300", "KA135", "KA150"],
  Loncin: ["Voge 300R", "GP 250", "GP 450", "LX250-15", "LX300-6F"],
  Qianjiang: ["QJ250", "QJ350", "SRK 600", "SRG 600", "QJ600GS", "QJ150-19A"],

  // ── Электро / прочее ───────────────────────────────────
  "Super Soco": ["TC", "TC Max", "TS Street Hunter", "CPx", "Wanderer"],
  Talaria: ["Sting", "Sting R MX4", "Sting R MX3", "XXX", "Dragon"],
  Surron: ["Light Bee X", "Light Bee S", "Storm Bee", "Ultra Bee"],

  // ── Япония / Европа: дополнения по популярному в РФ ────
  PitsterPro: ["LXR 150", "LXR 160", "X4R 125", "X5R 150"],
  YCF: ["Bigy 150 MX", "Bigy 190 MX", "Pilot F125", "Factory 88", "SM F150"],
};

/** Отсортированный список всех марок. */
export const MOTO_BRANDS: string[] = Object.keys(MOTO_CATALOG).sort((a, b) =>
  a.localeCompare(b, "ru"),
);

/** Модели марки (или пустой массив). Регистр марки не важен. */
export function getModelsForBrand(brand: string): string[] {
  if (!brand) return [];
  const key = MOTO_BRANDS.find(
    (b) => b.toLowerCase() === brand.trim().toLowerCase(),
  );
  if (!key) return [];
  return [...MOTO_CATALOG[key]].sort((a, b) => a.localeCompare(b));
}
