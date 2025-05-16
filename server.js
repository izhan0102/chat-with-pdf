const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const axios = require('axios');
require('dotenv').config(); // Load environment variables from .env file

const app = express();
const PORT = process.env.PORT || 3000;

// Set up multer for file uploads
const upload = multer({ dest: 'uploads/' });

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Extract text from PDF
app.post('/api/extract-text', upload.single('pdfFile'), async (req, res) => {
  try {
    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({ error: 'No PDF file uploaded' });
    }

    // Read the uploaded file
    const pdfFile = req.file;
    const fileBuffer = fs.readFileSync(pdfFile.path);
    
    // Enhanced PDF parsing options
    const options = {
      pagerender: function(pageData) {
        // Get the text content of the page
        const renderOptions = {
          normalizeWhitespace: false,
          disableCombineTextItems: false
        };
        return pageData.getTextContent(renderOptions).then(function(textContent) {
          let lastY, text = '';
          const items = textContent.items;
          
          for (let i = 0; i < items.length; i++) {
            const item = items[i];
            
            // Add newlines based on position changes
            if (lastY && lastY !== item.transform[5] && Math.abs(lastY - item.transform[5]) > 5) {
              text += '\n';
              
              // Add an extra line break for larger gaps (paragraphs)
              if (Math.abs(lastY - item.transform[5]) > 12) {
                text += '\n';
              }
            }
            
            // Add the text item
            text += item.str;
            
            // Add space after each item unless it ends with hyphen (word break)
            if (i < items.length - 1 && !item.str.endsWith('-')) {
              text += ' ';
            }
            
            lastY = item.transform[5];
          }
          
          return text;
        });
      }
    };

    // Parse the PDF with our custom options
    const data = await pdfParse(fileBuffer, options);
    
    // Post-process the extracted text
    const processedText = data.text
      // Replace multiple spaces with single space
      .replace(/ {2,}/g, ' ')
      // Fix common PDF extraction issues
      .replace(/(\w)-\s*\n\s*(\w)/g, '$1$2')  // Fix hyphenated words across lines
      .replace(/([^\n])\n([^\n])/g, '$1\n$2'); // Ensure proper spacing
    
    // Delete the temporary file
    fs.unlinkSync(pdfFile.path);
    
    // Return the extracted text and metadata
    res.status(200).json({ 
      text: processedText,
      fileName: pdfFile.originalname,
      pageCount: data.numpages,
      creationDate: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error processing PDF:', error);
    res.status(500).json({ error: 'Error processing PDF: ' + error.message });
  }
});

// Analyze text with AI
app.post('/api/analyze-text', async (req, res) => {
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
});

// Chat with PDF
app.post('/api/chat-with-pdf', async (req, res) => {
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
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log(`- Local API endpoints available at:`);
  console.log(`  - /api/extract-text`);
  console.log(`  - /api/analyze-text`);
  console.log(`  - /api/chat-with-pdf`);
}); 