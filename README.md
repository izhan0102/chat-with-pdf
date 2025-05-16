# Chat with PDF

A serverless web application that allows users to upload PDFs, extract text, and have a conversation with the document using AI. This application is designed to be deployed on Vercel.

## Features

- Upload and process PDF files
- Extract text with proper formatting
- Copy or download extracted text
- Chat interface with PDF using LLaMA 3.3 70B model via Groq API
- Responsive design for desktop and mobile
- Serverless architecture for easy deployment

## Technology Stack

- **Frontend**: HTML, CSS, JavaScript
- **Backend**: Vercel Serverless Functions
- **PDF Processing**: pdf-parse
- **File Uploads**: formidable-serverless
- **AI Integration**: Groq API with LLaMA 3.3 70B model

## Setup & Deployment

### Local Development

1. Clone the repository:
   ```
   git clone https://github.com/izhan0102/chat-with-pdf.git
   cd chat-with-pdf
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Set up your Groq API key as an environment variable:
   
   Create a `.env` file in the root directory:
   ```
   GROQ_API_KEY=your_groq_api_key_here
   ```

4. Start the development server:
   ```
   npm run dev
   ```

5. Access the application at `http://localhost:3000`

### Deploying to Vercel

1. Install Vercel CLI:
   ```
   npm install -g vercel
   ```

2. Login to Vercel:
   ```
   vercel login
   ```

3. Deploy to Vercel:
   ```
   vercel
   ```

4. Set up environment variables on Vercel:
   - Go to your Vercel project settings
   - Add environment variable: `GROQ_API_KEY`
   - Set its value to your Groq API key

5. For production deployment:
   ```
   vercel --prod
   ```

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
- Serverless functions have execution time limits (30 seconds on Vercel's free tier) 