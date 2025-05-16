const { Buffer } = require('buffer');
const pdfParse = require('pdf-parse');
const formidable = require('formidable-serverless');

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
    // Parse form data with formidable
    const form = new formidable.IncomingForm();
    form.keepExtensions = true;
    
    const formData = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        resolve({ fields, files });
      });
    });

    // Get the PDF file
    const pdfFile = formData.files.pdfFile;

    if (!pdfFile) {
      return res.status(400).json({ error: 'No PDF file uploaded' });
    }

    // Read file from the temp path
    const fs = require('fs');
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
    
    // Return additional metadata about the PDF
    res.status(200).json({ 
      text: processedText,
      fileName: pdfFile.name,
      pageCount: data.numpages,
      creationDate: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error processing PDF:', error);
    res.status(500).json({ error: 'Error processing PDF: ' + error.message });
  }
}; 