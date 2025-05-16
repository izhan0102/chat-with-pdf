# PDF Text Extractor

A simple web application that allows users to upload PDF files and extract all the text content, preserving the formatting as closely as possible.

## Features

- Upload PDF files via drag-and-drop or file selector
- Extract text with proper formatting and spacing
- Copy extracted text to clipboard
- Download extracted text as a TXT file
- Responsive design for mobile and desktop

## Prerequisites

- Node.js (version 14 or later)
- npm (version 6 or later)

## Installation

1. Clone this repository or download the source code.
2. Navigate to the project directory in your terminal.
3. Install the dependencies:

```bash
npm install
```

## Usage

1. Start the server:

```bash
npm start
```

2. Open your web browser and navigate to `http://localhost:3000`.
3. Upload a PDF file by dragging and dropping it into the designated area or by clicking on the area to select a file.
4. Click the "Extract Text" button to process the PDF.
5. Once processing is complete, the extracted text will be displayed below.
6. You can copy the text to your clipboard or download it as a TXT file.

## Technologies Used

- Express.js - Web server framework
- Multer - File upload handling
- pdf-parse - PDF text extraction library
- Vanilla JavaScript for frontend functionality
- HTML5 and CSS3 for the user interface

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- PDF icon from [Flaticon](https://www.flaticon.com/)

## Limitations

- The application may not perfectly preserve complex layouts in PDF files
- Some PDFs with advanced security features might not be properly processed
- Very large PDF files may take longer to process 