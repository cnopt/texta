import { BrowserRouter, Routes, Route } from 'react-router-dom'
import AndroidBackButton from './AndroidBackButton.jsx'
import Home from './Home.jsx'
import Editor from './Editor.jsx'
import NotebookHomeView from './NotebookHomeView.jsx'

export default function App() {
  return (
    <BrowserRouter>
      <AndroidBackButton />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/notebook/:notebookId/page/:pageId" element={<Editor />} />
        <Route path="/notebook/:id" element={<NotebookHomeView />} />
        <Route path="/note/:noteId" element={<Editor />} />
      </Routes>
    </BrowserRouter>
  )
}
