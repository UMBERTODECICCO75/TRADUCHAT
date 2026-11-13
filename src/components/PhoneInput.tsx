import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/** ISO 3166-1 alpha-2 code and international dialing prefix (without "+"). */
const COUNTRIES: ReadonlyArray<readonly [string, string]> = [
  ["AF", "93"],
  ["AL", "355"],
  ["DZ", "213"],
  ["AD", "376"],
  ["AO", "244"],
  ["AG", "1"],
  ["AR", "54"],
  ["AM", "374"],
  ["AU", "61"],
  ["AT", "43"],
  ["AZ", "994"],
  ["BS", "1"],
  ["BH", "973"],
  ["BD", "880"],
  ["BB", "1"],
  ["BY", "375"],
  ["BE", "32"],
  ["BZ", "501"],
  ["BJ", "229"],
  ["BT", "975"],
  ["BO", "591"],
  ["BA", "387"],
  ["BW", "267"],
  ["BR", "55"],
  ["BN", "673"],
  ["BG", "359"],
  ["BF", "226"],
  ["BI", "257"],
  ["KH", "855"],
  ["CM", "237"],
  ["CA", "1"],
  ["CV", "238"],
  ["CF", "236"],
  ["TD", "235"],
  ["CL", "56"],
  ["CN", "86"],
  ["CO", "57"],
  ["KM", "269"],
  ["CG", "242"],
  ["CD", "243"],
  ["CR", "506"],
  ["CI", "225"],
  ["HR", "385"],
  ["CU", "53"],
  ["CY", "357"],
  ["CZ", "420"],
  ["DK", "45"],
  ["DJ", "253"],
  ["DM", "1"],
  ["DO", "1"],
  ["EC", "593"],
  ["EG", "20"],
  ["SV", "503"],
  ["GQ", "240"],
  ["ER", "291"],
  ["EE", "372"],
  ["SZ", "268"],
  ["ET", "251"],
  ["FJ", "679"],
  ["FI", "358"],
  ["FR", "33"],
  ["GA", "241"],
  ["GM", "220"],
  ["GE", "995"],
  ["DE", "49"],
  ["GH", "233"],
  ["GR", "30"],
  ["GD", "1"],
  ["GT", "502"],
  ["GN", "224"],
  ["GW", "245"],
  ["GY", "592"],
  ["HT", "509"],
  ["HN", "504"],
  ["HK", "852"],
  ["HU", "36"],
  ["IS", "354"],
  ["IN", "91"],
  ["ID", "62"],
  ["IR", "98"],
  ["IQ", "964"],
  ["IE", "353"],
  ["IL", "972"],
  ["IT", "39"],
  ["JM", "1"],
  ["JP", "81"],
  ["JO", "962"],
  ["KZ", "7"],
  ["KE", "254"],
  ["KI", "686"],
  ["XK", "383"],
  ["KW", "965"],
  ["KG", "996"],
  ["LA", "856"],
  ["LV", "371"],
  ["LB", "961"],
  ["LS", "266"],
  ["LR", "231"],
  ["LY", "218"],
  ["LI", "423"],
  ["LT", "370"],
  ["LU", "352"],
  ["MO", "853"],
  ["MG", "261"],
  ["MW", "265"],
  ["MY", "60"],
  ["MV", "960"],
  ["ML", "223"],
  ["MT", "356"],
  ["MH", "692"],
  ["MR", "222"],
  ["MU", "230"],
  ["MX", "52"],
  ["FM", "691"],
  ["MD", "373"],
  ["MC", "377"],
  ["MN", "976"],
  ["ME", "382"],
  ["MA", "212"],
  ["MZ", "258"],
  ["MM", "95"],
  ["NA", "264"],
  ["NR", "674"],
  ["NP", "977"],
  ["NL", "31"],
  ["NZ", "64"],
  ["NI", "505"],
  ["NE", "227"],
  ["NG", "234"],
  ["KP", "850"],
  ["MK", "389"],
  ["NO", "47"],
  ["OM", "968"],
  ["PK", "92"],
  ["PW", "680"],
  ["PS", "970"],
  ["PA", "507"],
  ["PG", "675"],
  ["PY", "595"],
  ["PE", "51"],
  ["PH", "63"],
  ["PL", "48"],
  ["PT", "351"],
  ["PR", "1"],
  ["QA", "974"],
  ["RO", "40"],
  ["RU", "7"],
  ["RW", "250"],
  ["KN", "1"],
  ["LC", "1"],
  ["VC", "1"],
  ["WS", "685"],
  ["SM", "378"],
  ["ST", "239"],
  ["SA", "966"],
  ["SN", "221"],
  ["RS", "381"],
  ["SC", "248"],
  ["SL", "232"],
  ["SG", "65"],
  ["SK", "421"],
  ["SI", "386"],
  ["SB", "677"],
  ["SO", "252"],
  ["ZA", "27"],
  ["KR", "82"],
  ["SS", "211"],
  ["ES", "34"],
  ["LK", "94"],
  ["SD", "249"],
  ["SR", "597"],
  ["SE", "46"],
  ["CH", "41"],
  ["SY", "963"],
  ["TW", "886"],
  ["TJ", "992"],
  ["TZ", "255"],
  ["TH", "66"],
  ["TL", "670"],
  ["TG", "228"],
  ["TO", "676"],
  ["TT", "1"],
  ["TN", "216"],
  ["TR", "90"],
  ["TM", "993"],
  ["TV", "688"],
  ["UG", "256"],
  ["UA", "380"],
  ["AE", "971"],
  ["GB", "44"],
  ["US", "1"],
  ["UY", "598"],
  ["UZ", "998"],
  ["VU", "678"],
  ["VA", "39"],
  ["VE", "58"],
  ["VN", "84"],
  ["YE", "967"],
  ["ZM", "260"],
  ["ZW", "263"],
];

const DIAL: Record<string, string> = Object.fromEntries(COUNTRIES);

/** Preferred country when several share one prefix (e.g. +1 → US, +7 → RU, +39 → IT). */
const PREFIX_OWNER: Record<string, string> = { "1": "US", "7": "RU", "39": "IT", "44": "GB" };

/** Countries where the leading 0 is part of the international number (Italian landlines). */
const KEEP_LEADING_ZERO = new Set(["IT", "SM", "VA"]);

/** Fallback country when the browser locale has no region, keyed by language. */
const LANG_COUNTRY: Record<string, string> = {
  it: "IT",
  en: "GB",
  es: "ES",
  fr: "FR",
  de: "DE",
  ru: "RU",
  pt: "PT",
  ar: "SA",
  zh: "CN",
  ja: "JP",
  ko: "KR",
  nl: "NL",
  pl: "PL",
  ro: "RO",
  tr: "TR",
  uk: "UA",
  el: "GR",
  sv: "SE",
  hi: "IN",
};

function flag(iso: string) {
  return String.fromCodePoint(...[...iso].map((c) => 0x1f1a5 + c.charCodeAt(0)));
}

/** Guesses the visitor's country from the browser locale (e.g. "en-US" → US). */
export function detectPhoneCountry(): string {
  if (typeof navigator === "undefined") return "IT";
  for (const locale of navigator.languages ?? [navigator.language]) {
    const region = locale?.split(/[-_]/)[1]?.toUpperCase();
    if (region && DIAL[region]) return region;
  }
  const base = (navigator.language ?? "it").split(/[-_]/)[0]?.toLowerCase() ?? "it";
  return LANG_COUNTRY[base] ?? "IT";
}

/** Splits an international number ("+44 7700…" or "0044…") into country and national part. */
function parseInternational(raw: string): { country: string; national: string } | null {
  const digits = raw.trim().startsWith("+")
    ? raw.replace(/\D/g, "")
    : raw.trim().startsWith("00")
      ? raw.replace(/\D/g, "").slice(2)
      : null;
  if (digits === null) return null;
  for (let len = 3; len >= 1; len--) {
    const prefix = digits.slice(0, len);
    const owner = PREFIX_OWNER[prefix] ?? COUNTRIES.find(([, d]) => d === prefix)?.[0];
    if (owner) return { country: owner, national: digits.slice(len) };
  }
  return null;
}

/** Builds the E.164 number sent to the server, or "" while nothing is typed. */
function compose(country: string, national: string): string {
  let digits = national.replace(/\D/g, "");
  if (!KEEP_LEADING_ZERO.has(country)) digits = digits.replace(/^0+/, "");
  return digits ? `+${DIAL[country]}${digits}` : "";
}

type Props = {
  id: string;
  value: string;
  onChange: (e164: string) => void;
  /** UI language, used to show country names in that language. */
  lang: string;
  onEnter?: () => void;
  countryLabel?: string;
};

/**
 * Phone field with an international country-code selector. It always reports
 * the full number in E.164 form (+<prefix><number>) so any country can sign in.
 */
export function PhoneInput({ id, value, onChange, lang, onEnter, countryLabel }: Props) {
  const initial = parseInternational(value);
  const [country, setCountry] = useState(initial?.country ?? "IT");
  const [national, setNational] = useState(initial?.national ?? "");
  const touched = useRef(Boolean(initial));

  // Pick the visitor's country after mount (navigator is not available during SSR).
  useEffect(() => {
    if (!touched.current) setCountry(detectPhoneCountry());
  }, []);

  const options = useMemo(() => {
    let names: Intl.DisplayNames | null = null;
    try {
      names = new Intl.DisplayNames([lang, "en"], { type: "region" });
    } catch {
      names = null;
    }
    return COUNTRIES.map(([iso, dial]) => ({ iso, dial, name: names?.of(iso) ?? iso })).sort(
      (a, b) => a.name.localeCompare(b.name, lang),
    );
  }, [lang]);

  function update(nextCountry: string, nextNational: string) {
    touched.current = true;
    setCountry(nextCountry);
    setNational(nextNational);
    onChange(compose(nextCountry, nextNational));
  }

  function handleNumber(raw: string) {
    // Pasting a full international number switches the country automatically.
    const parsed = parseInternational(raw);
    if (parsed) update(parsed.country, parsed.national);
    else update(country, raw.replace(/(?!^\+)[^\d\s().-]/g, ""));
  }

  return (
    <div dir="ltr" className="flex gap-2">
      <div className="relative shrink-0">
        <div
          aria-hidden
          className="pointer-events-none flex h-9 items-center gap-1 rounded-md border border-input bg-transparent px-2.5 text-base shadow-sm md:text-sm"
        >
          <span className="text-lg leading-none">{flag(country)}</span>
          <span className="tabular-nums">+{DIAL[country]}</span>
          <ChevronDown className="size-3.5 opacity-60" />
        </div>
        <select
          aria-label={countryLabel ?? "Country code"}
          value={country}
          onChange={(e) => update(e.target.value, national)}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        >
          {options.map((o) => (
            <option key={o.iso} value={o.iso}>
              {flag(o.iso)} {o.name} (+{o.dial})
            </option>
          ))}
        </select>
      </div>
      <input
        id={id}
        type="tel"
        inputMode="tel"
        autoComplete="tel-national"
        value={national}
        onChange={(e) => handleNumber(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") onEnter?.();
        }}
        placeholder="123 456 7890"
        className={cn(
          "flex h-9 w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring md:text-sm",
        )}
      />
    </div>
  );
}
