import '@picocss/pico/css/pico.min.css'
import './App.css'

import 'prosekit/basic/style.css'
import 'prosekit/basic/typography.css'

import { defineBasicExtension } from 'prosekit/basic'
import { createEditor } from 'prosekit/core'
import { ProseKit } from 'prosekit/react'
import { useMemo } from 'react'

export default function App() {
  const editor = useMemo(() => {
    const extension = defineBasicExtension()
    return createEditor({ extension })
  }, [])

  return (
    <main className="p-10">
      <ProseKit editor={editor}>
        <div ref={editor.mount} className="border-2 rounded-xl p-4"></div>
      </ProseKit>
    </main>
  )
}
