import '@picocss/pico/css/pico.min.css'
import './App.css'

import 'prosekit/basic/style.css'
import 'prosekit/basic/typography.css'

import { defineBasicExtension } from 'prosekit/basic'
import { createEditor } from 'prosekit/core'
import { ProseKit } from 'prosekit/react'
import { useMemo } from 'react'

export default function App() {
  return (
    <main className="p-10">
      <h1>ProseKit Basic Editor</h1>
      <Editor />
    </main>
  )
}

function Editor() {
  const editor = useMemo(() => {
    const extension = defineBasicExtension()
    return createEditor({ extension })
  }, [])

  return (
    <ProseKit editor={editor}>
      <div ref={editor.mount} className="p-4"></div>
    </ProseKit>
  )
}
