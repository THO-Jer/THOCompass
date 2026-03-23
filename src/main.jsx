import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import SurveyPage from './components/SurveyPage.jsx'
import { supabase } from './lib/supabase.js'

const surveyMatch = window.location.pathname.match(/^\/survey\/(.+)$/)

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {surveyMatch
      ? <SurveyPage token={surveyMatch[1]} supabase={supabase}/>
      : <App />
    }
  </React.StrictMode>,
)
