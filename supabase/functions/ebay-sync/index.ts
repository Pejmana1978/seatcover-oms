import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const EBAY_CLIENT_ID = Deno.env.get("EBAY_CLIENT_ID")!
const EBAY_CLIENT_SECRET = Deno.env.get("EBAY_CLIENT_SECRET")!
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SUPABASE_SERVICE_KEY = Deno.env.get("EBAY_SUPABASE_SERVICE_KEY")!

async function getEbayToken() {
  const credentials = btoa(`${EBAY_CLIENT_ID}:${EBAY_CLIENT_SECRET}`)
  const refreshToken = Deno.env.get("EBAY_REFRESH_TOKEN")!
  const res = await fetch("https://api.ebay.com/identity/v1/oauth2/token", {
    method: "POST",
    headers: {
      "Authorization": `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: `grant_type=refresh_token&refresh_token=${encodeURIComponent(refreshToken)}&scope=https://api.ebay.com/oauth/api_scope/sell.fulfillment.readonly`,
  })
  const data = await res.json()
  return data.access_token
}

function formatPhone(phone: string) {
  if (!phone) return ""
  const cleaned = phone.replace(/[\s\-().]/g, "")
  if (cleaned.startsWith("00")) return "+" + cleaned.slice(2)
  if (!cleaned.startsWith("+")) return "+" + cleaned
  return cleaned
}

function buildAddress(shipTo: Record<string, unknown>) {
  if (!shipTo) return ""
  const addr = shipTo.contactAddress as Record<string, unknown> || {}
  const parts = [
    addr.addressLine1,
    addr.addressLine2,
    addr.city,
    addr.stateOrProvince,
    addr.postalCode,
    addr.countryCode,
  ].filter(Boolean)
  return parts.join(", ")
}

serve(async () => {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    const token = await getEbayToken()
    const res = await fetch("https://api.ebay.com/sell/fulfillment/v1/order?limit=50", {
      headers: { "Authorization": `Bearer ${token}` },
    })
    const ebayData = await res.json()
    const ebayOrders = ebayData.orders || []
    let imported = 0

    for (const order of ebayOrders) {
      const ref = "EBAY-" + order.orderId.slice(-8)
      const { data: existing } = await supabase.from("orders").select("id").eq("order_ref", ref).single()
      if (existing) continue

      const buyer = order.buyer || {}
      const item = order.lineItems?.[0] || {}
      const fulfillment = order.fulfillmentStartInstructions?.[0] || {}
      const shipTo = fulfillment.shippingStep?.shipTo || {}
      const contactAddr = shipTo.contactAddress || {}

      const shippingPhone = formatPhone(shipTo.primaryPhone?.phoneNumber || "")
      const buyerPhone = formatPhone(buyer.taxAddress?.phone || buyer.buyerRegistrationAddress?.phone || "")
      const phones = [shippingPhone, buyerPhone].filter((p, i, arr) => p && arr.indexOf(p) === i)
      const phoneStr = phones.join(" / ")

      const address = [
        contactAddr.addressLine1,
        contactAddr.addressLine2,
        contactAddr.city,
        contactAddr.stateOrProvince,
        contactAddr.postalCode,
        contactAddr.countryCode,
      ].filter(Boolean).join(", ")

      const email = buyer.buyerRegistrationAddress?.email || ""
      const sku = item.sku || item.legacyItemId || ""
      const thumbnail = item.image?.imageUrl || ""
      const price = item.total?.value ? `${item.total.value} ${item.total.currency}` : ""
      const buyerUsername = buyer.username || ""

      const notes = [
        `eBay Order ID: ${order.orderId}`,
        buyerUsername ? `Buyer: ${buyerUsername}` : "",
        sku ? `SKU: ${sku}` : "",
        price ? `Price: ${price}` : "",
      ].filter(Boolean).join(" | ")

      await supabase.from("orders").insert({
        order_ref: ref,
        customer_name: shipTo.fullName || buyerUsername || "eBay Customer",
        email: email,
        phone: phoneStr,
        address: address,
        car: item.title || "See eBay order",
        seats: "Full set (5)",
        color: "",
        source: "eBay",
        stage: "New",
        notes: notes,
        thumbnail: thumbnail,
        order_date: order.creationDate ? order.creationDate.slice(0, 10) : new Date().toISOString().slice(0, 10),
        photos: [],
      })
      imported++
    }

    return new Response(JSON.stringify({ success: true, imported, total: ebayOrders.length }), {
      headers: { "Content-Type": "application/json" },
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 })
  }
})
