# Advanced AI Chatbot

A feature-rich Next.js chatbot application with real-time streaming, multiple AI models, RAG knowledge base, and more.

## ✨ Features

- 🔥 **Message Streaming** - Real-time typing like ChatGPT with Server-Sent Events
- 📌 **Chat History** - All conversations saved in SQLite database with Prisma
- 🧠 **RAG Knowledge Base** - Search and use knowledge base context in responses
- 🎨 **Modern UI** - Sidebar, dark/light themes, avatar bubbles
- 🤖 **Multiple AI Models** - Switch between Gemini, GPT-4, GPT-3.5 Turbo
- 🔗 **File Upload** - Upload images and files for AI analysis
- 🪄 **Image Support** - Send and display images in chat
- 🌐 **Translation** - Built-in translation feature

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd chatbot
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

Edit `.env` and add your API keys:
```env
GEMINI_API_KEY=your_gemini_api_key_here
OPENAI_API_KEY=your_openai_api_key_here  # Optional
```

**Important:** Get your Gemini API key from:
- https://makersuite.google.com/app/apikey (older method)
- https://aistudio.google.com/app/apikey (newer method - recommended)

After setting up your API key, test it by visiting:
- http://localhost:3000/api/test-gemini

4. Initialize the database:
```bash
npx prisma generate
npx prisma db push
```

5. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📁 Project Structure

```
chatbot/
├── app/
│   ├── api/
│   │   ├── chat/
│   │   │   ├── route.js          # Legacy chat endpoint
│   │   │   └── stream/route.js   # Streaming chat endpoint
│   │   ├── chats/                # Chat CRUD operations
│   │   ├── knowledge/            # Knowledge base API
│   │   ├── upload/               # File upload handler
│   │   └── translate/            # Translation API
│   ├── chat/                     # Main chat interface
│   ├── knowledge/                # Knowledge base management
│   ├── layout.js                 # Root layout
│   ├── page.js                   # Home page
│   └── globals.css               # Global styles
├── components/
│   ├── Sidebar.js                # Chat history sidebar
│   ├── ChatMessage.js            # Message component
│   └── ThemeProvider.js          # Theme context
├── lib/
│   ├── prisma.js                 # Prisma client
│   └── ai-models.js              # AI model configurations
└── prisma/
    └── schema.prisma             # Database schema
```

## 🎯 Usage

### Starting a New Chat
1. Click "New Chat" in the sidebar
2. Type your message and press Enter
3. Watch the AI response stream in real-time

### Using RAG Knowledge Base
1. Go to `/knowledge` to add knowledge entries
2. Enable "RAG Knowledge Base" in chat settings
3. The AI will use relevant knowledge when answering

### Switching AI Models
1. Click the settings icon in the header
2. Select from available models (Gemini, GPT-4, GPT-3.5 Turbo)

### Uploading Files
1. Click the paperclip icon or drag & drop files
2. Images are displayed in chat
3. Other files can be analyzed by the AI

### Themes
- Click the sun/moon icon to toggle dark/light mode
- Your preference is saved in localStorage

## 🛠️ Tech Stack

- **Next.js 14** - React framework with App Router
- **Tailwind CSS** - Utility-first CSS framework
- **Prisma** - Database ORM
- **SQLite** - Database (can be switched to PostgreSQL)
- **Lucide React** - Icon library
- **React Markdown** - Markdown rendering
- **React Dropzone** - File upload handling

## 📝 API Endpoints

- `POST /api/chat/stream` - Stream chat responses
- `GET /api/chats` - Get all chats
- `POST /api/chats` - Create new chat
- `GET /api/chats/[id]` - Get specific chat
- `DELETE /api/chats/[id]` - Delete chat
- `GET /api/knowledge` - Get all knowledge entries
- `POST /api/knowledge` - Create knowledge entry
- `POST /api/knowledge/search` - Search knowledge base
- `POST /api/upload` - Upload file
- `POST /api/translate` - Translate text

## 🔧 Configuration

### AI Models
Edit `lib/ai-models.js` to add or modify AI model configurations.

### Database
The project uses SQLite by default. To use PostgreSQL:
1. Update `prisma/schema.prisma` datasource
2. Set `DATABASE_URL` in `.env`
3. Run `npx prisma db push`

## 🚧 Future Enhancements

- [ ] Vector embeddings for better RAG
- [ ] Voice input/output
- [ ] Export chat history
- [ ] Share chats
- [ ] Custom AI model fine-tuning
- [ ] Multi-language support
- [ ] Advanced file analysis (PDF, DOCX, etc.)

## 📄 License

MIT

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
