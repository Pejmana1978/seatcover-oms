import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import Btn from '../components/Btn'
import { useToast } from '../components/Toast'

export default function StockPage() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState({})
  const [showAdd, setShowAdd] = useState(false)
  const [newItem, setNewItem] = useState({ model: '', type: '', colour: '', quantity: 0 })
  const toast = useToast()

  useEffect(() => { loadStock() }, [])

  async function loadStock() {
    const { data, error } = await supabase.from('stock').select('*').order('model').order('type').order('colour')
    if (error) toast(error.message, 'error')
    else setItems(data || [])
    setLoading(false)
  }

  async function updateQty(id, qty) {
    const { error } = await supabase.from('stock').update({ quantity: qty, updated_at: new Date().toISOString() }).eq('id', id)
    if (error) { toast(error.message, 'error'); return }
    setItems(prev => prev.map(x => x.id === id ? { ...x, quantity: qty } : x))
    setEditing(prev => ({ ...prev, [id]: undefined }))
    toast('Quantity updated')
  }

  async function updateItem(id, field, value) {
    const { error } = await supabase.from('stock').update({ [field]: value, updated_at: new Date().toISOString() }).eq('id', id)
    if (error) { toast(error.message, 'error'); return }
    setItems(prev => prev.map(x => x.id === id ? { ...x, [field]: value } : x))
    toast('Updated')
  }

  async function addItem() {
    if (!newItem.model || !newItem.colour) { toast('Model and colour are required', 'error'); return }
    const { data, error } = await supabase.from('stock').insert([newItem]).select().single()
    if (error) { toast(error.message, 'error'); return }
    setItems(prev => [...prev, data])
    setNewItem({ model: '', type: '', colour: '', quantity: 0 })
    setShowAdd(false)
    toast('Item added')
  }

  async function deleteItem(id) {
    if (!window.confirm('Delete this item?')) return
    const { error } = await supabase.from('stock').delete().eq('id', id)
    if (error) { toast(error.message, 'error'); return }
    setItems(prev => prev.filter(x => x.id !== id))
    toast('Item deleted')
  }

  const grouped = items.reduce((acc, item) => {
    if (!acc[item.model]) acc[item.model] = []
    acc[item.model].push(item)
    return acc
  }, {})

  if (loading) return <div style={{ textAlign: 'center', padding: 48, color: '#bbb' }}>Loading stock…</div>

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <Btn variant="primary" onClick={() => setShowAdd(v => !v)}>+ Add item</Btn>
      </div>

      {showAdd && (
        <div style={{ background: '#fff', border: '1px solid #e0ddd8', borderRadius: 10, padding: 16, marginBottom: 16, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <label style={{ fontSize: 11, color: '#666' }}>Model</label>
            <input value={newItem.model} onChange={e => setNewItem(p => ({ ...p, model: e.target.value }))} placeholder="e.g. C-Class 2014-2021 (W205)" style={{ width: 220 }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <label style={{ fontSize: 11, color: '#666' }}>Type</label>
            <input value={newItem.type} onChange={e => setNewItem(p => ({ ...p, type: e.target.value }))} placeholder="e.g. 2-piece" style={{ width: 100 }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <label style={{ fontSize: 11, color: '#666' }}>Colour</label>
            <input value={newItem.colour} onChange={e => setNewItem(p => ({ ...p, colour: e.target.value }))} placeholder="e.g. Black" style={{ width: 120 }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <label style={{ fontSize: 11, color: '#666' }}>Qty</label>
            <input type="number" min="0" value={newItem.quantity} onChange={e => setNewItem(p => ({ ...p, quantity: parseInt(e.target.value) || 0 }))} style={{ width: 60 }} />
          </div>
          <Btn variant="primary" onClick={addItem}>Save</Btn>
          <Btn onClick={() => setShowAdd(false)}>Cancel</Btn>
        </div>
      )}

      {Object.entries(grouped).map(([model, modelItems]) => (
        <div key={model} style={{ background: '#fff', border: '1px solid #e0ddd8', borderRadius: 10, overflow: 'hidden', marginBottom: 16 }}>
          <div style={{ padding: '10px 14px', background: '#f9f9f8', borderBottom: '1px solid #e0ddd8', fontSize: 13, fontWeight: 600 }}>{model}</div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Type', 'Colour', 'Quantity', 'Actions'].map((h, i) => (
                  <th key={h} style={{ padding: '7px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#888', borderBottom: '1px solid #e0ddd8', width: [120, 160, 100, 200][i] }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {modelItems.map(item => (
                <tr key={item.id}
                  onMouseEnter={e => e.currentTarget.style.background = '#fafaf9'}
                  onMouseLeave={e => e.currentTarget.style.background = ''}>
                  <td style={{ padding: '8px 14px', fontSize: 12 }}>
                    <input defaultValue={item.type || ''} onBlur={e => { if (e.target.value !== item.type) updateItem(item.id, 'type', e.target.value) }}
                      style={{ border: 'none', background: 'transparent', fontSize: 12, width: '100%', outline: 'none' }} />
                  </td>
                  <td style={{ padding: '8px 14px', fontSize: 12 }}>
                    <input defaultValue={item.colour} onBlur={e => { if (e.target.value !== item.colour) updateItem(item.id, 'colour', e.target.value) }}
                      style={{ border: 'none', background: 'transparent', fontSize: 12, width: '100%', outline: 'none' }} />
                  </td>
                  <td style={{ padding: '8px 14px' }}>
                    {editing[item.id] !== undefined ? (
                      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                        <input type="number" min="0" value={editing[item.id]}
                          onChange={e => setEditing(prev => ({ ...prev, [item.id]: parseInt(e.target.value) || 0 }))}
                          style={{ width: 60, fontSize: 12 }} autoFocus
                          onKeyDown={e => { if (e.key === 'Enter') updateQty(item.id, editing[item.id]); if (e.key === 'Escape') setEditing(prev => ({ ...prev, [item.id]: undefined })) }} />
                        <Btn size="sm" variant="primary" onClick={() => updateQty(item.id, editing[item.id])}>✓</Btn>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: item.quantity === 0 ? '#E24B4A' : item.quantity <= 2 ? '#d97706' : '#27a069' }}>{item.quantity}</span>
                        {item.quantity === 0 && <span style={{ fontSize: 10, color: '#E24B4A' }}>Out of stock</span>}
                        {item.quantity > 0 && item.quantity <= 2 && <span style={{ fontSize: 10, color: '#d97706' }}>Low stock</span>}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '8px 14px' }}>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <Btn size="sm" onClick={() => setEditing(prev => ({ ...prev, [item.id]: item.quantity }))}>Edit qty</Btn>
                      <Btn size="sm" onClick={() => updateQty(item.id, item.quantity + 1)}>+1</Btn>
                      <Btn size="sm" onClick={() => { if (item.quantity > 0) updateQty(item.id, item.quantity - 1) }}>-1</Btn>
                      <Btn size="sm" variant="danger" onClick={() => deleteItem(item.id)}>✕</Btn>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  )
}
