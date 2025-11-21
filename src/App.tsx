import '@picocss/pico/css/pico.min.css'
import 'prosekit/extensions/loro/style.css'
import './App.css'

import 'prosekit/basic/style.css'
import 'prosekit/basic/typography.css'

import type { EditorState } from '@prosekit/pm/state'
import { type AwarenessListener, LoroDoc } from 'loro-crdt'
import { CursorAwareness, type LoroDocType } from 'loro-prosemirror'
import { defineBasicExtension } from 'prosekit/basic'
import { createEditor, union } from 'prosekit/core'
import { defineLoro, defineLoroSyncPlugin } from 'prosekit/extensions/loro'
import { ProseKit, useStateUpdate } from 'prosekit/react'
import { useEffect, useMemo, useRef } from 'react'

enum EditorId {
  Question = 'question',
  Answer = 'answer',
}

export default function App() {
  const { doc: loroA, awareness: awarenessA, id: idA } = useLoroDoc()
  const { doc: loroB, awareness: awarenessB, id: idB } = useLoroDoc()

  useEffect(() => {
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
      <h1>Editors</h1>
      <div className="mb-6 flex gap-4">
        <ExerciseEditor doc={loroA} awareness={awarenessA} />
        <ExerciseEditor doc={loroB} awareness={awarenessB} />
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
  doc: LoroDoc
  awareness: CursorAwareness
}

function ExerciseEditor({ doc, awareness }: ExerciseEditorProps) {
  return (
    <article className="w-80">
      <h5>Question:</h5>
      <Editor
        id={EditorId.Question}
        doc={doc}
        awareness={awareness}
        onChange={() => void 0}
      />
      <h5>Answer:</h5>
      <Editor
        id={EditorId.Answer}
        doc={doc}
        awareness={awareness}
        onChange={() => void 0}
      />
    </article>
  )
}

interface EditorProps extends ExerciseEditorProps {
  id: EditorId
  onChange: (id: EditorId, state: EditorState) => void
}

function Editor({ id, onChange, doc, awareness }: EditorProps) {
  const editor = useMemo(() => {
    const loroMap = doc.getMap(`editor-${id}`)
    const extension = union(
      defineBasicExtension(),
      defineLoroSyncPlugin({
        doc: doc as LoroDocType,
        containerId: loroMap.id,
      }),
    )
    return createEditor({ extension })
  }, [doc, id])

  useStateUpdate((state) => onChange(id, state), { editor })

  return (
    <ProseKit editor={editor}>
      <div ref={editor.mount} className="mb-2" />
    </ProseKit>
  )
}
