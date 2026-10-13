exports.handler = async function () {
  try {
    const response = await fetch('https://www.cpc.ncep.noaa.gov/data/indices/RONI.ascii.txt', {
      headers: { 'User-Agent': 'CeuClima/1.0 climate dashboard' }
    });
    if (!response.ok) throw new Error(`NOAA respondeu HTTP ${response.status}`);
    const data = await response.text();
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'public, max-age=21600' },
      body: JSON.stringify({ data, source: 'NOAA CPC RONI' })
    };
  } catch (error) {
    return { statusCode: 502, body: JSON.stringify({ error: 'Não foi possível consultar a série RONI da NOAA.' }) };
  }
};
