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

async function getThumbnail(token: string, itemId: string, sku: string): Promise<string> {
  const variationId = sku ? sku.split("_")[1] || "0" : "0"
  const urlsToTry = [
    `https://api.ebay.com/buy/browse/v1/item/v1|${itemId}|${variationId}?fieldgroups=PRODUCT`,
    `https://api.ebay.com/buy/browse/v1/item/v1|${itemId}|0?fieldgroups=PRODUCT`,
  ]
  for (const url of urlsToTry) {
    try {
      const res = await fetch(url, {
        headers: { "Authorization": `Bearer ${token}`, "X-EBAY-C-MARKETPLACE-ID": "EBAY_GB" },
      })
      const data = await res.json()
      const img = data.image?.imageUrl || data.additionalImages?.[0]?.imageUrl || ""
      if (img) return img
    } catch {
      continue
    }
  }
  return ""
}

serve(async () => {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    const token = await getEbayToken()

    // Fetch all eBay orders from API
    const res = await fetch("https://api.ebay.com/sell/fulfillment/v1/order?limit=50", {
      headers: { "Authorization": `Bearer ${token}` },
    })
    const ebayData = await res.json()
    const ebayOrders = ebayData.orders || []

    // Get our orders without thumbnails
    const { data: orders } = await supabase
      .from("orders")
      .select("id, order_ref")
      .eq("source", "eBay")
      .or("thumbnail.is.null,thumbnail.eq.")

    if (!orders || orders.length === 0) {
      return new Response(JSON.stringify({ success: true, updated: 0, total: 0 }), {
        headers: { "Content-Type": "application/json" },
      })
    }

    // Build map of orderId -> legacyItemId + sku
    const ebayMap: Record<string, { itemId: string, sku: string }> = {}
    for (const order of ebayOrders) {
      const item = order.lineItems?.[0] || {}
      ebayMap[order.orderId] = {
        itemId: item.legacyItemId || "",
        sku: item.sku || "",
      }
    }

    let updated = 0
    for (const order of orders) {
      const ebayInfo = ebayMap[order.order_ref]
      if (!ebayInfo || !ebayInfo.itemId) continue
      const thumbnail = await getThumbnail(token, ebayInfo.itemId, ebayInfo.sku)
      if (!thumbnail) continue
      await supabase.from("orders").update({ thumbnail }).eq("id", order.id)
      updated++
    }

    return new Response(JSON.stringify({ success: true, updated, total: orders.length }), {
      headers: { "Content-Type": "application/json" },
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 })
  }
})
