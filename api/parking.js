const config = require('../config/parking-public.json');

module.exports = async function handler(_req, res) {
  const statusUrl = process.env.PARKING_STATUS_URL || config.status_url;
  const anonKey = process.env.PARKING_ANON_KEY || config.anon_key;

  try {
    const upstream = await fetch(statusUrl, {
      headers: {
        Authorization: `Bearer ${anonKey}`,
        apikey: anonKey,
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(20_000),
    });
    if (!upstream.ok) throw new Error(`parking-status returned ${upstream.status}`);

    const data = await upstream.json();
    if (data.data_origin !== 'LIVE' || !Array.isArray(data.lots) || data.lots.length > 15) {
      throw new Error('Unexpected snapshot');
    }

    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json(data);
  } catch {
    res.setHeader('Cache-Control', 'no-store');
    res.status(502).json({ error: 'PARKING_READ_FAILED' });
  }
};
