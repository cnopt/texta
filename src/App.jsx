import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import AndroidBackButton from './AndroidBackButton.jsx'
import Home from './Home.jsx'
import Editor from './Editor.jsx'
import NotebookHomeView from './NotebookHomeView.jsx'

export default function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  )
}

function AppShell() {
  const { pathname } = useLocation()
  const isHome = pathname === '/'

  return (
    <>
      <AndroidBackButton />
      <div className="app-home" hidden={!isHome} inert={!isHome}>
        <Home active={isHome} />
      </div>
      <Routes>
        <Route path="/notebook/:notebookId/page/:pageId" element={<Editor />} />
        <Route path="/notebook/:id" element={<NotebookHomeView />} />
        <Route path="/note/:noteId" element={<Editor />} />
      </Routes>
    </>
  )
}
