// scripts/fetch-table12.mjs — run ONCE, then commit the frozen JSON.
// Primary: Lichess opening explorer (public, no key).
// Endpoint shape: https://explorer.lichess.ovh/lichess?variant=standard&speeds=blitz,rapid&ratings=1600,1800&play=
// The root call returns { white, draws, black, moves: [{ uci, san, white, draws, black, ... }] }.
//
// Fallback (used when the primary fetch fails or returns an unexpected shape):
// World Bank life expectancy at birth, 12 countries, baseline = world value,
// delta = country minus world. Documented in the plan Task 2 brief.
const fetchedDate = new Date().toISOString().slice(0, 10);

async function fetchPrimary() {
  const url = "https://explorer.lichess.ovh/lichess?variant=standard&speeds=blitz,rapid&ratings=1600,1800&play=";
  const res = await fetch(url);
  if (!res.ok) throw new Error(`lichess ${res.status}`);
  const data = await res.json();
  if (!Array.isArray(data.moves) || data.moves.length < 12) {
    throw new Error("lichess response shape unexpected: missing moves[]");
  }
  const rows = data.moves.slice(0, 12).map((m) => {
    const total = m.white + m.draws + m.black;
    const value = Number(((m.white / total) * 100).toFixed(2));
    return { label: m.san, value, delta: Number((value - 50).toFixed(2)) };
  });
  return {
    name: "table12",
    source: url,
    fetched: fetchedDate,
    baseline: 50,
    unit: "% white win rate",
    rows,
  };
}

async function fetchFallback(reason) {
  const countries = "USA;JPN;DEU;BRA;IND;NGA;CHN;MEX;ZAF;FRA;IDN;EGY";
  const indicator = "SP.DYN.LE00.IN";
  const countriesUrl = `https://api.worldbank.org/v2/country/${countries}/indicator/${indicator}?format=json&mrnev=1`;
  const worldUrl = `https://api.worldbank.org/v2/country/WLD/indicator/${indicator}?format=json&mrnev=1`;

  const [countriesRes, worldRes] = await Promise.all([fetch(countriesUrl), fetch(worldUrl)]);
  if (!countriesRes.ok) throw new Error(`worldbank countries ${countriesRes.status}`);
  if (!worldRes.ok) throw new Error(`worldbank world ${worldRes.status}`);

  const countriesData = await countriesRes.json();
  const worldData = await worldRes.json();
  const baseline = Number(worldData[1][0].value.toFixed(2));

  const rows = countriesData[1].map((c) => {
    const value = Number(c.value.toFixed(2));
    return { label: c.country.value, value, delta: Number((value - baseline).toFixed(2)) };
  });

  return {
    name: "table12",
    source: `${countriesUrl} (FALLBACK: primary lichess explorer failed with "${reason}"; using World Bank life expectancy at birth, 12 countries, baseline = world value)`,
    fetched: fetchedDate,
    baseline,
    unit: "years (life expectancy at birth)",
    rows,
  };
}

let result;
try {
  result = await fetchPrimary();
} catch (err) {
  result = await fetchFallback(err.message);
}

console.log(JSON.stringify(result, null, 2));
