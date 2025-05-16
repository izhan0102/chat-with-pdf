const axios = require('axios');

module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { text, fileName } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'No text provided for analysis' });
    }
    
    // Truncate text if it's too long (Groq has token limits)
    const truncatedText = text.length > 15000 ? text.substring(0, 15000) + "..." : text;

    // Get API key from environment variable
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'GROQ_API_KEY environment variable is not set' });
    }
    
    // Call Groq API for initial summary
    try {
      const response = await axios.post(
        'https://api.groq.com/openai/v1/chat/completions',
        {
          model: "llama-3.3-70b-versatile",
          messages: [
            {
              role: "system",
              content: `You are an AI assistant that specializes in analyzing and summarizing document content. 
              You will take on the role of being this document and speak as if you are the document itself.
              Your initial message should be a friendly introduction followed by a concise, well-structured summary of your main content.
              Format your response clearly with proper headings and paragraphs. Use first-person pronouns when referring to yourself (the document).
              Keep your response under 250 words, focusing on the key points.`
            },
            {
              role: "user",
              content: `I've uploaded a PDF titled "${fileName || 'Document'}". 
              Please analyze it and introduce yourself as if you are this document. 
              Provide a concise summary of your main content and key points.
              Here is the extracted text: \n\n${truncatedText}`
            }
          ],
          max_tokens: 800
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          }
        }
      );
      
      const analysis = response.data.choices[0]?.message?.content || "Unable to analyze the text.";
      
      res.status(200).json({ 
        analysis,
        fileName: fileName || 'Document'
      });
    } catch (apiError) {
      console.error("Groq API error:", apiError.message);
      
      // Send a fallback response in case of API failure
      res.status(200).json({ 
        analysis: "I'm your PDF document. Ask me any questions about my content, and I'll do my best to answer based on what I contain!",
        fileName: fileName || 'Document'
      });
    }
  } catch (error) {
    console.error('Error analyzing text with AI:', error);
    res.status(500).json({ error: 'Error analyzing text: ' + error.message });
  }
}; 