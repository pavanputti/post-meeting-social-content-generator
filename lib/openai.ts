// Free AI post generation using Google Gemini API (free tier) or template-based fallback

export async function generatePost(
  transcript: string,
  automation?: {
    description: string
    example?: string
  }
): Promise<string> {
  // Try Gemini API first (free tier available)
  if (process.env.GEMINI_API_KEY) {
    try {
      console.log('Using Gemini API for post generation')
      const post = await generateWithGemini(transcript, automation)
      if (post && post.trim().length > 50) {
        console.log('Successfully generated post with Gemini, length:', post.length)
        return post
      } else {
        console.log('Gemini returned empty/short post, falling back to template')
      }
    } catch (error) {
      console.error('Gemini API error, falling back to template:', error)
      // Fall through to template-based generation
    }
  } else {
    console.log('No Gemini API key found, using template-based generation')
  }

  // Fallback to template-based generation (completely free, no API needed)
  console.log('Using template-based post generation')
  return generateWithTemplate(transcript, automation)
}

async function generateWithGemini(
  transcript: string,
  automation?: {
    description: string
    example?: string
  }
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('Gemini API key not configured')
  }

  // Clean the transcript before sending to AI
  const cleanTranscript = transcript
    .replace(/\[object Object\]:\s*/g, '')
    .replace(/\[.*?\]\s*/g, '') // Remove timestamps
    .replace(/^[^:]+:\s*/gm, '') // Remove speaker names
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim()

  // Build the prompt based on automation or default
  let prompt = automation?.description || 
    `Draft a LinkedIn post (120-180 words) that summarizes the meeting value in first person.
Use a warm, conversational tone consistent with an experienced financial advisor.
End with up to three hashtags.
Return only the post text.`

  // If there's an example, include it in the prompt
  if (automation?.example) {
    prompt += `\n\nExample of the desired style:\n${automation.example}\n`
  }

  const fullPrompt = `${prompt}\n\nGenerate a social media post based on this meeting transcript:\n\n${cleanTranscript}\n\nIMPORTANT: Create an original post that summarizes and recaps the discussion. Do NOT include the raw transcript.`

  // Use Google Gemini API (free tier: 15 requests per minute)
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
            text: fullPrompt
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
  return data.candidates?.[0]?.content?.parts?.[0]?.text || ''
}

function generateWithTemplate(
  transcript: string,
  automation?: {
    description: string
    example?: string
  }
): string {
  // Clean the transcript first
  let cleanTranscript = transcript
    .replace(/\[object Object\]:\s*/g, '')
    .replace(/\[.*?\]\s*/g, '') // Remove timestamps
    .replace(/^[^:]+:\s*/gm, '') // Remove speaker names
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim()
  
  // Extract key information from transcript using simple text processing
  const sentences = cleanTranscript
    .split(/[.!?]+/)
    .map(s => s.trim())
    .filter(s => s.length > 30 && s.length < 500) // Filter meaningful sentences
  
  // Find key points
  const keyPoints: string[] = []
  
  sentences.forEach(sentence => {
    const lower = sentence.toLowerCase()
    // Skip filler and meaningless content
    if (lower.includes('um') || lower.includes('uh') || lower.includes('like') || 
        lower.includes('you know') || lower.includes('object object')) {
      return
    }
    // Extract sentences that might be key points
    if (sentence.length > 30) {
      keyPoints.push(sentence)
    }
  })

  // Take first 3-5 key points
  const selectedPoints = keyPoints.slice(0, 5)
  
  // Generate post using template
  const meetingSummary = selectedPoints.length > 0 
    ? selectedPoints.slice(0, 3).join(' ')
    : cleanTranscript.substring(0, 300)

  // Create a professional post
  const post = automation?.description 
    ? createCustomPost(meetingSummary, automation)
    : createDefaultPost(meetingSummary)

  return post
}

function createDefaultPost(summary: string): string {
  // Clean up the summary
  const cleanSummary = summary
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 200)

  const post = `Just wrapped up an insightful meeting where we discussed some key opportunities and strategies.

${cleanSummary}${cleanSummary.endsWith('.') ? '' : '.'}

Looking forward to continuing these conversations and helping drive results.

#BusinessGrowth #Strategy #Consulting`

  return post
}

function createCustomPost(summary: string, automation: { description: string; example?: string }): string {
  // Use automation description as a guide
  const cleanSummary = summary
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 200)

  // If there's an example, try to follow its style
  if (automation.example) {
    // Extract structure from example
    const exampleLines = automation.example.split('\n').filter(l => l.trim())
    const structure = exampleLines.length > 0 ? exampleLines[0] : ''
    
    return `${structure}\n\n${cleanSummary}\n\n${automation.description}`
  }

  return `${automation.description}\n\n${cleanSummary}\n\n#BusinessGrowth #Strategy`
}

// Generate follow-up email from transcript
export async function generateFollowUpEmail(transcript: string): Promise<string> {
  // Try Gemini API first (free tier available)
  if (process.env.GEMINI_API_KEY) {
    try {
      console.log('Using Gemini API for email generation')
      const email = await generateEmailWithGemini(transcript)
      if (email && email.trim().length > 50) {
        console.log('Successfully generated email with Gemini, length:', email.length)
        return email
      } else {
        console.log('Gemini returned empty/short email, falling back to template')
      }
    } catch (error) {
      console.error('Gemini API error, falling back to template:', error)
      // Fall through to template-based generation
    }
  } else {
    console.log('No Gemini API key found, using template-based generation')
  }

  // Fallback to template-based generation
  console.log('Using template-based email generation')
  return generateEmailWithTemplate(transcript)
}

async function generateEmailWithGemini(transcript: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('Gemini API key not configured')
  }

  // Clean the transcript before sending to AI
  const cleanTranscript = transcript
    .replace(/\[object Object\]:\s*/g, '')
    .replace(/\[.*?\]\s*/g, '') // Remove timestamps
    .replace(/^[^:]+:\s*/gm, '') // Remove speaker names
    .trim()

  const prompt = `Draft a professional follow-up email that recaps what was discussed in the meeting.
The email should:
- Start with a brief thank you for their time
- Summarize the key topics and discussion points from the meeting
- Highlight any important decisions or insights shared
- Include any next steps or action items that were mentioned
- End with a warm closing that invites further discussion

Use a warm, professional, and conversational tone. Make it feel personal and genuine.
IMPORTANT: Do NOT include the raw transcript. Create a professional email that summarizes and recaps the discussion.
Return only the email body text (no subject line).`

  const fullPrompt = `${prompt}\n\nGenerate a follow-up email based on this meeting transcript:\n\n${cleanTranscript}`

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
            text: fullPrompt
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 800,
        }
      }),
    }
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Gemini API error: ${error}`)
  }

  const data = await response.json()
  return data.candidates?.[0]?.content?.parts?.[0]?.text || ''
}

function generateEmailWithTemplate(transcript: string): string {
  // Clean the transcript first - remove [object Object]: markers and timestamps
  let cleanTranscript = transcript
    .replace(/\[object Object\]:\s*/g, '')
    .replace(/\[.*?\]\s*/g, '') // Remove timestamps like [0m 0s]
    .replace(/^[^:]+:\s*/gm, '') // Remove speaker names
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim()
  
  // Extract key information from transcript
  const sentences = cleanTranscript
    .split(/[.!?]+/)
    .map(s => s.trim())
    .filter(s => s.length > 30 && s.length < 500) // Filter meaningful sentences
  
  const keyPoints: string[] = []
  const actionItems: string[] = []
  const topics: Set<string> = new Set()
  
  sentences.forEach(sentence => {
    const lower = sentence.toLowerCase()
    
    // Skip filler and meaningless content
    if (lower.includes('um') || lower.includes('uh') || lower.includes('like') || 
        lower.includes('you know') || lower.includes('object object') ||
        sentence.length < 30) {
      return
    }
    
    // Look for action items
    if (lower.includes('action') || lower.includes('next step') || 
        lower.includes('follow up') || lower.includes('todo') ||
        lower.includes('we will') || lower.includes('we should')) {
      actionItems.push(sentence)
    } else {
      // Extract main discussion points
      keyPoints.push(sentence)
      
      // Extract topics (keywords)
      const words = sentence.toLowerCase().match(/\b\w{4,}\b/g) || []
      words.forEach(word => {
        if (!['that', 'this', 'with', 'from', 'have', 'been', 'will', 'would', 'could', 'should'].includes(word)) {
          topics.add(word)
        }
      })
    }
  })

  // Select the most important discussion points (longer, more complete thoughts)
  const mainPoints = keyPoints
    .filter(point => point.length > 50 && point.length < 300)
    .slice(0, 4)
  
  // Create a proper recap email - DO NOT include raw transcript
  let emailBody = `Thank you for taking the time to meet with me today. I wanted to follow up and recap our discussion.\n\n`

  // Add main discussion points as a summary
  if (mainPoints.length > 0) {
    emailBody += `Here's a summary of what we covered:\n\n`
    
    // Create concise summaries of each main point
    mainPoints.forEach((point, idx) => {
      // Clean up the point
      let cleanPoint = point.trim()
      
      // Capitalize first letter
      cleanPoint = cleanPoint.charAt(0).toUpperCase() + cleanPoint.slice(1)
      
      // Ensure it ends with punctuation
      if (!cleanPoint.match(/[.!?]$/)) {
        cleanPoint += '.'
      }
      
      if (cleanPoint.length > 20) {
        emailBody += `${idx + 1}. ${cleanPoint}\n\n`
      }
    })
  } else if (keyPoints.length > 0) {
    // Fallback: create a paragraph summary from key points
    emailBody += `Here's a recap of our discussion:\n\n`
    const summaryPoints = keyPoints
      .slice(0, 3)
      .map(p => {
        let clean = p.trim()
        clean = clean.charAt(0).toUpperCase() + clean.slice(1)
        if (!clean.match(/[.!?]$/)) clean += '.'
        return clean
      })
      .filter(p => p.length > 20)
    
    if (summaryPoints.length > 0) {
      emailBody += summaryPoints.join(' ') + '\n\n'
    } else {
      // Very brief generic summary
      const topicList = Array.from(topics).slice(0, 3).join(', ')
      emailBody += `We discussed ${topicList || 'several important topics'} during our meeting.\n\n`
    }
  } else {
    // Last resort: create a generic but professional summary
    const topicList = Array.from(topics).slice(0, 3).join(', ')
    emailBody += `We had a productive discussion covering ${topicList || 'several important topics'}.\n\n`
  }

  // Add action items if any
  if (actionItems.length > 0) {
    emailBody += `Next Steps:\n`
    actionItems.slice(0, 5).forEach(item => {
      const cleanItem = item.replace(/\s+/g, ' ').trim()
      if (cleanItem.length > 10) {
        emailBody += `• ${cleanItem}${cleanItem.endsWith('.') ? '' : '.'}\n`
      }
    })
    emailBody += `\n`
  }

  emailBody += `Please don't hesitate to reach out if you have any questions or would like to discuss anything further.\n\nBest regards`

  return emailBody
}

