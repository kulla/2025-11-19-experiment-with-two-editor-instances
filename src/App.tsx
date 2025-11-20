import '@picocss/pico/css/pico.min.css'
import './App.css'

import 'prosekit/basic/style.css'
import 'prosekit/basic/typography.css'

import type { EditorState } from '@prosekit/pm/state'
import { defineBasicExtension } from 'prosekit/basic'
import { createEditor, type NodeJSON, type SelectionJSON } from 'prosekit/core'
import { ProseKit, useStateUpdate } from 'prosekit/react'
import { useMemo, useRef, useState } from 'react'
import { LoroDoc } from 'loro-crdt'

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
  const loroDocA = useRef(new LoroDoc()).current
  const loroDocB = useRef(new LoroDoc()).current

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

function TextareaEditor({ doc }: { doc: LoroDoc }) {
  const text = doc.getText('content')

  return <textarea rows={10} cols={80} />
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
