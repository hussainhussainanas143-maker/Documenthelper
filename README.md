# DocumentReader AI

**Capstone project: Web Development and Internet Programming**
**Topic:** AI Productivity & Personal Assistant Tools

DocumentReader AI is a browser-based tool that extracts key information from documents. Upload a PDF or text file (or paste text) and get a summary, keywords, and structured data such as emails, phone numbers, dates, amounts and links. All processing happens client-side, so documents never leave the user's device.

## Features

- Drag-and-drop or file-picker upload (`.pdf`, `.txt`, `.md`, `.csv`, `.json`) and paste-in text
- PDF text extraction with [PDF.js](https://mozilla.github.io/pdf.js/)
- Entity extraction: emails, phone numbers, links, dates, currency amounts, percentages, possible names
- Extractive summary (top 3 sentences) and top keywords (term frequency)
- Document statistics: words, sentences, characters, reading time
- Structured JSON output with copy-to-clipboard
- Responsive layout with automatic light/dark theme
- No backend, no build step, no API keys

## Tech stack

| Layer | Technology |
|---|---|
| Structure | HTML5 |
| Styling | CSS3 (custom properties, grid, flexbox) |
| Logic | Vanilla JavaScript (ES6+) |
| PDF parsing | PDF.js (loaded from cdnjs) |

## Project structure

```
documentreader-ai/
├── index.html
├── css/
│   └── style.css
├── js/
│   └── app.js
├── .gitignore
└── README.md
```

## Run locally

No installation needed. Open `index.html` in a browser, or serve the folder:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

An internet connection is needed the first time to load PDF.js from the CDN.

## How it works

1. **Input:** the file is read with the File API (`file.text()`), or with PDF.js page by page for PDFs.
2. **Extraction:** regular expressions find structured fields. Keywords are ranked by word frequency after removing stop words.
3. **Summarisation:** each sentence is scored by the frequency of the keywords it contains (normalised by length). The top three are returned in original order.
4. **Rendering:** results are written to the DOM with `textContent` (no `innerHTML`), which prevents XSS from document content.

## Limitations

- Scanned or image-only PDFs have no text layer and are not supported (needs OCR).
- Name detection is heuristic (capitalised word sequences) and can produce false positives.
- Rule-based extraction is not a language model, so it does not "understand" context.

## Future scope

- OCR for scanned documents using Tesseract.js
- LLM-powered extraction and Q&A over the document through a Node.js or Flask backend
- Support for DOCX and image files
- Export results to CSV/Excel
- User accounts and saved document history

## Testing checklist

- [ ] Sample document extracts all field types
- [ ] Text-based PDF is parsed correctly
- [ ] Empty input shows a friendly message
- [ ] Layout works on mobile and desktop
- [ ] Dark mode renders correctly

## Author

*Your name, roll number, course and institution here.*
