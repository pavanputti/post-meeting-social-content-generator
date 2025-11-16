import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from "@/lib/auth"

export const dynamic = 'force-dynamic'

async function generateExampleWithGemini(description: string, platform: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('Gemini API key not configured')
  }

  const prompt = `Based on this automation description for ${platform}:

${description}

Generate a realistic example output that demonstrates what the generated content would look like. Make it specific, professional, and follow the style described in the description.

Return only the example content, no explanations.`

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 500,
        }
      }),
    }
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Gemini API error: ${error}`)
  }

  const data = await response.json()
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
  return text.trim()
}

function generateExampleWithTemplate(description: string, platform: string): string {
  // Create a template-based example
  if (platform === 'linkedin') {
    return `Just wrapped up an insightful conversation about strategic planning and growth opportunities. 

Key takeaways from our discussion:
• Importance of data-driven decision making
• Building strong client relationships
• Long-term value creation

Excited to implement these strategies and see the results. What's your experience with strategic planning?

#BusinessStrategy #Growth #Leadership`
  } else if (platform === 'facebook') {
    return `Had a great meeting today discussing new opportunities and strategies for growth. 

We covered some important topics including:
- Building stronger connections
- Creating value for clients
- Planning for the future

Looking forward to putting these ideas into action! What strategies have worked best for you?

#BusinessGrowth #Strategy #Success`
  }
  
  return `Example post based on your description:

This is a sample output that demonstrates the style and format described in your automation description. The actual generated content will follow the guidelines you've specified.

Key points:
• Professional tone
• Engaging content
• Platform-appropriate format`
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { description, platform } = body

    if (!description || !description.trim()) {
      return NextResponse.json(
        { error: 'Description is required' },
        { status: 400 }
      )
    }

    // Try Gemini API first
    let example = ''
    if (process.env.GEMINI_API_KEY) {
      try {
        example = await generateExampleWithGemini(description, platform || 'linkedin')
      } catch (error) {
        console.error('Gemini API error, using template:', error)
        example = generateExampleWithTemplate(description, platform || 'linkedin')
      }
    } else {
      example = generateExampleWithTemplate(description, platform || 'linkedin')
    }

    return NextResponse.json({ example })
  } catch (error: any) {
    console.error('Error generating example:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate example' },
      { status: 500 }
    )
  }
}

