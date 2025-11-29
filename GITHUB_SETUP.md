# GitHub Pages Setup Guide

This guide will help you set up GitHub Pages to host the ShitWatch UK data feed.

## Step 1: Create GitHub Repository

1. Go to https://github.com/new
2. Repository name: `shitwatch-uk-data` (or any name you prefer)
3. Description: "ShitWatch UK - Sewage discharge data feed"
4. **Public** repository (required for GitHub Pages)
5. **Do NOT** initialize with README, .gitignore, or license
6. Click "Create repository"

## Step 2: Set Up Local Git Repository

Navigate to the website folder:

```bash
cd production/website
```

Initialize git repository:

```bash
git init
git branch -M main
```

## Step 3: Configure Git Remote

Add your GitHub repository as remote (replace with your username):

```bash
git remote add origin https://github.com/bigchungustm/shitwatch-uk-data.git
```

## Step 4: Create Initial Commit

Add the HTML/CSS/JS files:

```bash
git add index.html feed.html styles.css app.js feed.js
git commit -m "Initial commit: ShitWatch UK website"
```

## Step 5: Push to GitHub

```bash
git push -u origin main
```

**Note:** You may be prompted for GitHub credentials. Use a Personal Access Token instead of password.

### Creating a Personal Access Token:

1. Go to https://github.com/settings/tokens
2. Click "Generate new token" → "Generate new token (classic)"
3. Name: "ShitWatch UK Bot"
4. Expiration: "No expiration" or "1 year"
5. Scopes: Select **repo** (full control)
6. Click "Generate token"
7. **Copy the token** (you won't see it again!)
8. When git asks for password, paste the token

## Step 6: Enable GitHub Pages

1. Go to your repository on GitHub
2. Click "Settings" tab
3. Scroll to "Pages" in left sidebar
4. Under "Source":
   - Branch: **main**
   - Folder: **/ (root)**
5. Click "Save"

GitHub will show: "Your site is live at https://bigchungustm.github.io/shitwatch-uk-data/"

**Note:** It may take 1-2 minutes for the first deployment.

## Step 7: Update Configuration

Edit `production/.env` and add:

```env
GITHUB_USERNAME=bigchungustm
GITHUB_REPO_NAME=shitwatch-uk-data
```

## Step 8: Test the Setup

Visit your GitHub Pages URL:
```
https://bigchungustm.github.io/shitwatch-uk-data/
```

You should see the ShitWatch UK landing page!

## Step 9: Update Links in HTML

Edit `production/website/index.html` and `feed.html`:

Replace placeholders with your actual info:
- `yourusername` → `bigchungustm`
- `yourhandle` → your Twitter handle
- GitHub repository link

## Step 10: Test Automated Publishing

From the `production` directory:

```bash
# Install dependencies
npm install

# Create a test cycle manually
node src/test-publisher.js
```

This will:
1. Create a test cycle JSON file
2. Commit it to git
3. Push to GitHub
4. URL will be: `https://bigchungustm.github.io/shitwatch-uk-data/cycles/[timestamp].json`

Check GitHub Pages updates in 1-2 minutes!

## Troubleshooting

### "Permission denied (publickey)"

Use HTTPS instead of SSH:
```bash
git remote set-url origin https://github.com/bigchungustm/shitwatch-uk-data.git
```

### "Repository not found"

Check you're using the correct repository name and username.

### GitHub Pages shows 404

1. Check the repository is **public**
2. Verify GitHub Pages is enabled in Settings
3. Check the branch is `main` and folder is `/` (root)
4. Wait 2-3 minutes for deployment

### Git push asks for password every time

Set up credential caching:
```bash
git config --global credential.helper store
```

Next push will save your credentials.

## File Structure in Repository

After setup, your repository should look like:

```
shitwatch-uk-data/
├── index.html              # Landing page
├── feed.html               # Feed page
├── styles.css              # Styling
├── app.js                  # Landing page logic
├── feed.js                 # Feed page logic
└── cycles/                 # Generated data (gitignored locally)
    ├── manifest.json       # List of all cycles
    ├── 2025-11-29_14-30.json
    ├── 2025-11-29_16-00.json
    └── ...
```

## Automation

Once set up, the bot will automatically:
1. Every 90 minutes, generate new cycle JSON
2. Update `cycles/manifest.json`
3. Commit and push to GitHub
4. GitHub Pages updates automatically (1-2 min delay)
5. Post tweet linking to the new cycle

## Custom Domain (Optional)

Want to use your own domain instead of github.io?

1. Buy a domain
2. Add a file `CNAME` to website folder:
   ```
   shitwatch.uk
   ```
3. Configure DNS:
   - Add A records pointing to GitHub:
     - 185.199.108.153
     - 185.199.109.153
     - 185.199.110.153
     - 185.199.111.153
4. In repository Settings → Pages → Custom domain, enter your domain
5. Enable "Enforce HTTPS"

Your site will be at `https://shitwatch.uk`!

## Next Steps

Once GitHub Pages is working:
1. Run the full bot: `npm start`
2. It will post every 90 minutes
3. Each post links to GitHub Pages
4. Website updates automatically

Done! 🎉
