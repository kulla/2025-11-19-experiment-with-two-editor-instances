import '@picocss/pico/css/pico.min.css'
import './App.css'

import 'prosekit/basic/style.css'
import 'prosekit/basic/typography.css'

import type { EditorState } from '@prosekit/pm/state'
import { defineBasicExtension } from 'prosekit/basic'
import { createEditor, type NodeJSON, type SelectionJSON } from 'prosekit/core'
import { ProseKit, useStateUpdate } from 'prosekit/react'
import { useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { LoroDoc } from 'loro-crdt'
import { isEqual } from 'es-toolkit'

const loroDocA = new LoroDoc()
const loroDocB = new LoroDoc()

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
  const { doc: loroDocA } = useLoroDoc()
  const { doc: loroDocB } = useLoroDoc()

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
        <TextareaEditor doc={loroDocA} />
        <TextareaEditor doc={loroDocB} />
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
  const loroDoc = useRef(new LoroDoc()).current
  const lastReturn = useRef({ doc: loroDoc, version: loroDoc.version() })

  return useSyncExternalStore(
    (subscribe) => loroDoc.subscribe(subscribe),
    () => {
      if (loroDoc.version().compare(lastReturn.current.version) === 0) {
        return lastReturn.current
      }

      lastReturn.current = { doc: loroDoc, version: loroDoc.version() }

      return lastReturn.current
    },
  )
}

function TextareaEditor({ doc }: { doc: LoroDoc }) {
  const text = useMemo(() => doc.getText('content'), [doc])

  return (
    <textarea
      rows={10}
      cols={80}
      value={text.toString()}
      placeholder="Enter text..."
      onChange={(e) => {
        text.delete(0, text.length)
        text.insert(0, e.target.value)
        doc.commit()
      }}
    />
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
