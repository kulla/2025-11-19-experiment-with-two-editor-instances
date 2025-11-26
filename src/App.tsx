import '@picocss/pico/css/pico.min.css'
import 'prosekit/extensions/loro/style.css'
import './App.css'

import 'prosekit/basic/style.css'
import 'prosekit/basic/typography.css'

import type { EditorState } from '@prosekit/pm/state'
import { type AwarenessListener, Cursor, LoroDoc } from 'loro-crdt'
import { CursorAwareness, type LoroDocType } from 'loro-prosemirror'
import { defineBasicExtension } from 'prosekit/basic'
import { createEditor, union } from 'prosekit/core'
import { defineLoro } from 'prosekit/extensions/loro'
import { definePlaceholder } from 'prosekit/extensions/placeholder'
import { ProseKit, useStateUpdate } from 'prosekit/react'
import { useEffect, useMemo, useRef } from 'react'

enum EditorInstanceId {
  Question = 'question',
  Answer = 'answer',
}

export default function App() {
  const { doc: loroA, awareness: awarenessA, id: idA } = useLoroDoc()
  const { doc: loroB, awareness: awarenessB, id: idB } = useLoroDoc()

  useEffect(() => {
    // Code taken from https://prosekit.dev/extensions/loro/
    loroA.import(loroB.export({ mode: 'update' }))
    loroB.import(loroA.export({ mode: 'update' }))

    const unsubscribeA = loroA.subscribeLocalUpdates((bytes) =>
      loroB.import(bytes),
    )
    const unsubscribeB = loroB.subscribeLocalUpdates((bytes) =>
      loroA.import(bytes),
    )

    const awarenessAListener: AwarenessListener = (_, origin) => {
      if (origin === 'local') awarenessB.apply(awarenessA.encode([idA]))
    }
    const awarenessBListener: AwarenessListener = (_, origin) => {
      if (origin === 'local') awarenessA.apply(awarenessB.encode([idB]))
    }
    awarenessA.addListener(awarenessAListener)
    awarenessB.addListener(awarenessBListener)

    return () => {
      unsubscribeA()
      unsubscribeB()
      awarenessA.removeListener(awarenessAListener)
      awarenessB.removeListener(awarenessBListener)
    }
  }, [loroA, loroB, awarenessA, awarenessB, idA, idB])

  return (
    <main className="p-10">
      <h1>Synchronized exercise editors</h1>
      <div className="mb-6 flex gap-4">
        <ExerciseEditor doc={loroA} awareness={awarenessA} panelId="A" />
        <ExerciseEditor doc={loroB} awareness={awarenessB} panelId="B" />
      </div>
    </main>
  )
}

function useLoroDoc() {
  const doc = useRef<LoroDocType>(new LoroDoc()).current
  const id = useRef(doc.peerIdStr).current
  const awareness = useRef(new CursorAwareness(id)).current

  return { doc, awareness, id }
}

interface ExerciseEditorProps {
  panelId: string
  doc: LoroDoc
  awareness: CursorAwareness
}

function ExerciseEditor({ doc, awareness, panelId }: ExerciseEditorProps) {
  return (
    <div className="w-80">
      <h3>Editor {panelId}</h3>
      <article>
        <h5>Question:</h5>
        <Editor
          id={EditorInstanceId.Question}
          doc={doc}
          awareness={awareness}
          onChange={() => void 0}
        />
        <h5>Answer:</h5>
        <Editor
          id={EditorInstanceId.Answer}
          doc={doc}
          awareness={awareness}
          onChange={() => void 0}
        />
      </article>
    </div>
  )
}

interface EditorProps {
  id: EditorInstanceId
  onChange: (id: EditorInstanceId, state: EditorState) => void
  doc: LoroDoc
  awareness: CursorAwareness
}

function Editor({ id, onChange, doc, awareness }: EditorProps) {
  const editor = useMemo(() => {
    const editorMap = doc.getMap(`prosemirror:${id}`)
    const extension = union(
      defineBasicExtension(),
      definePlaceholder({
        placeholder:
          id === EditorInstanceId.Question
            ? 'Type the question here...'
            : 'Type the answer here...',
      }),
      defineLoro({
        doc: doc as LoroDocType,
        awareness: createEditorSpecificCursorAwareness(id, awareness),
        sync: { containerId: editorMap.id },
      }),
    )

    return createEditor({ extension })
  }, [doc, awareness, id])

  useStateUpdate((state) => onChange(id, state), { editor })

  return (
    <ProseKit editor={editor}>
      <div ref={editor.mount} className="mb-2" />
    </ProseKit>
  )
}

function createEditorSpecificCursorAwareness(
  editorInstanceId: EditorInstanceId,
  awareness: CursorAwareness,
) {
  return createProxyWithChangedMethods(awareness, {
    getAll() {
      return Object.fromEntries(
        Object.entries(awareness.getAllStates())
          .filter(
            ([_peer, state]) =>
              'editorInstanceId' in state &&
              state.editorInstanceId === editorInstanceId,
          )
          .map(([peer, state]) => [
            peer,
            {
              anchor: state.anchor ? Cursor.decode(state.anchor) : undefined,
              focus: state.focus ? Cursor.decode(state.focus) : undefined,
              user: state.user ? state.user : undefined,
            },
          ]),
      )
    },

    getLocal() {
      const state = awareness.getLocal()

      if (
        state &&
        'editorInstanceId' in state &&
        state.editorInstanceId !== editorInstanceId
      ) {
        return undefined
      }

      return state
    },

    setLocal: ((state) => {
      awareness.setLocalState({
        // @ts-expect-error Unfortunately we cannot extend the type of the
        // awareness state in CursorAwareness
        editorInstanceId,
        anchor: state.anchor?.encode() || null,
        focus: state.focus?.encode() || null,
        user: state.user || null,
      })
    }) as CursorAwareness['setLocal'],
  })
}

function createProxyWithChangedMethods<A extends object>(
  target: A,
  methods: Record<string, unknown>,
) {
  return new Proxy(target, {
    get(target, prop, receiver) {
      return typeof prop === 'string' && prop in methods
        ? methods[prop]
        : Reflect.get(target, prop, receiver)
    },
  })
}
