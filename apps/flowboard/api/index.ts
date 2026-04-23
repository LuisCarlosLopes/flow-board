/**
 * Vercel Serverless: mounts the same BFF as local `npm run dev` / `npm start`.
 * Configure project Root Directory to `apps/flowboard` and set FLOWBOARD_SESSION_SECRET.
 */
import { createBff } from '../server/bffApp'

export default createBff()
