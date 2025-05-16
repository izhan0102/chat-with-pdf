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
    const { text, question, chatHistory } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'No document text provided' });
    }
    
    if (!question) {
      return res.status(400).json({ error: 'No question provided' });
    }
    
    // Prepare messages for API
    const messages = [
      {
        role: "system",
        content: `You are an AI that embodies the document provided to you. 
        Respond to all queries as if you ARE this document.
        Use first-person language like "I contain information about..." or "My contents discuss..."
        Be helpful, concise, and informative. If the answer isn't in the document, politely say so.
        Always base your responses only on the document content.`
      }
    ];
    
    // Add the document content as context
    messages.push({
      role: "user",
      content: `Here is the document text you should use to answer questions. You are this document:
      
      ${text.length > 14000 ? text.substring(0, 14000) + "..." : text}`
    });
    
    messages.push({
      role: "assistant",
      content: "I am the document you've uploaded. I'll answer any questions about my content. What would you like to know?"
    });
    
    // Add previous chat history if available
    if (chatHistory && Array.isArray(chatHistory)) {
      chatHistory.forEach(message => {
        if (message.role === 'user' || message.role === 'assistant') {
          messages.push({
            role: message.role,
            content: message.content
          });
        }
      });
    }
    
    // Add the current question
    messages.push({
      role: "user",
      content: question
    });

    // Get API key from environment variable
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'GROQ_API_KEY environment variable is not set' });
    }
    
    // Call Groq API for chat response
    try {
      const response = await axios.post(
        'https://api.groq.com/openai/v1/chat/completions',
        {
          model: "llama-3.3-70b-versatile",
          messages: messages,
          max_tokens: 800,
          temperature: 0.7
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          }
        }
      );
      
      const answer = response.data.choices[0]?.message?.content || "I'm sorry, I couldn't process your question.";
      res.status(200).json({ answer });
    } catch (apiError) {
      console.error("Groq API error during chat:", apiError.message);
      
      // Send a fallback response in case of API failure
      res.status(200).json({ 
        answer: "I'm sorry, I'm having trouble processing your question right now. Could you try asking something else about my content?"
      });
    }
  } catch (error) {
    console.error('Error in chat with PDF:', error);
    res.status(500).json({ error: 'Error processing your question: ' + error.message });
  }
}; 