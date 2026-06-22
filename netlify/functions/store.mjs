// netlify/functions/store.mjs
// Zero npm dependencies — uses only Node built-ins

export const config = { path: '/.netlify/functions/store' };

export async function handler(event) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, PUT, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  const ctxBase64 = process.env.NETLIFY_BLOBS_CONTEXT;
  if (!ctxBase64) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'NETLIFY_BLOBS_CONTEXT not set' }) };
  }

  let ctx;
  try { ctx = JSON.parse(Buffer.from(ctxBase64, 'base64')); }
  catch { return { statusCode: 500, headers, body: JSON.stringify({ error: 'Invalid NETLIFY_BLOBS_CONTEXT' }) }; }

  const { siteID, token, edgeURL } = ctx;
  const blobKey = `${edgeURL}/${siteID}/site:dashboard/state`;

  if (event.httpMethod === 'GET') {
    try {
      const resp = await fetch(blobKey, { headers: { 'Authorization': `Bearer ${token}` } });
      if (resp.status === 404) return { statusCode: 200, headers, body: JSON.stringify({}) };
      if (!resp.ok) return { statusCode: resp.status, headers, body: JSON.stringify({ error: `Blob fetch failed: ${resp.status}` }) };
      const text = await resp.text();
      try { return { statusCode: 200, headers, body: JSON.stringify(JSON.parse(text)) }; }
      catch { return { statusCode: 200, headers, body: JSON.stringify({}) }; }
    } catch (err) { return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) }; }
  }

  if (event.httpMethod === 'PUT' || event.httpMethod === 'POST') {
    let body;
    try { body = JSON.parse(event.body || '{}'); }
    catch { return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON body' }) }; }
    if (typeof body !== 'object' || body === null || Array.isArray(body)) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Body must be a JSON object' }) };
    }
    try {
      const resp = await fetch(blobKey, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!resp.ok) return { statusCode: resp.status, headers, body: JSON.stringify({ error: `Blob store failed: ${resp.status}` }) };
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
    } catch (err) { return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) }; }
  }

  return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
}
