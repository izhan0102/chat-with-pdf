const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const pdfParse = require('pdf-parse');
const Groq = require('groq-sdk');

const app = express();
const port = 3000;

// Initialize Groq API client
const groq = new Groq({ 
  apiKey: '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'
});

// Ensure uploads directory exists
if (!fs.existsSync('./uploads')) {
  fs.mkdirSync('./uploads', { recursive: true });
}

// Set up storage for uploaded files
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, './uploads');
  },
  filename: (req, file, cb) => {
    // Use original filename with timestamp to prevent duplicates
    const uniqueName = Date.now() + '-' + file.originalname.replace(/\s+/g, '-');
    cb(null, uniqueName);
  }
});

// Create the multer instance with error handling
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed!'), false);
    }
  }
}).single('pdfFile');

// Serve static files
app.use(express.static('public'));
app.use(express.json()); // For parsing JSON request bodies

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: err.message || 'Server error' });
});

// API endpoint for PDF upload and text extraction
app.post('/extract-text', (req, res) => {
  upload(req, res, async (err) => {
    if (err) {
      console.error('Upload error:', err);
      return res.status(400).json({ error: err.message });
    }

    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const pdfFile = fs.readFileSync(req.file.path);
      
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
      const data = await pdfParse(pdfFile, options);
      
      // Clean up the uploaded file
      fs.unlinkSync(req.file.path);
      
      // Post-process the extracted text
      const processedText = data.text
        // Replace multiple spaces with single space
        .replace(/ {2,}/g, ' ')
        // Fix common PDF extraction issues
        .replace(/(\w)-\s*\n\s*(\w)/g, '$1$2')  // Fix hyphenated words across lines
        .replace(/([^\n])\n([^\n])/g, '$1\n$2'); // Ensure proper spacing
      
      // Return additional metadata about the PDF
      res.json({ 
        text: processedText,
        fileName: req.file.originalname,
        pageCount: data.numpages,
        creationDate: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error processing PDF:', error);
      res.status(500).json({ error: 'Error processing PDF: ' + error.message });
    }
  });
});

// API endpoint for AI analysis of extracted text (initial summary)
app.post('/analyze-text', async (req, res) => {
  try {
    console.log("Analyze text API called");
    const { text, fileName } = req.body;
    
    if (!text) {
      console.log("No text provided for analysis");
      return res.status(400).json({ error: 'No text provided for analysis' });
    }
    
    console.log(`Analyzing PDF: ${fileName || 'Document'} (${text.length} characters)`);
    
    // Truncate text if it's too long (Groq has token limits)
    const truncatedText = text.length > 15000 ? text.substring(0, 15000) + "..." : text;
    
    // Call Groq API for initial summary
    console.log("Calling Groq API...");
    try {
      const completion = await groq.chat.completions.create({
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
        model: "llama-3.3-70b-versatile",
        max_tokens: 800
      });
      
      console.log("Groq API response received");
      const analysis = completion.choices[0]?.message?.content || "Unable to analyze the text.";
      
      res.json({ 
        analysis,
        fileName: fileName || 'Document'
      });
    } catch (apiError) {
      console.error("Groq API error:", apiError);
      
      // Send a fallback response in case of API failure
      res.json({ 
        analysis: "I'm your PDF document. Ask me any questions about my content, and I'll do my best to answer based on what I contain!",
        fileName: fileName || 'Document'
      });
    }
  } catch (error) {
    console.error('Error analyzing text with AI:', error);
    res.status(500).json({ error: 'Error analyzing text: ' + error.message });
  }
});

// API endpoint for chatting with the PDF
app.post('/chat-with-pdf', async (req, res) => {
  try {
    console.log("Chat with PDF API called");
    const { text, question, chatHistory } = req.body;
    
    if (!text) {
      console.log("No document text provided");
      return res.status(400).json({ error: 'No document text provided' });
    }
    
    if (!question) {
      console.log("No question provided");
      return res.status(400).json({ error: 'No question provided' });
    }
    
    console.log(`Chat question: "${question.substring(0, 100)}${question.length > 100 ? '...' : ''}"`);
    
    // Prepare chat history for API
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
    
    // Call Groq API for chat response
    console.log("Calling Groq API for chat response...");
    try {
      const completion = await groq.chat.completions.create({
        messages: messages,
        model: "llama-3.3-70b-versatile",
        max_tokens: 800,
        temperature: 0.7
      });
      
      console.log("Groq API chat response received");
      const answer = completion.choices[0]?.message?.content || "I'm sorry, I couldn't process your question.";
      res.json({ answer });
    } catch (apiError) {
      console.error("Groq API error during chat:", apiError);
      
      // Send a fallback response in case of API failure
      res.json({ 
        answer: "I'm sorry, I'm having trouble processing your question right now. Could you try asking something else about my content?"
      });
    }
  } catch (error) {
    console.error('Error in chat with PDF:', error);
    res.status(500).json({ error: 'Error processing your question: ' + error.message });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
}); 