import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { isCardArchived, sortArchivedByDefault } from '../../domain/cardArchive'
import { reconcileBoardTimeState } from '../../domain/timeEngine'
import type { Card, TimeBoardState } from '../../domain/types'
import { GitHubHttpError } from '../../infrastructure/github/client'
import { createClientFromSession } from '../../infrastructure/github/fromSession'
import type { BoardDocumentJson } from '../../infrastructure/persistence/types'
import { createBoardRepository } from '../../infrastructure/persistence/boardRepository'
import type { FlowBoardSession } from '../../infrastructure/session/sessionStore'
import { appendNewSegments, docToTimeBoardState, writeTimeBoardStateToDoc } from './timeBridge'
import { deleteRepoPathIfExists } from './attachmentSync'
import { clearSearchModalBoardCache } from '../app/SearchModal'
import './ArchivedCardsPage.css'

type Props = {
  session: FlowBoardSession
  boardId: string | null
  onBoardPersisted?: () => void
}

export function ArchivedCardsPage({ session, boardId, onBoardPersisted }: Props) {
  const client = useMemo(() => createClientFromSession(session), [session])
  const repo = useMemo(() => createBoardRepository(client), [client])

  const [doc, setDoc] = useState<BoardDocumentJson | null>(null)
  const [sha, setSha] = useState<string | null>(null)
  const shaRef = useRef<string | null>(null)
  const saveChainRef = useRef(Promise.resolve())
  const [timeState, setTimeState] = useState<TimeBoardState>({})
  const docRef = useRef(doc)
  const timeStateRef = useRef(timeState)
  const [loadError, setLoadError] = useState('')
  const [persistError, setPersistError] = useState('')
  const [saving, setSaving] = useState(false)

  const reload = useCallback(async () => {
    if (!boardId) {
      return
    }
    setLoadError('')
    const got = await repo.loadBoard(boardId)
    if (!got) {
      setLoadError('Quadro não encontrado no repositório.')
      setDoc(null)
      setSha(null)
      shaRef.current = null
      return
    }
    setDoc(got.doc)
    setSha(got.sha)
    shaRef.current = got.sha
    docRef.current = got.doc
    const loaded = docToTimeBoardState(got.doc)
    const reconciled = reconcileBoardTimeState(loaded, got.doc.cards, got.doc.columns, Date.now(), got.doc.workingHours)
    if (JSON.stringify(loaded) !== JSON.stringify(reconciled)) {
      const nextDoc = structuredClone(got.doc)
      writeTimeBoardStateToDoc(nextDoc, reconciled)
      appendNewSegments(nextDoc, loaded, reconciled)
      docRef.current = nextDoc
      timeStateRef.current = reconciled
      setDoc(nextDoc)
      setTimeState(reconciled)
      setSaving(true)
      setPersistError('')
      try {
        await repo.saveBoard(nextDoc.boardId, nextDoc, got.sha)
        const got2 = await repo.loadBoard(boardId)
        if (got2) {
          setDoc(got2.doc)
          setSha(got2.sha)
          shaRef.current = got2.sha
          docRef.current = got2.doc
          const ts = docToTimeBoardState(got2.doc)
          timeStateRef.current = ts
          setTimeState(ts)
        }
      } catch (e) {
        if (e instanceof GitHubHttpError && e.status === 409) {
          setPersistError('Conflito ao salvar após reconciliação. Recarregando dados.')
        } else {
          setPersistError(e instanceof Error ? e.message : 'Erro ao salvar.')
        }
        try {
          const got3 = await repo.loadBoard(boardId)
          if (got3) {
            setDoc(got3.doc)
            setSha(got3.sha)
            shaRef.current = got3.sha
            docRef.current = got3.doc
            const ts3 = docToTimeBoardState(got3.doc)
            timeStateRef.current = ts3
            setTimeState(ts3)
          }
        } catch {
          /* ignore */
        }
      } finally {
        setSaving(false)
      }
    } else {
      timeStateRef.current = loaded
      setTimeState(loaded)
    }
  }, [boardId, repo])

  useEffect(() => {
    saveChainRef.current = Promise.resolve()
  }, [boardId])

  useEffect(() => {
    if (!boardId) {
      const t = window.setTimeout(() => {
        setDoc(null)
        setSha(null)
        setLoadError('')
        setTimeState({})
      }, 0)
      return () => clearTimeout(t)
    }
    const t = window.setTimeout(() => {
      void reload()
    }, 0)
    return () => clearTimeout(t)
  }, [boardId, reload])

  const archivedList = useMemo(
    () => (doc ? sortArchivedByDefault(doc.cards.filter(isCardArchived)) : []),
    [doc],
  )

  const saveDocument = useCallback(
    async (nextDoc: BoardDocumentJson) => {
      if (!boardId) {
        return
      }
      const run = async () => {
        setSaving(true)
        setPersistError('')
        try {
          await repo.saveBoard(nextDoc.boardId, nextDoc, shaRef.current)
          const got = await repo.loadBoard(boardId)
          if (got) {
            docRef.current = got.doc
            shaRef.current = got.sha
            const ts = docToTimeBoardState(got.doc)
            timeStateRef.current = ts
            setDoc(got.doc)
            setSha(got.sha)
            setTimeState(ts)
            clearSearchModalBoardCache()
            onBoardPersisted?.()
          }
        } catch (e) {
          if (e instanceof GitHubHttpError && e.status === 409) {
            setPersistError('Conflito ao salvar. Recarregando dados.')
          } else {
            setPersistError(e instanceof Error ? e.message : 'Erro ao salvar.')
          }
          try {
            const got = await repo.loadBoard(boardId)
            if (got) {
              docRef.current = got.doc
              shaRef.current = got.sha
              const ts = docToTimeBoardState(got.doc)
              timeStateRef.current = ts
              setDoc(got.doc)
              setSha(got.sha)
              setTimeState(ts)
              clearSearchModalBoardCache()
              onBoardPersisted?.()
            }
          } catch {
            /* ignore */
          }
        } finally {
          setSaving(false)
        }
      }
      const queued = saveChainRef.current.then(run)
      saveChainRef.current = queued.catch(() => {})
      return queued
    },
    [boardId, onBoardPersisted, repo],
  )

  useEffect(() => {
    docRef.current = doc
  }, [doc])

  useEffect(() => {
    timeStateRef.current = timeState
  }, [timeState])

  useEffect(() => {
    shaRef.current = sha
  }, [sha])

  useEffect(() => {
    const tick = () => {
      const cur = docRef.current
      if (!cur) {
        return
      }
      const prev = docToTimeBoardState(cur)
      const next = reconcileBoardTimeState(prev, cur.cards, cur.columns, Date.now(), cur.workingHours)
      if (JSON.stringify(prev) === JSON.stringify(next)) {
        return
      }
      const nextDoc = structuredClone(cur)
      writeTimeBoardStateToDoc(nextDoc, next)
      appendNewSegments(nextDoc, prev, next)
      timeStateRef.current = next
      docRef.current = nextDoc
      setTimeState(next)
      setDoc(nextDoc)
      void saveDocument(nextDoc)
    }
    const id = window.setInterval(tick, 60_000)
    const onVis = () => {
      if (document.visibilityState === 'visible') {
        tick()
      }
    }
    document.addEventListener('visibilitychange', onVis)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [doc?.boardId, saveDocument])

  function handleDeleteCard(card: Card) {
    if (!window.confirm(`Excluir a tarefa "${card.title}"?`)) {
      return
    }
    const cardIdSnapshot = card.cardId
    const attachmentsSnapshot = card.attachments ?? []
    void (async () => {
      try {
        for (const a of attachmentsSnapshot) {
          await deleteRepoPathIfExists(client, a.storagePath)
        }
      } catch (e) {
        setPersistError(e instanceof Error ? e.message : 'Erro ao remover anexos.')
        return
      }
      const docSnap = docRef.current
      const timeSnap = timeStateRef.current
      if (!docSnap || !docSnap.cards.some((c) => c.cardId === cardIdSnapshot)) {
        setPersistError('O quadro mudou antes de concluir a exclusão. Recarregue se necessário.')
        return
      }
      const nextDoc = structuredClone(docSnap)
      nextDoc.cards = nextDoc.cards.filter((c) => c.cardId !== cardIdSnapshot)
      const nextTime = { ...timeSnap }
      delete nextTime[cardIdSnapshot]
      delete nextDoc.cardTimeState[cardIdSnapshot]
      writeTimeBoardStateToDoc(nextDoc, nextTime)
      timeStateRef.current = nextTime
      docRef.current = nextDoc
      setTimeState(nextTime)
      setDoc(nextDoc)
      await saveDocument(nextDoc)
    })()
  }

  function handleUnarchiveCard(card: Card) {
    const docSnap = docRef.current
    const timeSnap = timeStateRef.current
    if (!docSnap || !isCardArchived(card)) {
      return
    }
    const nextDoc = structuredClone(docSnap)
    const idx = nextDoc.cards.findIndex((c) => c.cardId === card.cardId)
    if (idx < 0) {
      return
    }
    const snapshot = nextDoc.cards[idx]!
    nextDoc.cards[idx] = {
      ...snapshot,
      archived: undefined,
      archivedAt: undefined,
    }
    const prevTime = timeSnap
    void (async () => {
      const nowMs = Date.now()
      const nextTime = reconcileBoardTimeState(prevTime, nextDoc.cards, nextDoc.columns, nowMs, nextDoc.workingHours)
      appendNewSegments(nextDoc, prevTime, nextTime)
      writeTimeBoardStateToDoc(nextDoc, nextTime)
      timeStateRef.current = nextTime
      docRef.current = nextDoc
      setTimeState(nextTime)
      setDoc(nextDoc)
      await saveDocument(nextDoc)
    })()
  }

  if (!boardId) {
    return (
      <div className="fb-archived-page" data-testid="archived-page">
        <p className="fb-archived-page__empty">Selecione um quadro para ver arquivados</p>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="fb-archived-page fb-archived-page--error" role="alert" data-testid="archived-page">
        {loadError}
      </div>
    )
  }

  if (!doc) {
    return (
      <div className="fb-archived-page" data-testid="archived-page">
        <p className="fb-archived-page__loading">Carregando arquivados…</p>
      </div>
    )
  }

  return (
    <div className="fb-archived-page" data-testid="archived-page">
      {persistError ? (
        <div className="fb-archived-page__warn" role="status">
          {persistError}
        </div>
      ) : null}
      {saving ? <p className="fb-archived-page__saving">Salvando…</p> : null}

      <section className="fb-archived" aria-label="Tarefas arquivadas">
        <h2 className="fb-archived-page__heading">Arquivados ({archivedList.length})</h2>
        {archivedList.length === 0 ? (
          <p className="fb-archived-page__muted">Nenhum card arquivado neste quadro.</p>
        ) : (
          <ul className="fb-archived__list">
            {archivedList.map((c) => (
              <li key={c.cardId} className="fb-archived__row" data-testid={`archived-row-${c.cardId}`}>
                <span className="fb-archived__title">{c.title}</span>
                <div className="fb-archived__actions">
                  <button
                    type="button"
                    className="fb-archived__btn"
                    data-testid={`archived-restore-${c.cardId}`}
                    disabled={saving}
                    onClick={() => handleUnarchiveCard(c)}
                  >
                    Restaurar
                  </button>
                  <button
                    type="button"
                    className="fb-archived__btn fb-archived__btn--danger"
                    data-testid={`archived-delete-${c.cardId}`}
                    disabled={saving}
                    onClick={() => handleDeleteCard(c)}
                  >
                    Excluir
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
