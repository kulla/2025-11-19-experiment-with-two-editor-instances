import '@picocss/pico/css/pico.min.css'
import './App.css'

import 'prosekit/basic/style.css'
import 'prosekit/basic/typography.css'

import { defineBasicExtension } from 'prosekit/basic'
import { createEditor, SelectionJSON, type NodeJSON } from 'prosekit/core'
import type { EditorState } from '@prosekit/pm/state'
import { ProseKit, useStateUpdate } from 'prosekit/react'
import { useMemo, useState } from 'react'

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
  const [state, setState] = useState<AppState>({
    selection: null,
    content: {
      [EditorId.Question]: emptyContent,
      [EditorId.Answer]: emptyContent,
    },
  })

  return (
    <main className="p-10">
      <h1>ProseKit Basic Editor</h1>
      <article>
        <h5>Question:</h5>
        <Editor onChange={createOnChange(EditorId.Question)} />
        <h5>Answer:</h5>
        <Editor onChange={createOnChange(EditorId.Answer)} />
      </article>
      <h1>App State:</h1>
      <pre>{JSON.stringify(state, null, 2)}</pre>
    </main>
  )

  function createOnChange(id: EditorId) {
    return (editorState: EditorState) => {
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
  }
}

interface EditorProps {
  onChange: (state: EditorState) => void
}

function Editor({ onChange }: EditorProps) {
  const editor = useMemo(() => {
    const extension = defineBasicExtension()
    return createEditor({ extension })
  }, [])

  useStateUpdate(onChange, { editor })

  return (
    <ProseKit editor={editor}>
      <div ref={editor.mount} className="mb-2" />
    </ProseKit>
  )
}
