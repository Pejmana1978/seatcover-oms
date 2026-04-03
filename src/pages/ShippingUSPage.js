import { useState } from 'react'
import Btn from '../components/Btn'
import { updateOrder } from '../lib/api'
import { useToast } from '../components/Toast'
import OrderModal from '../components/OrderModal'

export default function ShippingUSPage({ orders, setOrders, role }) {
  const [selected, setSelected] = useState(null)
  const toast = useToast()

  const queue = orders.filter(o => o.stage === 'Production Complete')

  async function advance(id) {
    const o = orders.find(x => x.id === id)
    if (!o) return
    try {
      const updated = await updateOrder(id, { stage: 'Shipped to Sweden' })
      setOrders(prev => prev.map(x => x.id === id ? updated : x))
      toast(o.order_ref + ' → Shipped to Sweden')
    } catch (e) { toast(e.message, 'error') }
  }

  function handleUpdated(updated) {
    setOrders(prev => prev.map(x => x.id === updated.id ? updated : x))
    setSelected(null)
  }

  return (
    <>
      {queue.length === 0 && (
        <div style={{ background: '#fff', border: '1px solid #e0ddd8', borderRadius: 10, padding: 32, textAlign: 'center', fontSize: 12, color: '#bbb' }}>
          No orders ready to ship from USA
        </div>
      )}
      {queue.length > 0 && (
        <div style={{ background: '#fff', border: '1px solid #e0ddd8', borderRadius: 10, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
            <thead>
              <tr style={{ background: '#f9f9f8' }}>
                {['Order ID', 'Car', 'Position', 'Material', 'Color / Trim', 'Qty', 'Actions'].map((h, i) => (
                  <th key={h} style={{ padding: '8px 11px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#888', borderBottom: '1px solid #e0ddd8', width: [90, 180, 160, 120, 120, 40, 100][i] }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {queue.map(o => (
                <tr key={o.id} onClick={() => setSelected(o)} style={{ cursor: 'pointer' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#fafaf9'}
                  onMouseLeave={e => e.currentTarget.style.background = ''}>
                  <td style={{ padding: '9px 11px', fontSize: 11, fontWeight: 600, color: '#185FA5' }}>{o.order_ref}</td>
                  <td style={{ padding: '9px 11px', fontSize: 12 }}>{o.car}</td>
                  <td style={{ padding: '9px 11px', fontSize: 12 }}>{(o.position || []).join(', ') || '—'}</td>
                  <td style={{ padding: '9px 11px', fontSize: 12 }}>{o.material || '—'}</td>
                  <td style={{ padding: '9px 11px', fontSize: 12 }}>{o.color || '—'}</td>
                  <td style={{ padding: '9px 11px', fontSize: 12 }}>{o.quantity || 1}</td>
                  <td style={{ padding: '9px 11px' }} onClick={e => e.stopPropagation()}>
                    <Btn size="sm" variant="primary" onClick={() => advance(o.id)}>Mark Shipped</Btn>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {selected && <OrderModal order={selected} role={role} onClose={() => setSelected(null)} onUpdated={handleUpdated} />}
    </>
  )
}
