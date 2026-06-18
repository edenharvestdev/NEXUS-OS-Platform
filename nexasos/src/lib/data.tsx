'use client'
import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { api } from './api'
import { getToken } from './users'

type AppDataContextType = {
  // Data
  employees: any[]
  transactions: any[]
  tasks: any[]
  deals: any[]
  campaigns: any[]
  meetingActions: any[]
  docs: any[]
  // Setters (for local UI optimistic updates)
  setEmployees: React.Dispatch<React.SetStateAction<any[]>>
  setTransactions: React.Dispatch<React.SetStateAction<any[]>>
  setTasks: React.Dispatch<React.SetStateAction<any[]>>
  setDeals: React.Dispatch<React.SetStateAction<any[]>>
  setCampaigns: React.Dispatch<React.SetStateAction<any[]>>
  setMeetingActions: React.Dispatch<React.SetStateAction<any[]>>
  setDocs: React.Dispatch<React.SetStateAction<any[]>>
  // Refresh
  refresh: () => Promise<void>
  loading: boolean
}

const AppDataContext = createContext<AppDataContextType | null>(null)

export function DataProvider({ children }: { children: ReactNode }) {
  const [employees, setEmployees]         = useState<any[]>([])
  const [transactions, setTransactions]   = useState<any[]>([])
  const [tasks, setTasks]                 = useState<any[]>([])
  const [deals, setDeals]                 = useState<any[]>([])
  const [campaigns, setCampaigns]         = useState<any[]>([])
  const [meetingActions, setMeetingActions] = useState<any[]>([])
  const [docs, setDocs]                   = useState<any[]>([])
  const [loading, setLoading]             = useState(false)
  const [mounted, setMounted]             = useState(false)

  const refresh = useCallback(async () => {
    if (!getToken()) return
    setLoading(true)
    try {
      const [empRes, txRes, dealRes, camRes, meetRes, docRes, taskRes] = await Promise.allSettled([
        api.getEmployees(),
        api.getTransactions(),
        api.getDeals(),
        api.getCampaigns(),
        api.getMeetings(),
        api.getDocuments(),
        api.getTasks(),
      ])

      if (empRes.status === 'fulfilled')  setEmployees(empRes.value.data || [])
      if (txRes.status === 'fulfilled')   setTransactions(txRes.value.data || [])
      if (dealRes.status === 'fulfilled') setDeals(dealRes.value.data || [])
      if (camRes.status === 'fulfilled')  setCampaigns(camRes.value.data || [])
      if (meetRes.status === 'fulfilled') {
        const meetings = meetRes.value.data || []
        // Flatten action_items across all meetings
        const actions: any[] = []
        meetings.forEach((m: any) => {
          if (Array.isArray(m.action_items)) {
            m.action_items.forEach((a: any) => actions.push({ ...a, meetingTitle: m.title }))
          }
        })
        setMeetingActions(actions)
      }
      if (docRes.status === 'fulfilled')  setDocs(docRes.value.data || [])
      if (taskRes.status === 'fulfilled') setTasks(taskRes.value.data || [])
    } catch (e) {
      console.warn('DataProvider refresh error:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted) refresh()
  }, [mounted, refresh])

  if (!mounted) return null

  return (
    <AppDataContext.Provider value={{
      employees, setEmployees,
      transactions, setTransactions,
      tasks, setTasks,
      deals, setDeals,
      campaigns, setCampaigns,
      meetingActions, setMeetingActions,
      docs, setDocs,
      refresh,
      loading,
    }}>
      {children}
    </AppDataContext.Provider>
  )
}

export const useAppData = () => {
  const ctx = useContext(AppDataContext)
  if (!ctx) throw new Error('useAppData must be used within DataProvider')
  return ctx
}
