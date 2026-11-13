export const LANDING_LANGS = ["it", "en", "es", "fr", "de", "ru", "pt", "ar", "th"] as const;
export type LandingLang = (typeof LANDING_LANGS)[number];
export const LANDING_LANG_LABELS: Record<LandingLang, string> = {
  it: "Italiano",
  en: "English",
  es: "Español",
  fr: "Français",
  de: "Deutsch",
  ru: "Русский",
  pt: "Português",
  ar: "العربية",
  th: "ไทย",
};

const KEY = "traduchat:landing-lang";

/** Saved choice first, then browser language, else Italian. Browser only. */
export function detectLandingLang(): LandingLang {
  try {
    const saved = window.localStorage.getItem(KEY);
    if (saved && (LANDING_LANGS as readonly string[]).includes(saved)) return saved as LandingLang;
  } catch {
    /* ignore */
  }
  const first = (navigator.language || "it").toLowerCase().split(/[-_]/)[0] ?? "it";
  return (LANDING_LANGS as readonly string[]).includes(first) ? (first as LandingLang) : "it";
}

export function saveLandingLang(lang: LandingLang) {
  try {
    window.localStorage.setItem(KEY, lang);
  } catch {
    /* ignore */
  }
}

type Copy = {
  login: string;
  kicker: string;
  title: string;
  intro: string;
  features: { title: string; text: string }[];
  prices: string;
  pricesText: (packs: string) => string;
  details: string;
  account: string;
  terms: string;
  refunds: string;
  privacy: string;
  credits: string;
  at: string;
  languagesTitle: string;
  languagesText: string;
  contact: string;
};

export const LANDING_COPY: Record<LandingLang, Copy> = {
  it: {
    login: "Accedi",
    kicker: "Chat · Traduzione istantanea · Videocall",
    title: "Comunica istantaneamente con chiunque nel mondo",
    intro: "Scrivi nella tua lingua e l'altra persona legge nella sua, all'istante. Con un account le tue conversazioni e le tue traduzioni restano salvate.",
    features: [
      { title: "Due telefoni, una conversazione", text: "Fai inquadrare il QR code: ognuno scrive nella sua lingua e legge nella propria." },
      { title: "Traduzioni da inviare", text: "Traduci testi lunghi e scarica il PDF con originale e traduzione affiancati." },
      { title: "Tutto salvato nel tuo account", text: "Conversazioni e traduzioni restano nel tuo profilo: le ritrovi da qualsiasi telefono." },
      { title: "Videochiamate tradotte", text: "Vedi e senti l'altra persona in videochiamata: la chat della conversazione resta tradotta nella tua lingua." },
    ],
    prices: "Prezzi",
    pricesText: (p) => `Chat e traduzioni gratis. Assistente IA: 10 crediti in regalo, poi ${p}, senza scadenza.`,
    details: "Dettagli",
    account: "Serve un account per chattare e tradurre: così ritrovi tutto dove l'hai lasciato.",
    terms: "Termini",
    refunds: "Rimborsi",
    privacy: "Privacy e GDPR",
    credits: "crediti",
    at: "a",
    languagesTitle: "Lingue disponibili",
    languagesText: "Scrivi e leggi in una di queste lingue, anche quelle che le altre app non traducono.",
    contact: "Contatti",
  },
  en: {
    login: "Sign in",
    kicker: "Chat · Instant translation · Video calls",
    title: "Talk with anyone in the world, instantly",
    intro: "Write in your language and the other person reads in theirs, instantly. With an account your conversations and translations stay saved.",
    features: [
      { title: "Two phones, one conversation", text: "Scan the QR code: everyone writes in their language and reads in their own." },
      { title: "Translations to send", text: "Translate long texts and download a PDF with original and translation side by side." },
      { title: "Everything saved in your account", text: "Conversations and translations stay in your profile: find them on any phone." },
      { title: "Translated video calls", text: "See and hear the other person on a video call: the conversation chat stays translated into your language." },
    ],
    prices: "Pricing",
    pricesText: (p) => `Chat and translations are free. AI assistant: 10 free credits, then ${p}, never expiring.`,
    details: "Details",
    account: "You need an account to chat and translate, so you find everything where you left it.",
    terms: "Terms",
    refunds: "Refunds",
    privacy: "Privacy & GDPR",
    credits: "credits",
    at: "for",
    languagesTitle: "Available languages",
    languagesText: "Write and read in any of these languages, including ones other apps don't translate.",
    contact: "Contact",
  },
  es: {
    login: "Entrar",
    kicker: "Chat · Traducción instantánea · Videollamadas",
    title: "Comunícate al instante con cualquier persona del mundo",
    intro: "Escribe en tu idioma y la otra persona lee en el suyo, al instante. Con una cuenta tus conversaciones y traducciones quedan guardadas.",
    features: [
      { title: "Dos teléfonos, una conversación", text: "Escanea el código QR: cada uno escribe en su idioma y lee en el suyo." },
      { title: "Traducciones para enviar", text: "Traduce textos largos y descarga el PDF con original y traducción lado a lado." },
      { title: "Todo guardado en tu cuenta", text: "Conversaciones y traducciones quedan en tu perfil: encuéntralas desde cualquier teléfono." },
      { title: "Videollamadas traducidas", text: "Vea y oiga a la otra persona en videollamada: el chat de la conversación sigue traducido a tu idioma." },
    ],
    prices: "Precios",
    pricesText: (p) => `Chat y traducciones gratis. Asistente IA: 10 créditos de regalo, luego ${p}, sin caducidad.`,
    details: "Detalles",
    account: "Necesitas una cuenta para chatear y traducir: así lo encuentras todo donde lo dejaste.",
    terms: "Términos",
    refunds: "Reembolsos",
    privacy: "Privacidad y RGPD",
    credits: "créditos",
    at: "por",
    languagesTitle: "Idiomas disponibles",
    languagesText: "Escribe y lee en cualquiera de estos idiomas, también los que otras apps no traducen.",
    contact: "Contacto",
  },
  fr: {
    login: "Se connecter",
    kicker: "Chat · Traduction instantanée · Visio",
    title: "Communique instantanément avec qui tu veux dans le monde",
    intro: "Écris dans ta langue et l'autre personne lit dans la sienne, instantanément. Avec un compte, tes conversations et traductions restent enregistrées.",
    features: [
      { title: "Deux téléphones, une conversation", text: "Scanne le QR code : chacun écrit dans sa langue et lit dans la sienne." },
      { title: "Des traductions à envoyer", text: "Traduis de longs textes et télécharge le PDF avec l'original et la traduction côte à côte." },
      { title: "Tout enregistré dans ton compte", text: "Conversations et traductions restent dans ton profil : retrouve-les sur n'importe quel téléphone." },
      { title: "Appels vidéo traduits", text: "Vois et entends l'autre personne en appel vidéo : le chat de la conversation reste traduit dans ta langue." },
    ],
    prices: "Tarifs",
    pricesText: (p) => `Chat et traductions gratuits. Assistant IA : 10 crédits offerts, puis ${p}, sans expiration.`,
    details: "Détails",
    account: "Un compte est nécessaire pour discuter et traduire : tu retrouves tout là où tu l'as laissé.",
    terms: "Conditions",
    refunds: "Remboursements",
    privacy: "Confidentialité et RGPD",
    credits: "crédits",
    at: "pour",
    languagesTitle: "Langues disponibles",
    languagesText: "Écris et lis dans l'une de ces langues, même celles que les autres applis ne traduisent pas.",
    contact: "Contact",
  },
  de: {
    login: "Anmelden",
    kicker: "Chat · Sofortübersetzung · Videoanrufe",
    title: "Sprich sofort mit jedem auf der Welt",
    intro: "Schreib in deiner Sprache, die andere Person liest in ihrer – sofort. Mit einem Konto bleiben deine Gespräche und Übersetzungen gespeichert.",
    features: [
      { title: "Zwei Handys, ein Gespräch", text: "QR-Code scannen: Jeder schreibt und liest in seiner eigenen Sprache." },
      { title: "Übersetzungen zum Versenden", text: "Übersetze lange Texte und lade das PDF mit Original und Übersetzung nebeneinander herunter." },
      { title: "Alles in deinem Konto gespeichert", text: "Gespräche und Übersetzungen bleiben in deinem Profil – auf jedem Handy." },
      { title: "Übersetzte Videoanrufe", text: "Siehst und hörst die andere Person im Videoanruf – der Chat bleibt in deiner Sprache übersetzt." },
    ],
    prices: "Preise",
    pricesText: (p) => `Chat und Übersetzungen kostenlos. KI-Assistent: 10 Gratis-Credits, dann ${p}, ohne Ablauf.`,
    details: "Details",
    account: "Zum Chatten und Übersetzen brauchst du ein Konto – so findest du alles wieder.",
    terms: "AGB",
    refunds: "Erstattungen",
    privacy: "Datenschutz & DSGVO",
    credits: "Credits",
    at: "für",
    languagesTitle: "Verfügbare Sprachen",
    languagesText: "Schreib und lies in einer dieser Sprachen – auch in denen, die andere Apps nicht übersetzen.",
    contact: "Kontakt",
  },
  ru: {
    login: "Войти",
    kicker: "Чат · Мгновенный перевод · Видеозвонки",
    title: "Общайтесь мгновенно с любым человеком в мире",
    intro: "Пишите на своём языке, а собеседник читает на своём — мгновенно. С аккаунтом ваши разговоры и переводы сохраняются.",
    features: [
      { title: "Два телефона — один разговор", text: "Отсканируйте QR-код: каждый пишет на своём языке и читает на своём." },
      { title: "Переводы для отправки", text: "Переводите длинные тексты и скачивайте PDF с оригиналом и переводом рядом." },
      { title: "Всё сохранено в вашем аккаунте", text: "Разговоры и переводы остаются в вашем профиле: найдёте их с любого телефона." },
      { title: "Видеозвонки с переводом", text: "Видите и слышите собеседника в видеозвонке: чат разговора остаётся переведённым на ваш язык." },
    ],
    prices: "Цены",
    pricesText: (p) => `Чат и переводы бесплатны. ИИ-ассистент: 10 кредитов в подарок, затем ${p}, без срока действия.`,
    details: "Подробнее",
    account: "Для чата и перевода нужен аккаунт: так вы найдёте всё там, где оставили.",
    terms: "Условия",
    refunds: "Возвраты",
    privacy: "Конфиденциальность и GDPR",
    credits: "кредиты",
    at: "за",
    languagesTitle: "Доступные языки",
    languagesText: "Пишите и читайте на любом из этих языков, даже на тех, которые другие приложения не переводят.",
    contact: "Контакты",
  },
  pt: {
    login: "Entrar",
    kicker: "Chat · Tradução instantânea · Videochamada",
    title: "Comunique-se instantaneamente com qualquer pessoa no mundo",
    intro: "Escreva no seu idioma e a outra pessoa lê no dela, na hora. Com uma conta, as suas conversas e traduções ficam guardadas.",
    features: [
      { title: "Dois telemóveis, uma conversa", text: "Leia o código QR: cada um escreve no seu idioma e lê no seu." },
      { title: "Traduções para enviar", text: "Traduza textos longos e descarregue o PDF com o original e a tradução lado a lado." },
      { title: "Tudo guardado na sua conta", text: "Conversas e traduções ficam no seu perfil: encontre-as em qualquer telemóvel." },
      { title: "Videochamadas traduzidas", text: "Veja e ouça a outra pessoa na videochamada: o chat da conversa continua traduzido no seu idioma." },
    ],
    prices: "Preços",
    pricesText: (p) => `Chat e traduções são gratuitos. Assistente IA: 10 créditos de oferta, depois ${p}, sem validade.`,
    details: "Detalhes",
    account: "Para conversar e traduzir é necessária uma conta: assim encontra tudo onde deixou.",
    terms: "Termos",
    refunds: "Reembolsos",
    privacy: "Privacidade e RGPD",
    credits: "créditos",
    at: "por",
    languagesTitle: "Idiomas disponíveis",
    languagesText: "Escreva e leia em qualquer um destes idiomas, mesmo nos que outras apps não traduzem.",
    contact: "Contacto",
  },
  ar: {
    login: "تسجيل الدخول",
    kicker: "دردشة · ترجمة فورية · مكالمة فيديو",
    title: "تواصل فورًا مع أي شخص في العالم",
    intro: "اكتب بلغتك ويقرأ الطرف الآخر بلغته، في الحال. مع حساب، تبقى محادثاتك وترجماتك محفوظة.",
    features: [
      { title: "هاتفان، محادثة واحدة", text: "امسح رمز QR: كل شخص يكتب بلغته ويقرأ بلغته." },
      { title: "ترجمات جاهزة للإرسال", text: "ترجم النصوص الطويلة ونزّل ملف PDF بالنص الأصلي والترجمة جنبًا إلى جنب." },
      { title: "كل شيء محفوظ في حسابك", text: "تبقى المحادثات والترجمات في ملفك الشخصي: تجدها من أي هاتف." },
      { title: "مكالمات فيديو مترجمة", text: "شاهد واسمع الطرف الآخر في مكالمة الفيديو: تبقى دردشة المحادثة مترجمة إلى لغتك." },
    ],
    prices: "الأسعار",
    pricesText: (p) => `الدردشة والترجمات مجانية. المساعد الذكي: 10 أرصدة هدية، ثم ${p}، بلا تاريخ انتهاء.`,
    details: "التفاصيل",
    account: "للدردشة والترجمة تحتاج إلى حساب: هكذا تجد كل شيء حيث تركته.",
    terms: "الشروط",
    refunds: "الاسترداد",
    privacy: "الخصوصية واللائحة العامة لحماية البيانات",
    credits: "رصيد",
    at: "مقابل",
    languagesTitle: "اللغات المتاحة",
    languagesText: "اكتب واقرأ بأي من هذه اللغات، حتى تلك التي لا تترجمها التطبيقات الأخرى.",
    contact: "التواصل",
  },
  th: {
    login: "เข้าสู่ระบบ",
    kicker: "แชท · แปลทันที · วิดีโอคอล",
    title: "สื่อสารกับทุกคนทั่วโลกได้ทันที",
    intro: "พิมพ์ในภาษาของคุณ อีกฝ่ายอ่านในภาษาของเขาได้ทันที เมื่อมีบัญชี การสนทนาและคำแปลของคุณจะถูกเก็บไว้",
    features: [
      { title: "สองโทรศัพท์ หนึ่งการสนทนา", text: "ให้เขา สแกน QR code: แต่ละคนพิมพ์ในภาษาของตัวเองและอ่านในภาษาของตัวเอง" },
      { title: "คำแปลที่พร้อมส่ง", text: "แปลข้อความยาว ๆ และดาวน์โหลดไฟล์ PDF ที่แสดงต้นฉบับและคำแปลเคียงข้างกัน" },
      { title: "บันทึกไว้ในบัญชีของคุณทั้งหมด", text: "การสนทนาและคำแปลอยู่ในโปรไฟล์ของคุณ เรียกดูได้จากทุกเครื่อง" },
      { title: "วิดีโอคอลที่มีคำแปล", text: "เห็นและได้ยินอีกฝ่ายในการวิดีโอคอล แชทของการสนทนาจะแปลเป็นภาษาของคุณ" },
    ],
    prices: "ราคา",
    pricesText: (p) => `แชทและคำแปลใช้ฟรี ผู้ช่วย AI: รับเครดิตฟรี 10 เครดิต จากนั้น ${p} ไม่หมดอายุ`,
    details: "รายละเอียด",
    account: "ต้องมีบัญชีเพื่อแชทและแปลข้อความ เพื่อให้คุณเจอทุกอย่างในจุดที่หยุดไว้",
    terms: "เงื่อนไข",
    refunds: "การคืนเงิน",
    privacy: "ความเป็นส่วนตัวและ GDPR",
    credits: "เครดิต",
    at: "ราคา",
    languagesTitle: "ภาษาที่ใช้งานได้",
    languagesText: "พิมพ์และอ่านได้ในภาษาเหล่านี้ รวมถึงภาษาที่แอปอื่นไม่แปล",
    contact: "ติดต่อ",
  },
};

/** Languages shown on the landing page, in their own script so every visitor recognizes theirs. */
export const LANDING_LANGUAGE_NAMES = [
  "Italiano", "English", "Español", "Français", "Deutsch", "Português", "Português (Brasil)", "Română",
  "Русский", "Shqip", "العربية", "Українська", "中文 (普通话)", "日本語", "עברית", "Ελληνικά",
  "Polski", "Türkçe", "Tagalog", "ਪੰਜਾਬੀ", "Wolof", "हिन्दी", "한국어", "Tiếng Việt",
  "Српски", "Slovenčina", "Монгол", "Hrvatski", "Svenska", "Dansk", "Norsk", "Azərbaycanca",
  "English (US)", "Kalaallisut", "Iñupiaq", "বাংলা", "Bahasa Indonesia", "اردو (پاکستان)", "繁體中文 (台灣)", "粵語 (香港)", "ไทย",
] as const;
