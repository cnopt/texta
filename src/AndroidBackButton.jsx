import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { App } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { runEditorLeaveHandler } from './editorLeave.js'

/**
 * Overrides Android's hardware back button:
 * editor → notebook home → app home → exit.
 */
export default function AndroidBackButton() {
  const navigate = useNavigate()
  const { pathname } = useLocation()

  useEffect(() => {
    if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') {
      return undefined
    }

    const listener = App.addListener('backButton', () => {
      const pageMatch = pathname.match(/^\/notebook\/([^/]+)\/page\/[^/]+\/?$/)
      if (pageMatch) {
        void runEditorLeaveHandler().then(() => {
          navigate(`/notebook/${pageMatch[1]}`)
        })
        return
      }

      if (/^\/note(\/|$)/.test(pathname)) {
        void runEditorLeaveHandler().then(() => {
          navigate('/')
        })
        return
      }

      if (/^\/notebook\/[^/]+\/?$/.test(pathname)) {
        navigate('/')
        return
      }

      App.exitApp()
    })

    return () => {
      listener.then((handle) => handle.remove())
    }
  }, [navigate, pathname])

  return null
}
