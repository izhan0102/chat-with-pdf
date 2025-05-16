document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const dropArea = document.getElementById('dropArea');
    const fileInput = document.getElementById('pdfInput');
    const fileName = document.getElementById('fileName');
    const extractBtn = document.getElementById('extractBtn');
    const analyzeBtn = document.getElementById('analyzeBtn');
    const resultSection = document.getElementById('resultSection');
    const extractedText = document.getElementById('extractedText');
    const copyBtn = document.getElementById('copyBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    const loader = document.getElementById('loader');
    
    // Chat panel elements
    const mainContent = document.getElementById('mainContent');
    const chatPanel = document.getElementById('chatPanel');
    const closeChat = document.getElementById('closeChat');
    const chatMessages = document.getElementById('chatMessages');
    const typingIndicator = document.getElementById('typingIndicator');
    const chatInput = document.getElementById('chatInput');
    const sendMessage = document.getElementById('sendMessage');
    const summaryMessage = document.getElementById('summaryMessage');
    const pdfTitle = document.getElementById('pdfTitle');
    
    let pdfFile = null;
    let extractedTextContent = '';
    let pdfFileName = '';
    let chatHistory = [];
    
    // Prevent default drag behaviors
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, preventDefaults, false);
        document.body.addEventListener(eventName, preventDefaults, false);
    });
    
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    // Highlight drop area when item is dragged over it
    ['dragenter', 'dragover'].forEach(eventName => {
        dropArea.addEventListener(eventName, highlight, false);
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, unhighlight, false);
    });
    
    function highlight() {
        dropArea.classList.add('drag-over');
    }
    
    function unhighlight() {
        dropArea.classList.remove('drag-over');
    }
    
    // Handle dropped files
    dropArea.addEventListener('drop', handleDrop, false);
    
    function handleDrop(e) {
        preventDefaults(e);
        const dt = e.dataTransfer;
        const files = dt.files;
        if (files.length > 0) {
            handleFiles(files);
        }
    }
    
    function handleFiles(files) {
        if (files.length > 0) {
            const file = files[0];
            if (file.type === 'application/pdf') {
                pdfFile = file;
                pdfFileName = file.name;
                fileName.textContent = pdfFileName;
                extractBtn.disabled = false;
                analyzeBtn.disabled = false; // Enable analyze button immediately
                
                // Hide results if new file is selected
                resultSection.style.display = 'none';
                
                // Reset chat panel
                resetChatPanel();
                
                // Reset extracted text content
                extractedTextContent = '';
            } else {
                alert('Please upload a PDF file!');
            }
        }
    }
    
    // Handle file input change
    fileInput.addEventListener('change', function(e) {
        e.stopPropagation();
        handleFiles(this.files);
    });
    
    // Separate the click handling logic
    const chooseFileBtn = document.querySelector('.upload-btn');
    chooseFileBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        fileInput.click();
    });
    
    // Remove click handler from the drop area itself
    dropArea.addEventListener('click', (e) => {
        // Only trigger if the click is directly on the drop area (not on the button)
        if (e.target === dropArea || e.target === fileName || e.target.tagName === 'IMG' || e.target.tagName === 'H2' || e.target.tagName === 'P') {
            chooseFileBtn.click();
        }
    });
    
    // Extract text from PDF
    extractBtn.addEventListener('click', extractText);
    
    async function extractText() {
        if (!pdfFile) {
            alert('Please upload a PDF file first!');
            return;
        }
        
        // Show loader
        loader.style.display = 'block';
        extractBtn.disabled = true;
        
        // Create form data
        const formData = new FormData();
        formData.append('pdfFile', pdfFile);
        
        try {
            const response = await fetch('/extract-text', {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                throw new Error('Server error: ' + response.status);
            }
            
            const data = await response.json();
            
            // Format and display the extracted text
            extractedTextContent = data.text;
            pdfFileName = data.fileName || pdfFile.name;
            
            const formattedText = formatExtractedText(extractedTextContent);
            extractedText.textContent = formattedText;
            resultSection.style.display = 'block';
            
            // Scroll to result section
            resultSection.scrollIntoView({ behavior: 'smooth' });
            
        } catch (error) {
            console.error('Error:', error);
            alert('Error extracting text: ' + error.message);
        } finally {
            // Hide loader
            loader.style.display = 'none';
            extractBtn.disabled = false;
        }
    }
    
    // Function to format extracted text
    function formatExtractedText(text) {
        if (!text) return '';
        
        // Preserve line breaks and paragraph spacing
        let formattedText = text
            // Replace multiple newlines with a standard double newline
            .replace(/\n{3,}/g, '\n\n')
            // Ensure paragraph spacing
            .replace(/([^\n])\n([^\n])/g, '$1\n\n$2')
            // Remove extra spaces at the beginning of lines
            .replace(/\n\s+/g, '\n')
            // Normalize spacing
            .replace(/[ \t]{2,}/g, ' ');
        
        return formattedText;
    }
    
    // Chat with PDF
    analyzeBtn.addEventListener('click', startChatWithPDF);
    
    async function startChatWithPDF() {
        if (!pdfFile) {
            alert('Please upload a PDF file first!');
            return;
        }
        
        console.log("Starting chat with PDF process");
        
        // Disable buttons while processing
        analyzeBtn.disabled = true;
        extractBtn.disabled = true;
        
        try {
            // If text hasn't been extracted yet, do it first
            if (!extractedTextContent) {
                console.log("Extracting text first");
                loader.style.display = 'block';
                
                // Create form data
                const formData = new FormData();
                formData.append('pdfFile', pdfFile);
                
                try {
                    console.log("Sending extraction request");
                    const extractResponse = await fetch('/extract-text', {
                        method: 'POST',
                        body: formData
                    });
                    
                    if (!extractResponse.ok) {
                        throw new Error('Server error during extraction: ' + extractResponse.status);
                    }
                    
                    const extractData = await extractResponse.json();
                    console.log("Text extraction successful");
                    
                    // Save extracted text and file name
                    extractedTextContent = extractData.text;
                    pdfFileName = extractData.fileName || pdfFile.name;
                    
                    // Display extracted text
                    const formattedText = formatExtractedText(extractedTextContent);
                    extractedText.textContent = formattedText;
                    resultSection.style.display = 'block';
                } catch (extractError) {
                    console.error("Error during text extraction:", extractError);
                    alert("Failed to extract text from PDF: " + extractError.message);
                    
                    // Reset button states
                    analyzeBtn.disabled = false;
                    extractBtn.disabled = false;
                    loader.style.display = 'none';
                    return; // Exit the function early
                }
            } else {
                console.log("Using previously extracted text");
            }
            
            // Open chat panel first for better UX
            console.log("Opening chat panel");
            openChatPanel();
            
            // Then get initial summary in the background
            console.log("Getting initial summary");
            getInitialSummary();
            
            // Reset button states immediately after opening chat
            analyzeBtn.disabled = false;
            extractBtn.disabled = false;
            loader.style.display = 'none';
            
            // Enable chat input right away for better experience
            chatInput.disabled = false;
            sendMessage.disabled = false;
            chatInput.focus(); // Focus on the input field
            
        } catch (error) {
            console.error('Error in startChatWithPDF:', error);
            alert('Error: ' + error.message);
            
            // Re-enable buttons
            analyzeBtn.disabled = false;
            extractBtn.disabled = false;
            loader.style.display = 'none';
        }
    }
    
    // Open the chat panel
    function openChatPanel() {
        // Update PDF title in chat panel
        pdfTitle.textContent = pdfFileName;
        
        // Show chat panel with animation
        chatPanel.classList.add('open');
        mainContent.classList.add('shifted');
        
        // Show message immediately without loader
        typingIndicator.style.display = 'none'; // Hide loader completely
        summaryMessage.style.display = 'flex'; // Show message immediately
        summaryMessage.querySelector('.message-text').innerHTML = '<p>Ask your questions about the PDF...</p>';
    }
    
    // Close chat panel
    closeChat.addEventListener('click', () => {
        chatPanel.classList.remove('open');
        mainContent.classList.remove('shifted');
    });
    
    // Get initial summary from AI
    async function getInitialSummary() {
        try {
            console.log("Starting initial summary request");
            // Remove loader display completely
            typingIndicator.style.display = 'none';
            // Show initial message immediately
            summaryMessage.style.display = 'flex';

            const response = await fetch('/analyze-text', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    text: extractedTextContent,
                    fileName: pdfFileName
                })
            });
            
            console.log("Response received:", response.status);
            
            if (!response.ok) {
                throw new Error('Server error during analysis: ' + response.status);
            }
            
            const data = await response.json();
            console.log("Data received from analysis");
            
            // Display the summary message
            summaryMessage.querySelector('.message-text').innerHTML = formatChatMessage(data.analysis);
            
            // Add to chat history
            chatHistory = [
                { role: 'assistant', content: data.analysis }
            ];
            
            // Enable chat input
            chatInput.disabled = false;
            sendMessage.disabled = false;
            
        } catch (error) {
            console.error('Error getting initial summary:', error);
            // Show summary message with error
            summaryMessage.style.display = 'flex';
            summaryMessage.querySelector('.message-text').innerHTML = '<p>Ask any questions about this PDF.</p>';
            
            // Enable chat input despite error to allow user to try chatting anyway
            chatInput.disabled = false;
            sendMessage.disabled = false;
        }
    }
    
    // Reset chat panel
    function resetChatPanel() {
        chatHistory = [];
        chatMessages.innerHTML = '';
        
        // Re-add summary message without loader
        chatMessages.innerHTML = `
            <div class="message ai-message" id="summaryMessage">
                <div class="message-avatar">
                    <i class="fas fa-robot"></i>
                </div>
                <div class="message-content">
                    <div class="message-text">
                        <p>Ask your questions about the PDF...</p>
                    </div>
                </div>
            </div>
            <div class="typing-indicator" id="typingIndicator">
                <div class="dot"></div>
                <div class="dot"></div>
                <div class="dot"></div>
            </div>
        `;
        
        // Update references to the new DOM elements
        summaryMessage = document.getElementById('summaryMessage');
        typingIndicator = document.getElementById('typingIndicator');
        
        // Hide typing indicator initially
        typingIndicator.style.display = 'none';
        
        // Ensure chat input is disabled initially
        chatInput.disabled = true;
        sendMessage.disabled = true;
    }
    
    // Send message in chat
    sendMessage.addEventListener('click', sendChatMessage);
    
    // Also enable sending with Enter key (but Shift+Enter for new line)
    chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendChatMessage();
        }
    });
    
    async function sendChatMessage() {
        const question = chatInput.value.trim();
        if (!question) return;
        
        // Clear input
        chatInput.value = '';
        
        // Add user message to chat
        addMessageToChat('user', question);
        
        // Disable input while processing
        chatInput.disabled = true;
        sendMessage.disabled = true;
        
        // Show typing indicator
        typingIndicator.style.display = 'flex';
        
        try {
            const response = await fetch('/chat-with-pdf', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    text: extractedTextContent,
                    question: question,
                    chatHistory: chatHistory
                })
            });
            
            if (!response.ok) {
                throw new Error('Error communicating with server');
            }
            
            const data = await response.json();
            
            // Hide typing indicator before adding AI response
            typingIndicator.style.display = 'none';
            
            // Add AI response to chat
            addMessageToChat('assistant', data.answer);
            
            // Update chat history
            chatHistory.push(
                { role: 'user', content: question },
                { role: 'assistant', content: data.answer }
            );
            
        } catch (error) {
            console.error('Error in chat:', error);
            // Hide typing indicator
            typingIndicator.style.display = 'none';
            addMessageToChat('assistant', 'I\'m sorry, I encountered an error processing your question. Please try again.');
        } finally {
            // Re-enable input
            chatInput.disabled = false;
            sendMessage.disabled = false;
            chatInput.focus();
        }
    }
    
    // Add message to chat UI
    function addMessageToChat(role, content) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${role === 'user' ? 'user-message' : 'ai-message'}`;
        
        messageDiv.innerHTML = `
            <div class="message-avatar">
                <i class="fas ${role === 'user' ? 'fa-user' : 'fa-robot'}"></i>
            </div>
            <div class="message-content">
                <div class="message-text">
                    ${formatChatMessage(content)}
                </div>
            </div>
        `;
        
        // Add after the summary (don't remove the initial summary)
        if (summaryMessage.nextSibling) {
            chatMessages.insertBefore(messageDiv, summaryMessage.nextSibling);
        } else {
            chatMessages.appendChild(messageDiv);
        }
        
        // Scroll to bottom
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
    
    // Format chat message with proper HTML
    function formatChatMessage(text) {
        if (!text) return '<p>No message</p>';
        
        // Simple formatting for messages - convert line breaks to paragraphs
        return '<p>' + text.replace(/\n\n+/g, '</p><p>').replace(/\n/g, '<br>') + '</p>';
    }
    
    // Format analysis text with basic HTML formatting
    function formatAnalysis(text) {
        if (!text) return '<p>No analysis available.</p>';
        
        // Replace line breaks with HTML line breaks
        let formattedText = text
            // Format headers
            .replace(/^### (.*?)$/gm, '<h3>$1</h3>')
            .replace(/^## (.*?)$/gm, '<h2>$1</h2>')
            .replace(/^# (.*?)$/gm, '<h1>$1</h1>')
            
            // Format lists
            .replace(/^\* (.*?)$/gm, '<li>$1</li>')
            .replace(/^- (.*?)$/gm, '<li>$1</li>')
            .replace(/^(\d+)\. (.*?)$/gm, '<li>$2</li>')
            
            // Format paragraphs
            .replace(/\n\n/g, '</p><p>')
            
            // Replace remaining line breaks
            .replace(/\n/g, '<br>');
        
        // Wrap in paragraph if it doesn't start with a heading
        if (!formattedText.startsWith('<h')) {
            formattedText = '<p>' + formattedText;
        }
        
        // Ensure it ends with a closing paragraph tag
        if (!formattedText.endsWith('</p>')) {
            formattedText += '</p>';
        }
        
        // Wrap lists
        formattedText = formattedText.replace(/<li>.*?<\/li>/gs, function(match) {
            return '<ul>' + match + '</ul>';
        });
        
        return formattedText;
    }
    
    // Copy text to clipboard
    copyBtn.addEventListener('click', () => {
        const text = extractedText.textContent;
        if (text) {
            navigator.clipboard.writeText(text)
                .then(() => {
                    alert('Text copied to clipboard!');
                })
                .catch(err => {
                    console.error('Error copying text: ', err);
                    
                    // Fallback method
                    const textArea = document.createElement('textarea');
                    textArea.value = text;
                    document.body.appendChild(textArea);
                    textArea.select();
                    document.execCommand('copy');
                    document.body.removeChild(textArea);
                    alert('Text copied to clipboard!');
                });
        }
    });
    
    // Download text as a TXT file
    downloadBtn.addEventListener('click', () => {
        const text = extractedText.textContent;
        if (text) {
            const blob = new Blob([text], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'extracted-text.txt';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }
    });
    
    // Make textarea auto-resize
    chatInput.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight < 120) ? this.scrollHeight + 'px' : '120px';
    });
}); 