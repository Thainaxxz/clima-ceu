module.exports = async function handler(req, res) {
  try {
    const response = await fetch('https://www.cpc.ncep.noaa.gov/data/indices/RONI.ascii.txt', {
      headers: { 'User-Agent': 'CeuClima/1.0 climate dashboard' }
    });
    if (!response.ok) throw new Error(`NOAA respondeu HTTP ${response.status}`);
    const data = await response.text();
    res.setHeader('Cache-Control', 's-maxage=21600, stale-while-revalidate=86400');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.status(200).json({ data, source: 'NOAA CPC RONI' });
  } catch (error) {
    res.status(502).json({ error: 'Não foi possível consultar a série RONI da NOAA.' });
  }
};
