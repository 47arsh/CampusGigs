# CampusGigs Frontend

React 19 + Vite single-page client for the CampusGigs campus marketplace. It handles authentication, browsing and posting tasks, the user's posted/accepted gigs, real-time notifications, and the AI assistant chat.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Vite dev server on port 5173 |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Serve the built bundle locally |
| `npm test` | Run the vitest suite once |
| `npm run lint` | Run oxlint |

## Configuration

Create `frontend/.env` (or `.env.local`) when the backend is not on the default port:

| Variable | Default | Purpose |
| --- | --- | --- |
| `VITE_API_URL` | `http://localhost:3000/api` | REST API base URL |
| `VITE_SOCKET_URL` | Derived from `VITE_API_URL` | Socket.IO server URL |

Vite only exposes `VITE_*` variables to the browser, so never place secrets here.

## Structure

```text
src/
├── components/   Navbar, notification bell, AI assistant
├── context/      Auth and realtime notification providers
├── lib/          fetch-based API client and formatting helpers
└── pages/        Home, login, register, dashboard
```

## Behaviour notes

* The API client throws an `Error` carrying `status`, which the auth context uses to sign the user out on a `401` (for example after token expiry).
* The dashboard loads browse results and the user's own lists through independent effects so their loading states and refresh cycles do not block each other.
* Socket.IO reconnects with the stored JWT and refreshes notifications when the connection is re-established.

## Testing

`npm test` runs vitest in a jsdom environment. Coverage currently targets the API client and timestamp formatting; run `npm run lint` and `npm run build` before shipping. CI runs lint, tests, and a production build on every push and pull request.
