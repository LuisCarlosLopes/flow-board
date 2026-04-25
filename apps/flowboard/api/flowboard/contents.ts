import type { IncomingMessage, ServerResponse } from 'node:http'
import { createFlowBoardApiApp } from '../../server/app'
import { sendWebResponse, toWebRequest } from '../../server/httpAdapter'

const app = createFlowBoardApiApp()

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const request = await toWebRequest(req)
  const response =
    (await app.handle(request)) ??
    new Response(JSON.stringify({ error: { code: 'not_found', message: 'Rota não encontrada.' } }), {
      status: 404,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    })
  await sendWebResponse(res, response)
}
