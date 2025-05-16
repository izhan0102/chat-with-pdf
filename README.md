# Chat with PDF

A web application that allows users to upload PDFs, extract text, and have a conversation with the document using AI.

## Features

- Upload and process PDF files
- Extract text with proper formatting
- Copy or download extracted text
- Chat interface with PDF using LLaMA 3.3 70B model via Groq API
- Responsive design for desktop and mobile

## Technology Stack

- **Frontend**: HTML, CSS, JavaScript
- **Backend**: Node.js, Express
- **PDF Processing**: pdf-parse
- **File Uploads**: Multer
- **AI Integration**: Groq API with LLaMA 3.3 70B model

## Setup & Installation

1. Clone the repository:
   ```
   git clone https://github.com/izhan0102/chat-with-pdf.git
   cd chat-with-pdf
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Set up your Groq API key:
   - Get an API key from [Groq](https://console.groq.com/)
   - Replace the API key in `server.js`

4. Start the server:
   ```
   npm start
   ```

5. Access the application at `http://localhost:3000`

## Usage

1. Upload a PDF file using drag-and-drop or file selection
2. Click "Extract Text" to view the formatted text content
3. Click "Chat with PDF" to start a conversation with the document
4. Ask questions about the document content
5. The AI responds as if it is the document itself

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- PDF icon from [Flaticon](https://www.flaticon.com/)

## Limitations

- The application may not perfectly preserve complex layouts in PDF files
- Some PDFs with advanced security features might not be properly processed
- Very large PDF files may take longer to process 