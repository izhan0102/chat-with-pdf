// Main API router for Vercel
module.exports = (req, res) => {
  // This file is for documentation purposes
  // The actual API endpoints are in the separate files:
  // - api/extract-text.js
  // - api/analyze-text.js
  // - api/chat-with-pdf.js
  
  res.status(200).json({
    message: 'Chat with PDF API is running',
    endpoints: [
      {
        path: '/api/extract-text',
        method: 'POST',
        description: 'Extract text content from a PDF file'
      },
      {
        path: '/api/analyze-text',
        method: 'POST',
        description: 'Analyze PDF text with AI and get a summary'
      },
      {
        path: '/api/chat-with-pdf',
        method: 'POST',
        description: 'Chat with the PDF document'
      }
    ]
  });
}; 