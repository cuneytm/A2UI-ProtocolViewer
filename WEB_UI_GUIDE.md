# A2UI Web UI - Quick Start Guide

## 🚀 Start the Server

```bash
GEMINI_API_KEY=your-api-key npm start
```

The server will start on http://localhost:3000

## 📖 How to Use

1. **Open your browser** to http://localhost:3000
2. **Enter a prompt** describing the UI you want to generate
3. **Click "Generate UI"** 
4. **Watch the magic happen!**
   - Left panel: See A2UI messages streaming in
   - Right panel: See the rendered UI appear

## 💡 Example Prompts

Try these prompts to see A2UI in action:

- "Create a book card for 1984 by George Orwell, published in 1949"
- "Create a weather widget showing 72°F, Sunny, for San  Francisco"
- "Create a user profile for Jane Smith, Software Engineer at TechCorp"
- "Create a restaurant card for Pizza Palace with 4.5 stars and $$ price"
- "Create a product card for iPhone 15 Pro, $999, with 5 star rating"

## 🎨 What You'll See

### Left Panel - A2UI Messages
- Real-time stream of JSONL messages from Gemini
- Each message defines a UI component
- Color-coded by message type (surfaceUpdate, dataModelUpdate, beginRendering)

### Right Panel - Rendered UI
- Live rendering of the A2UI components
- Automatically updates as messages arrive
- Beautiful, styled components

## 🏗️ Architecture

```
Browser (Frontend)                  Server (Backend)                 Gemini API
     │                                    │                              │
     │  1. POST /api/generate             │                              │
     │  { prompt: "..." }                 │                              │
     ├────────────────────────────────────>│                              │
     │                                    │                              │
     │                                    │  2. Generate A2UI            │
     │                                    ├─────────────────────────────>│
     │                                    │      (with system instruction)│
     │                                    │                              │
     │  3. SSE Stream                     │  4. Stream A2UI JSONL        │
     │  data: {...}                       │<─────────────────────────────┤
     │<────────────────────────────────────┤                              │
     │  data: {...}                       │                              │
     │<────────────────────────────────────┤                              │
     │  data: [DONE]                      │                              │
     │<────────────────────────────────────┤                              │
     │                                    │                              │
     │  5. Render UI                      │                              │
     │  (A2UIRenderer)                    │                              │
```

## 🔧 Tech Stack

- **Backend**: Express.js + TypeScript
- **Frontend**: Vanilla JavaScript (no framework needed!)
- **AI**: Google Gemini API
- **Protocol**: A2UI v0.8
- **Styling**: Modern CSS with dark theme

## 📂 File Structure

```
public/
├── index.html      # Main HTML page
├── styles.css      # Beautiful dark theme styles
├── renderer.js     # A2UI → DOM renderer
└── app.js          # Main application logic

server.ts           # Express backend
```

## 🎯 Features

✅ Real-time streaming of A2UI messages  
✅ Live UI rendering  
✅ Beautiful dark theme with gradients  
✅ Example prompts  
✅ Error handling  
✅ Success notifications  
✅ Responsive design  

## 🔒 Security Note

The API key is kept secure on the backend server and never exposed to the browser.

## 🐛 Troubleshooting

### Server won't start
- Make sure you set `GEMINI_API_KEY` environment variable
- Check if port 3000 is available

### No UI appears
- Check browser console for errors
- Make sure the server is running
- Try a simpler prompt first

### Messages appear but no rendering
- Check if `beginRendering` message was received
- Look for errors in browser console

## 📚 Learn More

- **A2UI Specification**: https://a2ui.org
- **Gemini API Docs**: https://ai.google.dev/gemini-api/docs
- **Grounding with Google Search**: https://ai.google.dev/gemini-api/docs/grounding

Enjoy building beautiful A2UI interfaces! 🎨✨
