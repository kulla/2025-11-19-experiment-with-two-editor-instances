import '@picocss/pico/css/pico.min.css'
import 'prosekit/extensions/loro/style.css'
import './App.css'

import 'prosekit/basic/style.css'
import 'prosekit/basic/typography.css'

import type { EditorState } from '@prosekit/pm/state'
import { AwarenessListener, LoroDoc } from 'loro-crdt'
import { CursorAwareness, type LoroDocType } from 'loro-prosemirror'
import { defineBasicExtension } from 'prosekit/basic'
import {
  createEditor,
  type NodeJSON,
  type SelectionJSON,
  union,
} from 'prosekit/core'
import { defineLoro } from 'prosekit/extensions/loro'
import { ProseKit, useStateUpdate } from 'prosekit/react'
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react'

enum EditorId {
  Question = 'question',
  Answer = 'answer',
}

interface AppState {
  selection: { id: EditorId; selection: SelectionJSON } | null
  content: Record<EditorId, NodeJSON>
}

const emptyContent: NodeJSON = {
  type: 'doc',
  content: [{ type: 'paragraph' }],
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
      if (origin === 'local') {
        awarenessB.apply(awarenessA.encode([idA]))
      }
    }
    const awarenessBListener: AwarenessListener = (_, origin) => {
      if (origin === 'local') {
        awarenessA.apply(awarenessB.encode([idB]))
      }
    }
    awarenessA.addListener(awarenessAListener)
    awarenessB.addListener(awarenessBListener)

    return () => {
      unsubscribeA()
      unsubscribeB()
    }
  }, [loroA, loroB, awarenessA, awarenessB, idA, idB])

  const [state, setState] = useState<AppState>({
    selection: null,
    content: {
      [EditorId.Question]: emptyContent,
      [EditorId.Answer]: emptyContent,
    },
  })

  const handleChange = (id: EditorId, editorState: EditorState) => {
    setState((prevState) => ({
      selection: {
        id,
        selection: editorState.selection.toJSON() as SelectionJSON,
      },
      content: {
        ...prevState.content,
        [id]: editorState.doc.toJSON() as NodeJSON,
      },
    }))
  }

  return (
    <main className="p-10">
      <div className="mb-6 flex gap-4">
        <TextareaEditor doc={loroA} />
        <TextareaEditor doc={loroB} />
      </div>

      <h1>ProseKit Basic Editor</h1>
      <article>
        <h5>Question:</h5>
        <Editor id={EditorId.Question} onChange={handleChange} />
        <h5>Answer:</h5>
        <Editor id={EditorId.Answer} onChange={handleChange} />
      </article>
      <h1>App State:</h1>
      <pre>{JSON.stringify(state, null, 2)}</pre>
    </main>
  )
}

function useLoroDoc() {
  const doc = useRef<LoroDocType>(new LoroDoc()).current
  const id = useRef(doc.peerIdStr).current
  const awareness = useRef(new CursorAwareness(id)).current
  const lastReturn = useRef({ doc, awareness, id, version: doc.version() })

  return useSyncExternalStore(
    (listener) => doc.subscribe(listener),
    () => {
      if (doc.version().compare(lastReturn.current.version) === 0) {
        return lastReturn.current
      }

      lastReturn.current = { doc, id, awareness, version: doc.version() }

      return lastReturn.current
    },
  )
}

function TextareaEditor({ doc }: { doc: LoroDocType }) {
  const editor = useMemo(() => {
    const awareness = new CursorAwareness(doc.peerIdStr)
    const extension = union(
      defineBasicExtension(),
      defineLoro({ doc, awareness }),
    )
    return createEditor({ extension })
  }, [doc])

  return (
    <ProseKit editor={editor}>
      <div ref={editor.mount} className="mb-2 border-2 w-80 p-4 rounded-2xl" />
    </ProseKit>
  )
}

interface EditorProps {
  id: EditorId
  onChange: (id: EditorId, state: EditorState) => void
}

function Editor({ id, onChange }: EditorProps) {
  const editor = useMemo(() => {
    const extension = defineBasicExtension()
    return createEditor({ extension })
  }, [])

  useStateUpdate((state) => onChange(id, state), { editor })

  return (
    <ProseKit editor={editor}>
      <div ref={editor.mount} className="mb-2" />
    </ProseKit>
  )
}
