import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export function useProducts() {
  const { user } = useAuth()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchProducts = useCallback(async () => {
    if (!user) {
      setProducts([])
      setLoading(false)
      return
    }
    setLoading(true)
    const { data, error: fetchError } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false })

    if (fetchError) setError(fetchError.message)
    else {
      setProducts(data ?? [])
      setError(null)
    }
    setLoading(false)
  }, [user])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  const addProduct = async (product) => {
    if (!user) return { error: new Error('Not signed in') }

    const { data, error: insertError } = await supabase
      .from('products')
      .insert({ ...product, owner_id: user.id })
      .select()
      .single()

    if (insertError) return { error: insertError }

    setProducts((prev) => [data, ...prev])
    return { data }
  }

  const deleteProduct = async (id) => {
    const { error: deleteError } = await supabase.from('products').delete().eq('id', id)
    if (!deleteError) setProducts((prev) => prev.filter((p) => p.id !== id))
    return { error: deleteError }
  }

  return { products, loading, error, addProduct, deleteProduct, refetch: fetchProducts }
}
