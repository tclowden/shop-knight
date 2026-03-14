export function dateDiffDays(start: Date | null, end: Date | null) {
  if (!start || !end) return 1;
  const ms = end.getTime() - start.getTime();
  return Math.max(1, Math.ceil(ms / (1000 * 60 * 60 * 24)) + 1);
}

export function getTripYear(startDate: Date | null, endDate: Date | null) {
  return (startDate || endDate || new Date()).getFullYear();
}

export function normalizeStateCode(value: string | null | undefined) {
  if (!value) return null;
  return String(value).trim().toUpperCase();
}

function toNum(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function extractMie(rateEntry: Record<string, unknown> | null) {
  if (!rateEntry) return null;
  const candidates = [
    rateEntry.meals,
    rateEntry.mie,
    rateEntry.mealsAndIncidentalExpenses,
    (rateEntry as { me?: unknown }).me,
    (rateEntry as { mAndIe?: unknown }).mAndIe,
  ];
  for (const c of candidates) {
    const n = toNum(c);
    if (n && n > 0) return n;
  }
  return null;
}

export async function fetchGsaPerDiem(city: string, state: string, year: number, apiKey: string) {
  const yearsToTry = [year, year - 1, year - 2];

  for (const y of yearsToTry) {
    const url = `https://api.gsa.gov/travel/perdiem/v2/rates/city/${encodeURIComponent(city)}/state/${encodeURIComponent(state)}/year/${y}?api_key=${encodeURIComponent(apiKey)}`;
    let gsaRes: Response;
    try {
      gsaRes = await fetch(url, { method: 'GET', cache: 'no-store' });
    } catch {
      throw new Error('GSA lookup timed out. Please try again in a moment.');
    }

    const gsaData = await gsaRes.json().catch(() => null);
    if (!gsaRes.ok) {
      const errorCode = String(gsaData?.error?.code || '').toUpperCase();
      const errorMessage = String(gsaData?.error?.message || '');
      if (errorCode === 'API_KEY_INVALID') {
        throw new Error('GSA API key is invalid. Please update GSA_API_KEY.');
      }
      if (gsaRes.status === 401 || gsaRes.status === 403) {
        throw new Error(errorMessage || 'GSA API authorization failed.');
      }
      if (gsaRes.status >= 500) {
        throw new Error('GSA service is temporarily unavailable. Please try again.');
      }
      continue;
    }

    if (!gsaData?.rates || !Array.isArray(gsaData.rates) || gsaData.rates.length === 0) {
      continue;
    }

    const allRateEntries = gsaData.rates.flatMap((container: { rate?: unknown }) =>
      Array.isArray(container?.rate) ? container.rate : []
    ) as Record<string, unknown>[];

    if (allRateEntries.length === 0) continue;

    const best = allRateEntries.find((entry) => extractMie(entry) !== null) ?? allRateEntries[0];
    const mie = extractMie(best);

    if (!mie || mie <= 0) throw new Error('GSA response did not include a valid M&IE rate.');

    return {
      rateEntry: best,
      mie,
      yearUsed: y,
      fallbackUsed: y !== year,
    };
  }

  throw new Error(`No per-diem rates found for ${city}, ${state} (${year}) or recent years.`);
}
