# Documentation Style Guide

## Naming Convention

All README files in the AdToll project follow a consistent naming and styling convention:

### Project Name
**AdToll** (not AdPayBlock) - Used consistently across all documentation

### Tagline
**"Pay the toll, skip the ads"**

### Full Title Variations

**Main README (`/README.md`):**
```
# AdToll: Micropayments for ad-free browsing
```

**Backend README (`/backend/README.md`):**
```
# AdToll Backend Server
```

**Extension README (`/extension/ADTOLL_README.md`):**
```
# AdToll - Pay-to-Block Browser Extension
```

---

## Section Headers

### No Emojis
All section headers use plain text without emojis for consistency and professionalism.

**Before:**
```markdown
## 🏗️ Architecture
## 🚀 Quick Start
## 📡 API Endpoints
```

**After:**
```markdown
## Architecture
## Quick Start
## API Endpoints
```

---

## Common Section Names

All READMEs use these standardized section names:

- **Architecture** - System design and components
- **Quick Start** - Getting started guide
- **Installation** - Setup instructions
- **Configuration** - Config options
- **API Endpoints** - API reference (backend)
- **Features** - Feature list
- **Development** - Dev setup and workflow
- **Testing** - Testing instructions
- **Tech Stack** - Technologies used
- **Documentation** - Links to other docs
- **Resources** - External links
- **Contributing** - Contribution guidelines
- **License** - License information
- **Troubleshooting** - Common issues and fixes

---

## Problem/Solution Format

All READMEs include the standard problem/solution statement:

```markdown
**Problem:** Creators lose revenue from ad blockers.  
**Solution:** [Context-specific solution]
```

**Examples:**

**Main README:**
```markdown
**Problem:** Creators lose revenue from ad blockers.  
**Solution:** An ad blocker that charges users micropayments for blocking ads 
and shares revenue with creators.
```

**Backend README:**
```markdown
**Problem:** Creators lose revenue from ad blockers.  
**Solution:** A backend that enforces micropayments for ad blocking and 
enables revenue sharing with creators.
```

---

## Subtitle Format

All READMEs use the blockquote format for subtitles:

```markdown
> Brief description of the component
```

**Examples:**

**Main README:**
```markdown
> A "Pay-to-Block" browser extension using the x402 protocol on Base blockchain
```

**Backend README:**
```markdown
> x402-compliant backend server for AdToll - handles micropayments for ad 
blocking using the AnySpend protocol on Base blockchain
```

**Extension README:**
```markdown
> A Manifest V3 browser extension that charges users micropayments (USDC/ETH) 
for blocking ads using the x402 protocol on Base blockchain
```

---

## Code Block Style

### Bash Commands
```bash
# Always use bash syntax highlighting
npm install
npm run dev
```

### HTTP Requests
```http
GET /health HTTP/1.1
Host: localhost:3000
```

### JSON Responses
```json
{
  "status": "ok",
  "message": "Example"
}
```

### JavaScript/TypeScript
```javascript
// Use javascript for both JS and TS
const example = 'value';
```

---

## Horizontal Rules

Use triple dashes for section separators:

```markdown
---
```

**Placement:**
- After the title and subtitle block
- Between major sections (optional)
- Before footer sections

---

## File Structure Examples

### Main README Structure
```markdown
# AdToll: Micropayments for ad-free browsing
> Subtitle

**Problem:** ...  
**Solution:** ...

---

## Project Overview
## Repository Structure
## Quick Start
## Architecture
## Features
## Testing Guide
## Development
## Documentation
## Troubleshooting
## Security Considerations
## Contributing
## License
## Resources
```

### Backend README Structure
```markdown
# AdToll Backend Server
> Subtitle

**Problem:** ...  
**Solution:** ...

---

## Architecture
## Quick Start
## API Endpoints
## x402 Protocol Flow
## Testing
## Tech Stack
## Notes
## Integration with Extension
## Resources
## License
```

### Extension README Structure
```markdown
# AdToll - Pay-to-Block Browser Extension
> Subtitle

**Tagline:** "Pay the toll, skip the ads"

**Problem:** ...  
**Solution:** ...

---

## Concept
## Architecture
## Installation
## Configuration
## Development
## Testing Workflow
## Payment Stats
## Features
## Security & Privacy
## Troubleshooting
## Documentation
## Contributing
## License
## Resources
```

---

## Links and References

### Internal Links
Use relative paths:
```markdown
- [Backend README](./backend/README.md)
- [Extension Docs](./extension/ADTOLL_README.md)
```

### External Links
Always include descriptive text:
```markdown
- [x402 Protocol Specification](https://x402.org)
- [AnySpend Documentation](https://docs.anyspend.io)
```

---

## Lists

### Unordered Lists
Use hyphens for consistency:
```markdown
- Item one
- Item two
- Item three
```

### Ordered Lists
Use standard numbering:
```markdown
1. First step
2. Second step
3. Third step
```

### Nested Lists
Use proper indentation:
```markdown
1. Main item
   - Sub item
   - Sub item
2. Main item
   - Sub item
```

---

## Emphasis

### Bold
Use for:
- Key terms on first mention
- Problem/Solution labels
- Important warnings

```markdown
**Important:** This is critical information
```

### Italic
Use for:
- Taglines
- Quotes
- Emphasis within sentences

```markdown
*"Pay the toll, skip the ads"*
```

### Code
Use for:
- File names: `package.json`
- Commands: `npm install`
- Code snippets: `const x = 1`
- URLs: `http://localhost:3000`

---

## Consistency Checklist

When creating new documentation, ensure:

- [ ] Title uses "AdToll" (not AdPayBlock)
- [ ] No emojis in section headers
- [ ] Includes Problem/Solution statement
- [ ] Uses blockquote for subtitle
- [ ] Section names match standard list
- [ ] Code blocks have language tags
- [ ] Links use relative paths where possible
- [ ] Lists use consistent formatting
- [ ] Horizontal rules use triple dashes
- [ ] File paths use backticks

---

## Example Template

```markdown
# AdToll [Component Name]

> Brief description of the component

**Problem:** Creators lose revenue from ad blockers.  
**Solution:** [Context-specific solution]

---

## Overview

[Introduction paragraph]

## Quick Start

### Prerequisites

- Requirement 1
- Requirement 2

### Installation

\`\`\`bash
# Installation commands
npm install
\`\`\`

## [Additional Sections]

[Content]

---

## Resources

- [Link 1](url)
- [Link 2](url)

## License

[License information]
```

---

## Files Updated

The following files now conform to this style guide:

1. `/README.md` - Main project README
2. `/backend/README.md` - Backend documentation
3. `/extension/ADTOLL_README.md` - Extension documentation
4. All other markdown files in the project

---

**Last Updated:** December 2025  
**Status:** Current standard for all AdToll documentation

