# Proxy Setup Guide

The included `server.js` is the recommended way to run this app — it serves
both the UI and the Docker Hub proxy on a single port, binds to all network
interfaces, and prints your LAN IP on startup.

```bash
node server.js
# → Local:    http://localhost:3000
# → Network:  http://192.168.1.50:3000
#
# Set Proxy URL in the app to: http://192.168.1.50:3000/proxy
```

If you need to deploy the proxy separately (e.g. to a cloud host), the options
below all use the same URL convention: the target Docker Hub URL is appended
after your proxy base URL, e.g. `https://your-proxy.example.com/proxy/https://hub.docker.com/v2/...`

---

## Option B — Cloudflare Workers (free tier, permanent public URL)

1. Sign up at https://workers.cloudflare.com (free).
2. Create a new Worker and paste the code below.
3. Deploy and copy the `*.workers.dev` URL.
4. Set **Proxy URL** in the app to `https://your-worker.workers.dev/proxy`.

```javascript
export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === '/') return new Response('Docker Hub proxy', { status: 200 });

    const target = decodeURIComponent(url.pathname.slice('/proxy/'.length) + url.search);
    let targetUrl;
    try { targetUrl = new URL(target); } catch {
      return new Response('Invalid URL', { status: 400 });
    }
    if (targetUrl.hostname !== 'hub.docker.com') {
      return new Response('Forbidden', { status: 403 });
    }

    const res = await fetch(targetUrl.href, {
      headers: { 'User-Agent': 'dockerhub-analytics-proxy/1.0', Accept: 'application/json' },
    });
    const body = await res.text();
    return new Response(body, {
      status: res.status,
      headers: {
        'Content-Type': res.headers.get('Content-Type') || 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
      },
    });
  },
};
```

---

## Option C — Vercel (free tier)

1. Create a new project with a file at `api/proxy/[...path].js`:

```javascript
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }

  const target = decodeURIComponent(
    Array.isArray(req.query.path) ? req.query.path.join('/') : req.query.path
  );
  let targetUrl;
  try { targetUrl = new URL(target); } catch {
    return res.status(400).send('Invalid URL');
  }
  if (targetUrl.hostname !== 'hub.docker.com') {
    return res.status(403).send('Forbidden');
  }

  const upstream = await fetch(targetUrl.href, {
    headers: { 'User-Agent': 'dockerhub-analytics-proxy/1.0', Accept: 'application/json' },
  });
  const body = await upstream.text();
  res.status(upstream.status)
     .setHeader('Content-Type', upstream.headers.get('Content-Type') || 'application/json')
     .send(body);
}
```

2. Deploy with `vercel deploy`.
3. Set **Proxy URL** in the app to `https://your-project.vercel.app/api/proxy`.

---

## Option D — Python (no Node.js required)

**Requirements:** `pip install flask flask-cors requests`

Save as `proxy.py` and run with `python proxy.py`:

```python
from flask import Flask, request, Response
from flask_cors import CORS
import requests, urllib.parse

app = Flask(__name__)
CORS(app)

@app.route('/proxy/<path:target_url>')
def proxy(target_url):
    target = urllib.parse.unquote(target_url)
    from urllib.parse import urlparse
    if urlparse(target).hostname != 'hub.docker.com':
        return 'Forbidden', 403
    r = requests.get(target, headers={
        'User-Agent': 'dockerhub-analytics-proxy/1.0',
        'Accept': 'application/json'
    }, timeout=15)
    return Response(r.content, status=r.status_code,
                    content_type=r.headers.get('Content-Type', 'application/json'))

if __name__ == '__main__':
    print('Proxy on http://0.0.0.0:3000')
    app.run(host='0.0.0.0', port=3000)
```

Set **Proxy URL** to `http://<your-ip>:3000/proxy` in the app.

---

## Security notes

- All implementations only forward requests to `hub.docker.com`.
- No Docker Hub credentials are required — all API endpoints are public.
- For a public deployment, add a secret request header or IP allowlist to
  prevent your proxy from being misused by others.
