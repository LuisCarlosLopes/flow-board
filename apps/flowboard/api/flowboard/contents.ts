import type { IncomingMessage, ServerResponse } from 'node:http'
import { createFlowBoardApiApp } from '../../server/app'
import { sendWebResponse, toWebRequest } from '../../server/httpAdapter'

export const config = {
  runtime: 'nodejs',
}

const app = createFlowBoardApiApp()

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  try {
    const request = await toWebRequest(req)
    const response =
      (await app.handle(request)) ??
      new Response(JSON.stringify({ error: { code: 'not_found', message: 'Rota não encontrada.' } }), {
        status: 404,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      })
    await sendWebResponse(res, response)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha interna ao processar conteudo FlowBoard.'
    await sendWebResponse(
      res,
      new Response(JSON.stringify({ error: { code: 'internal_error', message } }), {
        status: 500,
        headers: {
          'Cache-Control': 'no-store',
          'Content-Type': 'application/json; charset=utf-8',
        },
      }),
    )
  }
}
