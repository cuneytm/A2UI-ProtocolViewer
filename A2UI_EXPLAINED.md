# A2UI Request/Response Flow Explained

This document explains what happens when you send an A2UI request to Gemini.

## What You're Seeing in the Debug Output

### 1. 📤 REQUEST CONFIGURATION

```
Model: gemini-2.5-flash
Tools: [{ "googleSearch": {} }]
System Instruction: "You are an AI assistant that responds using the A2UI protocol..."
User Query: "Create a simple book card UI for The Great Gatsby..."
```

**What's happening:**
- We're configuring Gemini to respond in A2UI format using a system instruction
- The system instruction teaches Gemini the A2UI JSONL format
- We include Google Search as an optional tool

### 2. 📥 STREAMING RESPONSE (Raw Chunks)

```
--- Chunk #1 (861 chars) ---
{"surfaceUpdate": {...}}
{"surfaceUpdate": {...}}
...

--- Chunk #2 (14 chars) ---
root_column"}}
```

**What's happening:**
- Gemini streams the response in multiple chunks (2 chunks in this case)
- Each chunk contains partial JSONL data
- Chunk #1 contains most of the A2UI messages
- Chunk #2 completes the last message that was split

### 3. 📊 RESPONSE STATISTICS

```
Total Chunks Received: 2
Total Characters: 875
A2UI Messages Parsed: 8
```

**What's happening:**
- We received 2 streaming chunks from Gemini
- Total of 875 characters
- Successfully parsed 8 complete A2UI messages from the JSONL stream

### 4. 🔍 PARSED A2UI MESSAGES

The 8 A2UI messages create this UI structure:

#### Message Flow

1. **Message 1 - Root Column**
   ```json
   {"surfaceUpdate": {"components": [{"id": "root_column", "component": {"Column": {...}}}]}}
   ```
   - Creates the root container (a vertical Column)
   - Contains: ["book_card"]

2. **Message 2 - Book Card**
   ```json
   {"surfaceUpdate": {"components": [{"id": "book_card", "component": {"Card": {...}}}]}}
   ```
   - Creates a Card component
   - Child: "card_content_column"

3. **Message 3 - Content Column**
   ```json
   {"surfaceUpdate": {"components": [{"id": "card_content_column", "component": {"Column": {...}}}]}}
   ```
   - Creates another Column inside the Card
   - Contains: ["book_title", "book_author", "book_year"]

4. **Message 4 - Book Title**
   ```json
   {"surfaceUpdate": {"components": [{"id": "book_title", "component": {"Text": {"text": {"literalString": "The Great Gatsby"}}}}]}}
   ```
   - Creates a Text component displaying "The Great Gatsby"

5. **Message 5 - Book Author**
   ```json
   {"surfaceUpdate": {"components": [{"id": "book_author", "component": {"Text": {"text": {"literalString": "F. Scott Fitzgerald"}}}}]}}
   ```
   - Creates a Text component displaying "F. Scott Fitzgerald"

6. **Message 6 - Book Year**
   ```json
   {"surfaceUpdate": {"components": [{"id": "book_year", "component": {"Text": {"text": {"literalString": "1925"}}}}]}}
   ```
   - Creates a Text component displaying "1925"

7. **Message 7 - Data Model Update**
   ```json
   {"dataModelUpdate": {"contents": {}}}
   ```
   - Updates the data model (empty in this case, no data bindings needed)

8. **Message 8 - Begin Rendering**
   ```json
   {"beginRendering": {"root": "root_column"}}
   ```
   - Signals that the UI is ready to render
   - Specifies "root_column" as the root component

## Visual UI Structure

The A2UI messages describe this component tree:

```
root_column (Column)
  └─ book_card (Card)
      └─ card_content_column (Column)
          ├─ book_title (Text: "The Great Gatsby")
          ├─ book_author (Text: "F. Scott Fitzgerald")
          └─ book_year (Text: "1925")
```

## How This Would Render

If you had an A2UI renderer (React, Flutter, Angular, etc.), it would:

1. Create a vertical Column layout
2. Place a Card inside it
3. Inside the Card, create another vertical Column
4. Add three Text components in order:
   - Title: "The Great Gatsby"
   - Author: "F. Scott Fitzgerald"  
   - Year: "1925"

## Message Types Explained

### surfaceUpdate
- **Purpose**: Define or update UI components
- **Contains**: Array of components with IDs and definitions
- **Use**: Most messages are surfaceUpdates, building up the UI piece by piece

### dataModelUpdate
- **Purpose**: Update data bindings and variables
- **Contains**: Data model contents
- **Use**: When you need reactive data that can change

### beginRendering
- **Purpose**: Signal that rendering can begin
- **Contains**: Root component ID
- **Use**: Final message telling the UI renderer which component to start from

## Why JSONL (JSON Lines)?

Each A2UI message is a complete line of JSON. This allows:

1. **Streaming**: Messages can be sent one at a time
2. **Progressive Rendering**: UI updates as messages arrive
3. **Easy Parsing**: Each line is independently parsable
4. **LLM-Friendly**: Easy for AI to generate line by line

## Example Request You Can Try

```bash
GEMINI_API_KEY=your-key npm run debug:a2ui
```

This will show you:
- ✅ The exact request being sent
- ✅ Raw streaming chunks as they arrive
- ✅ How chunks are parsed into A2UI messages
- ✅ The complete UI structure

## Common Message Patterns

### Simple Text Display
```jsonl
{"surfaceUpdate": {"components": [{"id": "text1", "component": {"Text": {"text": {"literalString": "Hello"}}}}]}}
```

### Card with Content
```jsonl
{"surfaceUpdate": {"components": [{"id": "card1", "component": {"Card": {"child": "content1"}}}]}}
{"surfaceUpdate": {"components": [{"id": "content1", "component": {"Text": {"text": {"literalString": "Content"}}}}]}}
```

### List of Items
```jsonl
{"surfaceUpdate": {"components": [{"id": "list1", "component": {"Column": {"children": {"explicitList": ["item1", "item2"]}}}}]}}
{"surfaceUpdate": {"components": [{"id": "item1", "component": {"Text": {"text": {"literalString": "Item 1"}}}}]}}
{"surfaceUpdate": {"components": [{"id": "item2", "component": {"Text": {"text": {"literalString": "Item 2"}}}}]}}
```

## Next Steps

- **Render the UI**: Integrate with an A2UI renderer library
- **Add Interactivity**: Use `userAction` messages for button clicks
- **Dynamic Data**: Use `dataModelUpdate` with bound values
- **Custom Components**: Define your own component catalog

Learn more at: https://a2ui.org
