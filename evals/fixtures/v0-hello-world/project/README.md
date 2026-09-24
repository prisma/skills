# Hello World

A small Next.js app. Run `npm install` and `npm run dev`.

The homepage displays Hello World. Keep it working when adding infrastructure.
`GET /api/health` is used for readiness: probe configured services on each request,
return HTTP 200 when they are ready, and HTTP 503 when a required service is unavailable.
Store connection settings in server-side environment variables.
