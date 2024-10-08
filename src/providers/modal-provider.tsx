'use client'
import { PricesList, TicketDetails } from '@/lib/types'
import { Agency, Contact, Plan, User } from '@prisma/client'
import React, { createContext, useContext, useEffect, useState } from 'react'

type ModalProviderProps = {
  children: React.ReactNode
}
type SetOpenType = {
  modal: React.ReactNode, fetchData?: () => Promise<any>
}
type ModalData = {
  user?: User
  agency?: Agency
  ticket?: TicketDetails[0]
  contact?: Contact
  plans?: {
    defaultPriceId: Plan
    plans: PricesList['data']
  }
}

const ModalProvider = ({ children }: ModalProviderProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const [data, setData] = useState<ModalData>({})
  const [isMounted, setIsMounted] = useState(false)
  const [showingModal, setShowingModal] = useState<React.ReactNode>(null)


  useEffect(() => {
    setIsMounted(true)
  }, [])

  const setOpen = async ({ modal, fetchData }: SetOpenType) => {

    if (!modal) return
    if (!fetchData) return setData(data)

    if (fetchData) {
      const newData = await fetchData()
      const updatedData = { ...data, ...newData }

      setData(updatedData)
    }
    setShowingModal(modal)
    setIsOpen(true)
  }

  const setClose = () => {
    setIsOpen(false)
    setData(data)
  }

  if (!isMounted) return null


  return (
    <ModalContext.Provider value={{ data, setOpen, setClose, isOpen }}>
      {children}
      {showingModal}
    </ModalContext.Provider>
  )
}

type ModalContextType = {
  data: ModalData
  isOpen: boolean
  setOpen: ({ modal, fetchData }: SetOpenType) => void
  setClose: () => void
}

// Fallback Functionality: If a component tries to call setOpen or setClose and there is
// no provider above it in the component tree, it won’t throw an error 
// since it will simply execute an empty function.
export const ModalContext = createContext<ModalContextType>({
  data: {},
  isOpen: false,
  setOpen: () => { },
  setClose: () => { },
})

export const useModal = () => {
  const context = useContext(ModalContext)
  if (!context) throw new Error('useModal must be used within the modal provider')
  return context

}

export default ModalProvider