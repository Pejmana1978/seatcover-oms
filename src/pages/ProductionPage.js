import { useState } from 'react'
import { StageBadge } from '../components/Badges'
import Btn from '../components/Btn'
import { STAGES } from '../lib/constants'
import { updateOrder } from '../lib/api'
import { useToast } from '../components/Toast'
import OrderModal from '../components/OrderModal'

export default function ProductionPage({ orders, setOrders, role }) {
  const [selected, setSelected] = useState(null)
  const toast = useToast()

  const prod = orders.filter(o => ['Verified', 'In Production', 'Production Complete'].includes(o.stage))

  async function advance(id) {
    const o = orders.find(x => x.id === id)
    if (!o) return
    const idx = STAGES.indexOf(o.stage)
    if (idx >= STAGES.length - 1) return
    const newStage = STAGES[idx + 1]
    try {
      const updated = await updateOrder(id, { stage: newStage })
      setOrders(prev => prev.map(x => x.id === id ? updated : x))
      toast(`${o.order_ref} → "${newStage}"`)
    } catch (e) { toast(e.message, 'error') }
  }

  function printSheet(o) {
    const w = window.open('', '_blank')
    const photos = (o.photos || []).filter(p => p.url).map(p => `<img src="${p.url}" style="max-width:180px;max-height:180px;border-radius:6px;border:1px solid #ddd" />`).join('')
    w.document.write(`
      <html><head><title>Production Sheet</title>
      <style>body{font-family:sans-serif;padding:32px;font-size:14px;line-height:2}h2{margin-bottom:12px}td:first-child{color:#888;min-width:140px;padding-right:16px}table{border-collapse:collapse}.photos{display:flex;gap:10px;flex-wrap:wrap;margin-top:12px}@media print{button{display:none}}</style>
      </head><body>
      <h2>Production Sheet</h2>
      <table>
        <tr><td>Car</td><td><strong>${o.car}</strong></td></tr>
        <tr><td>VIN</td><td style="font-family:monospace"><strong>${o.vin || '—'}</strong></td></tr>
        <tr><td>Position</td><td><strong>${(o.position || []).join(', ') || '—'}</strong></td></tr>
        <tr><td>Material</td><td><strong>${o.material || '—'}</strong></td></tr>
        <tr><td>Color / Trim</td><td><strong>${o.color || '—'}</strong></td></tr>
        <tr><td>Quantity</td><td><strong>${o.quantity || 1}</strong></td></tr>
        <tr><td>Notes</td><td>${o.notes || '—'}</td></tr>
        <tr><td>Status</td><td>${o.stage}</td></tr>
      </table>
      ${photos ? `<div class="photos">${photos}</div>` : ''}
      <br/><button onclick="window.print()">Print</button>
      </body></html>`)
    w.document.close()
  }

  function printAll() {
    if (!prod.length) { toast('No production orders'); return }
    const w = window.open('', '_blank')
    w.document.write(`<html><head><title>All Production Sheets</title>
      <style>body{font-family:sans-serif;padding:32px;font-size:13px;line-height:2}.sheet{page-break-after:always;margin-bottom:40px}h2{margin-bottom:12px}td:first-child{color:#888;min-width:140px;padding-right:16px}table{border-collapse:collapse}@media print{button{display:none}}</style>
      </head><body>
      ${prod.map(o => `<div class="sheet">
        <h2>Production Sheet — ${o.order_ref}</h2>
        <table>
          <tr><td>Order ID</td><td>${o.order_ref}</td></tr>
          <tr><td>Car</td><td><strong>${o.car}</strong></td></tr>
          <tr><td>VIN</td><td style="font-family:monospace"><strong>${o.vin || '—'}</strong></td></tr>
          <tr><td>Position</td><td><strong>${(o.position || []).join(', ') || '—'}</strong></td></tr>
          <tr><td>Material</td><td><strong>${o.material || '—'}</strong></td></tr>
          <tr><td>Color / Trim</td><td><strong>${o.color || '—'}</strong></td></tr>
          <tr><td>Quantity</td><td><strong>${o.quantity || 1}</strong></td></tr>
          <tr><td>Notes</td><td>${o.notes || '—'}</td></tr>
          <tr><td>Status</td><td>${o.stage}</td></tr>
        </table>
      </div>`).join('')}
      <button onclick="window.print()">Print all</button>
      </body></html>`)
    w.document.close()
  }

  function handleUpdated(updated) {
    setOrders(prev => prev.map(x => x.id === updated.id ? updated : x))
    setSelected(null)
  }

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <span style={{ fontSize: 12, color: '#888' }}>{prod.length} order{prod.length !== 1 ? 's' : ''} in production pipeline</span>
        <Btn size="sm" onClick={printAll}>Print all sheets</Btn>
      </div>

      {prod.length === 0 && (
        <div style={{ background: '#fff', border: '1px solid #e0ddd8', borderRadius: 10, padding: 32, textAlign: 'center', fontSize: 12, color: '#bbb' }}>
          No orders currently in production
        </div>
      )}

      {prod.map(o => (
        <div key={o.id} style={{ background: '#fff', border: '1px solid #e0ddd8', borderRadius: 10, padding: '13px 15px', marginBottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
            <div style={{ cursor: 'pointer' }} onClick={() => setSelected(o)}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{o.car}</div>
              <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>{o.stage}</div>
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              <StageBadge stage={o.stage} />
              <Btn size="sm" onClick={() => advance(o.id)}>Advance</Btn>
              <Btn size="sm" onClick={() => printSheet(o)}>Print sheet</Btn>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10, marginBottom: 8 }}>
            {[
              ['Car', o.car],
              ['Position', (o.position || []).join(', ') || '—'],
              ['Material', o.material || '—'],
              ['Color / Trim', o.color || '—'],
              ['Quantity', o.quantity || 1],
              ['VIN', o.vin || '—'],
            ].map(([k, v]) => (
              <div key={k}>
                <div style={{ fontSize: 10, color: '#aaa', marginBottom: 2 }}>{k}</div>
                <div style={{ fontSize: 12, fontWeight: 600, fontFamily: k === 'VIN' ? 'monospace' : undefined }}>{v}</div>
              </div>
            ))}
            {o.notes && (
              <div style={{ gridColumn: '1 / -1' }}>
                <div style={{ fontSize: 10, color: '#aaa', marginBottom: 2 }}>Notes</div>
                <div style={{ fontSize: 12 }}>{o.notes}</div>
              </div>
            )}
          </div>
          {(o.photos || []).length > 0 && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
              {o.photos.filter(p => p.url).map((p, i) => {
                const ext = (p.name || '').split('.').pop().toLowerCase()
                const isImage = ['jpg','jpeg','png','gif','webp'].includes(ext)
                return isImage ? (
                  <a key={i} href={p.url} target="_blank" rel="noreferrer">
                    <img src={p.url} alt="" style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 4, border: '1px solid #e0ddd8' }} />
                  </a>
                ) : null
              })}
            </div>
          )}
        </div>
      ))}

      {selected && (
        <OrderModal order={selected} role={role} onClose={() => setSelected(null)} onUpdated={handleUpdated} />
      )}
    </>
  )
}
