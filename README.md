# Paste In Format

A Chrome extension that allows you to paste content in different formats depending on the website.

## Features

- Configure paste formats per website
- Wildcard subdomain support (e.g., `*.github.com`)
- Custom templates using `{{title}}` and `{{url}}` variables
- Exact domain matches take priority over wildcard patterns

## How to Use

1. Open the extension popup to access settings
2. Enter a domain and paste format, then save
3. Copy rich text (URL + title) and paste it on the target site

### How to Copy Rich Text

Extensions like [cocopy](https://github.com/pokutuna/chrome-cocopy) allow you to copy a page's title and URL as rich text. This extension automatically detects when such rich text is pasted and converts it to your configured format.

## Format Examples

- **Markdown**: `[{{title}}]({{url}})`
- **Plain Text**: `{{title}}: {{url}}`
- **HTML**: `<a href="{{url}}">{{title}}</a>`

## Domain Configuration Examples

- `github.com` - GitHub.com only
- `*.github.com` - All GitHub subdomains (docs.github.com, api.github.com, etc.)
- Exact matches take priority: if you configure both `github.com` and `*.github.com`, the exact match will be used for `github.com`
