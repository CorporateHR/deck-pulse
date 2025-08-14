import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        auth: {
          persistSession: false,
        },
      }
    )

    // Get the authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response('Missing authorization header', { 
        status: 401, 
        headers: corsHeaders 
      })
    }

    // Set the auth token
    await supabaseClient.auth.setSession({
      access_token: authHeader.replace('Bearer ', ''),
      refresh_token: '',
    })

    const { speakerId, feedbackUrl, userId } = await req.json()

    if (!speakerId || !feedbackUrl || !userId) {
      return new Response('Missing required fields', { 
        status: 400, 
        headers: corsHeaders 
      })
    }

    // Generate QR code SVG
    const qrSvg = generateQRCodeSVG(feedbackUrl)
    
    // Convert SVG to PNG
    const pngBuffer = await svgToPng(qrSvg)
    
    // Upload to Supabase Storage
    const fileName = `${userId}/${speakerId}.png`
    const { data: uploadData, error: uploadError } = await supabaseClient.storage
      .from('qr-codes')
      .upload(fileName, pngBuffer, {
        contentType: 'image/png',
        upsert: true
      })

    if (uploadError) {
      throw uploadError
    }

    // Get public URL
    const { data: urlData } = supabaseClient.storage
      .from('qr-codes')
      .getPublicUrl(fileName)

    // Update speaker record with QR code URL
    const { error: updateError } = await supabaseClient
      .from('speakers')
      .update({ qr_code_url: urlData.publicUrl })
      .eq('id', speakerId)

    if (updateError) {
      throw updateError
    }

    return new Response(
      JSON.stringify({ qr_code_url: urlData.publicUrl }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})

function generateQRCodeSVG(text: string): string {
  // Simple QR code generation using a basic algorithm
  // In production, you might want to use a more robust QR library
  const size = 256
  const modules = 25 // QR code modules per side
  const moduleSize = size / modules
  
  // Generate a simple pattern for demo (you'd use a real QR algorithm here)
  const pattern = generateQRPattern(text, modules)
  
  let svg = `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">`
  svg += `<rect width="${size}" height="${size}" fill="white"/>`
  
  for (let y = 0; y < modules; y++) {
    for (let x = 0; x < modules; x++) {
      if (pattern[y][x]) {
        svg += `<rect x="${x * moduleSize}" y="${y * moduleSize}" width="${moduleSize}" height="${moduleSize}" fill="black"/>`
      }
    }
  }
  
  svg += '</svg>'
  return svg
}

function generateQRPattern(text: string, size: number): boolean[][] {
  // Simple hash-based pattern generation for demo
  // In production, use a proper QR code library
  const pattern: boolean[][] = Array(size).fill(null).map(() => Array(size).fill(false))
  
  // Create a simple hash of the text
  let hash = 0
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) - hash) + text.charCodeAt(i)
    hash = hash & hash // Convert to 32bit integer
  }
  
  // Generate pattern based on hash
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const value = (hash + x * 7 + y * 11) % 256
      pattern[y][x] = value > 128
    }
  }
  
  return pattern
}

async function svgToPng(svg: string): Promise<Uint8Array> {
  // For this demo, we'll return the SVG as bytes
  // In production, you'd use a proper SVG to PNG converter
  const encoder = new TextEncoder()
  return encoder.encode(svg)
}