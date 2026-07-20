# Docker Hub Analytics

A self-contained web app for exploring pull counts and image metadata across
any public Docker Hub organization.

## Running

**Requirements:** Node.js 14+ (no npm install — uses only built-in modules)

```bash
node proxy/server.js
```

Open the URL printed in the terminal. That's it — no configuration needed.

## Kubernetes / NodePort

Point your container entrypoint at `node proxy/server.js` and expose the port
(default 3000, override with the `PORT` env var). Access via any node IP on
the NodePort assigned by your cluster.

## Files

```
index.html       — the app
proxy/
  server.js      — serves the app + proxies Docker Hub API
  README.md      — alternative proxy options if not using Node.js
README.md        — this file
```
