# Code Changes Documentation System

A comprehensive system for documenting code changes with business logic impact analysis, supporting both Confluence and MDX documentation formats.

## Features

- Automatic detection and analysis of code changes
- Business logic impact assessment through AST parsing
- Multiple documentation outputs (Confluence and MDX)
- External repository analysis
- Pre-commit hook integration
- Interactive documentation generation

## Installation

### Prerequisites
- Node.js >= 18.0.0
- npm >= 7.0.0

```bash
npm install
```

> **Note**: This package uses ES Modules. Make sure your project's package.json has `"type": "module"` or use the `.mjs` extension for your files.

## Detailed Usage Guide

### 1. Analyze External Repositories

You can analyze any Git repository and generate documentation in either Confluence or MDX format:

#### Confluence Documentation
```bash
# Basic analysis with Confluence output
analyze-repo --url https://github.com/user/repo

# Required environment variables:
# CONFLUENCE_BASE_URL=https://your-domain.atlassian.net/wiki
# CONFLUENCE_TOKEN=your-api-token
# CONFLUENCE_SPACE_KEY=your-space-key
```

#### MDX Documentation
```bash
# Generate MDX documentation
analyze-repo --url https://github.com/user/repo --output mdx --output-dir ./docs

# This will create:
# - Individual MDX files for each analysis
# - An index.mdx for navigation
# - React components for interactive viewing
```

#### Advanced Analysis Options
```bash
# Analyze specific branch
analyze-repo --url https://github.com/user/repo --branch feature/new-feature

# Analyze commit range
analyze-repo --url https://github.com/user/repo \
  --start-commit abc123 \
  --end-commit def456

# Preview only (skip documentation)
analyze-repo --url https://github.com/user/repo --skip-doc
```

### 2. Integrate with Your Project

#### A. Basic Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure environment for Confluence (if using):
   ```bash
   # Create .env file
   echo "CONFLUENCE_BASE_URL=https://your-domain.atlassian.net/wiki
   CONFLUENCE_TOKEN=your-api-token
   CONFLUENCE_SPACE_KEY=your-space-key" > .env
   ```

#### B. Choose Documentation Format

1. For Confluence:
   - Ensure environment variables are set
   - Documentation will be created as Confluence pages
   - Changes are organized by business impact
   - Code diffs are included automatically

2. For MDX:
   - Create an output directory: `mkdir docs`
   - Add to your .gitignore if needed: `echo "docs/" >> .gitignore`
   - MDX files will include:
     * Interactive components
     * Syntax-highlighted diffs
     * Business logic categorization
     * Metadata and tags

### 3. Workflow Examples

#### A. Regular Development Workflow

1. Make code changes:
   ```bash
   git checkout -b feature/new-feature
   # Make your changes
   git add .
   ```

2. Commit changes:
   ```bash
   git commit -m "feat: implement new feature"
   # The pre-commit hook will:
   # 1. Analyze changes
   # 2. Show preview
   # 3. Generate documentation (Confluence or MDX)
   ```

#### B. Repository Analysis Workflow

1. Initial repository scan:
   ```bash
   # Analyze main branch
   analyze-repo --url https://github.com/user/repo

   # Check output
   cat analysis-report.txt
   ```

2. Focused analysis:
   ```bash
   # Analyze specific feature
   analyze-repo --url https://github.com/user/repo \
     --branch feature/branch \
     --output mdx \
     --output-dir ./docs/features
   ```

### 4. Customization

#### A. Business Logic Detection

Modify `src/services/codeAnalysis/analyzer.ts`:
```typescript
private businessLogicKeywords = [
  "controller",
  "service",
  "repository",
  // Add your domain-specific terms
];

private businessLogicPatterns = [
  /\b(business|domain)\s*(logic|rule)\b/,
  // Add your custom patterns
];
```

#### B. Documentation Templates

1. Confluence Templates:
   - Edit page structure in `documentationService.ts`
   - Customize labels and categorization
   - Modify content organization

2. MDX Templates:
   - Customize React components in `src/components/mdx/`
   - Modify MDX formatting in `mdxService.ts`
   - Add new interactive elements

## Best Practices

1. **Analysis**
   - Use specific commit ranges for targeted analysis
   - Review changes before documentation
   - Group related changes in single commits

2. **Documentation**
   - Provide meaningful commit messages
   - Review generated documentation
   - Keep templates updated
   - Use consistent labeling

3. **Integration**
   - Customize patterns for your domain
   - Configure meaningful categorization
   - Maintain environment variables

## Troubleshooting

1. **Analysis Issues**
   ```bash
   # Debug mode
   analyze-repo --url https://github.com/user/repo --debug

   # Verify repository access
   git ls-remote https://github.com/user/repo
   ```

2. **Documentation Issues**
   - Check environment variables
   - Verify API credentials
   - Check output directory permissions
   - Review error logs

3. **Integration Issues**
   - Verify hook permissions
   - Check dependency versions
   - Review configuration files

## License

MIT License - feel free to use and modify as needed.
