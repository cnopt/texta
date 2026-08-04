import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './Home.jsx'
import Editor from './Editor.jsx'
import NotebookHomeView from './NotebookHomeView.jsx'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/notebook/:notebookId/page/:pageId" element={<Editor />} />
        <Route path="/notebook/:id" element={<NotebookHomeView />} />
        <Route path="/editor" element={<Editor />} />
      </Routes>
    </BrowserRouter>
  )
}
