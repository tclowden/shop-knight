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

export async function fetchGsaPerDiem(city: string, state: string, year: number, apiKey: string) {
  const url = `https://api.gsa.gov/travel/perdiem/v2/rates/city/${encodeURIComponent(city)}/state/${encodeURIComponent(state)}/year/${year}?api_key=${encodeURIComponent(apiKey)}`;
  let gsaRes: Response;
  try {
    gsaRes = await fetch(url, { method: 'GET', cache: 'no-store' });
  } catch {
    throw new Error('GSA lookup timed out. Please try again in a moment.');
  }

  const gsaData = await gsaRes.json().catch(() => null);
  if (!gsaRes.ok || !gsaData?.rates || !Array.isArray(gsaData.rates) || gsaData.rates.length === 0) {
    throw new Error(`No per-diem rates found for ${city}, ${state} (${year}).`);
  }

  const rateContainer = gsaData.rates[0];
  const rateEntry = Array.isArray(rateContainer?.rate) ? rateContainer.rate[0] : null;
  const mie = Number(rateEntry?.meals ?? 0);
  if (!Number.isFinite(mie) || mie <= 0) throw new Error('GSA response did not include a valid M&IE rate.');

  return { rateEntry, mie };
}
