# PATI Group — Static Ads Generator: User Guide

> Internal tool for generating high-quality static advertisement creatives using AI.
> Version: March 2026 | For: PATI Group team members

---

## Table of Contents

1. [Getting Started](#1-getting-started)
2. [Dashboard & Navigation](#2-dashboard--navigation)
3. [Brand Setup](#3-brand-setup)
4. [Concepts Management](#4-concepts-management)
5. [Standard Ad Generation (Home)](#5-standard-ad-generation-home)
6. [Stealth Ad Generation](#6-stealth-ad-generation)
7. [Library (Ad Gallery)](#7-library-ad-gallery)
8. [Settings & Profile](#8-settings--profile)
9. [Admin Panel](#9-admin-panel)
10. [Role Permissions](#10-role-permissions)
11. [Troubleshooting](#11-troubleshooting)

---

## 1. Getting Started

### 1.1 Login

1. Open the tool URL in your browser
2. Enter your **@patigroup.com** email and password
3. Click **Sign In**

> First-time users: your admin will provide a temporary password via email. Change it immediately after login.

### 1.2 Forgot Password

1. Click **"Forgot password?"** on the login page
2. Enter your @patigroup.com email
3. Check your inbox for a new temporary password
4. Login with the new password and change it in Settings

### 1.3 First-Time Setup Checklist

Before generating ads, you need:

| Step | Where | Required |
|------|-------|----------|
| Create a Client | Header → "New Client" button | Yes |
| Set up Brand Identity | Brand Setup → Brand Identity tab | Yes |
| Add Products (with images) | Brand Setup → Products tab | Yes |
| Create/Generate Personas | Brand Setup → Personas tab | Recommended |
| Add Brand Research | Brand Setup → Brand Intelligence tab | Recommended |

---

## 2. Dashboard & Navigation

### 2.1 Header Bar

The top header contains:

- **Logo & App Name** — click to go Home
- **Navigation Links:**
  - **Home** — Standard ad generation workspace
  - **Stealth Ads** — Native-looking ad generator
  - **Brand Setup** — Configure brand identity, products, personas
  - **Concepts** — Manage creative concepts (admin only)
  - **Library** — View & download saved ads
  - **Admin** — User management + settings (admin only, shown with shield icon)
- **Client Selector** — dropdown to switch between clients
- **Client Actions** — Rename (pencil), Delete (trash), New Client (green button)
- **User Menu** — click your avatar initials to access:
  - **Settings** — profile & password
  - **Sign Out**

### 2.2 Client Management

Each client has its own brands, products, markets, and generated ads.

| Action | How |
|--------|-----|
| Create client | Click green **"New Client"** button in header |
| Switch client | Click client name dropdown → select another |
| Rename client | Click pencil icon next to client selector |
| Delete client | Click trash icon next to client selector |

---

## 3. Brand Setup

**Location:** Navigation → **Brand Setup**
**Access:** All users can view. Only admins (CEO, Super Admin) can edit.

> Members see a yellow "View only" banner and cannot modify any settings.

### 3.1 Brand Identity Tab (Left Column)

| Field | Description | Required |
|-------|-------------|----------|
| **Brand Name** | Your brand's display name | Yes |
| **Brand Description** | Brief brand overview, positioning, key messages | Recommended |
| **Typography** | Select a Google Font or upload a local font file | Recommended |
| **Color Palette** | 6 colors: Primary 1&2, Secondary 1&2, Accent 1&2 | Yes |
| **Logo (Light)** | Logo for light backgrounds (SVG, PNG, or JPG) | Recommended |
| **Logo (Dark)** | Logo for dark backgrounds | Recommended |

**How to set colors:**
1. Click the color swatch
2. A color picker opens — select your brand color
3. The hex code updates automatically

**How to upload a logo:**
1. Click the dashed upload area
2. Select a file (SVG, PNG, or JPG, max 2MB)
3. Preview appears immediately
4. Click X to remove and re-upload

**Save:** Click **"Save Brand Kit"** (top right) to persist all changes.

### 3.2 Live Brand Preview (Right Column)

A real-time preview card shows:
- Brand name with your typography
- Color swatches (Primary, Secondary, Accent)
- Typography example ("Aa Bb Cc 123")

This updates as you modify settings — no need to save first.

### 3.3 Products Tab

Located in the **Products** tab on Brand Setup page.

**Add a Product:**
1. Click **"Add Product"**
2. Enter **Product Name** (required)
3. Enter **Description** (optional but recommended — key features, ingredients, benefits)
4. Upload **Product Images** (required, max 5):
   - First image = **MAIN** (used as hero in ads)
   - Click the crown icon to change which image is primary
   - Use arrows to reorder
   - Click X to remove
5. Click **"Create Product"**

**Edit/Delete:** Use the pencil (edit) and trash (delete) icons on each product card.

> Product images are critical for ad quality. Use high-resolution photos showing the actual product from multiple angles.

### 3.4 Brand Intelligence Tab

Located in the **Brand Intelligence** tab on Brand Setup page.

#### Research Summary
1. Paste competitor research, product notes, brand briefs, or market insights into the large text area
2. Click **"Save Research Summary"**
3. This context helps AI generate better personas and ad copy

#### Personas Tab (Target Audiences)

**Auto-generate:**
1. Ensure you have research saved in Brand Intelligence
2. Go to **Personas** tab → Click **"Generate 10 Profiles"**
3. AI analyzes your brand + research → creates persona profiles
4. Each persona has: Title, Pain Point, Angle, Emotion

**Manual add:**
1. Click **"Add Profile"**
2. Fill in: Title, Pain, Angle, Emotion
3. Click **"Create"**

**Edit/Delete:** Use Edit and Delete buttons on each persona card.

> Personas are used during ad generation to tailor messaging to specific audience segments.

---

## 4. Concepts Management

**Location:** Navigation → **Concepts**
**Access:** Admins can create/edit/delete. Members see view-only mode.

Concepts define creative strategies used during ad generation. Each concept has:

| Field | Description |
|-------|-------------|
| **Concept ID** | Unique identifier (e.g., `data_hook`, `social_proof`) |
| **Label** | Display name |
| **Description** | What strategy this concept uses |
| **Requires Competitor** | Whether this concept needs competitor data |
| **Prompt** | Full creative strategy + visual direction for the AI |
| **Reference Images** | Up to 2 reference images for visual style |

### Built-in Concepts

| Concept | Strategy |
|---------|----------|
| **Data Hook** | Statistics, numbers, data-driven messaging |
| **Before/After** | Transformation narrative |
| **VS Competitor** | Direct comparison (needs competitor data) |
| **Social Proof** | Reviews, testimonials, usage evidence |
| **Ingredient Callout** | Highlight key ingredients/components |
| **Urgency/Scarcity** | Limited time, limited stock messaging |

### How to Add a Concept (Admin)

1. Click **"Add Concept"**
2. Fill in all fields
3. In the **Prompt** field, you can structure multiple layout variants using `### Variant A`, `### Variant B`, etc. — AI will rotate through them per generation
4. Optionally upload reference images (max 2) for visual style guidance
5. Click **"Save"**

Click the expand arrow on any concept card to view its full prompt.

---

## 5. Standard Ad Generation (Home)

**Location:** Navigation → **Home**

This is the main workspace for generating polished, brand-consistent ad creatives.

### 5.1 Left Panel — Configuration

Fill in these sections from top to bottom:

#### Step 1: Brand Product (Required)
- Select a **Product** from the dropdown
- Enter the **Landing Page URL** (the product's web page — AI reads this for context)

#### Step 2: Language
- Select the **Language** for the ad copy
- All generated text — headlines, body copy, and image text overlays — will be in this language
- Supported: English (US/UK), German, French, Spanish, Vietnamese

#### Step 3: Generation Mode
Choose between:
- **Concept-Based** (default) — AI applies selected concepts creatively
- **Competitor Reference** — Upload a competitor's ad image → AI replicates its layout with your brand

> See [Section 5.4](#54-competitor-reference-mode) for full details on Competitor Reference mode.

#### Step 4: Concepts (Required — Concept-Based mode only)
- Check one or more **concepts** to apply
- Each concept generates ads with a different creative strategy
- Concepts marked **"Competitor"** badge need market data with a linked sheet

#### Step 5: Ad Copy Override (Optional)
- Click to expand this section
- **Headline** — custom headline text (overrides AI-generated headline)
- **Body Text** — custom body copy
- **Additional Notes** — specific direction for the AI
- Click **"Clear"** to reset all overrides

#### Step 6: Target Audience (Required)
- Select one or more **personas**
- Each selected persona generates a variant tailored to that audience
- Use **"Select All"** for maximum variety
- Selected personas appear as chips — click X to remove

#### Step 7: Output Configuration
- **Aspect Ratio:** 1:1 (Square), 4:5 (Portrait), 9:16 (Story)
- **Ad Count:** 1–10 ads per concept × persona combination

#### Generate
Click the green **"Generate Ads"** button at the bottom.

### 5.2 Right Panel — Progress & Results

**During generation:**
- Step-by-step progress shows:
  1. Reading product page...
  2. Analyzing competitor data...
  3. Applying concept strategy...
  4. Assembling prompt...
  5. Generating image...
- Each step shows status: Pending → Running → Completed

**Results:**
- Generated ad images appear as cards
- Each card shows: image preview, headline, concept name, market

**Actions per ad:**
| Button | Action |
|--------|--------|
| Bookmark | Save to Library |
| Copy | Copy the generation prompt |
| Download | Download image file |
| Trash | Remove from results |

**Bulk actions:**
- **Save All** — save all results to Library
- **Download All as ZIP** — download all images in a single ZIP file
- **Clear** — remove all results

> Results are cached locally for 1 hour. Navigating away and back preserves your results.

### 5.3 Concepts with Variant Prompts

When a concept has `### Variant A`, `### Variant B` blocks in its prompt, the AI rotates through these variants to ensure visual diversity across generated ads. This means:
- 3 concepts × 2 personas × 2 count = 12 ads with unique layouts and angles
- No two ads use the same visual layout, headline angle, or emotional hook

### 5.4 Reference Images for Concepts

Concepts can have up to 2 reference images. These are:
- Sent to the image generator alongside product images
- Used for visual style guidance only (layout, composition, mood)
- Product content, brand colors, and headline text are NEVER copied from references

### 5.5 Language Support

Supported languages:
| Code | Language |
|------|----------|
| en-US | English (US) |
| en-UK | English (UK) |
| de | German |
| fr | French |
| es | Spanish |
| vi | Vietnamese |

Language is applied to ALL generated text: headline, body copy, and any text overlays in the image.

### 5.6 Competitor Reference Mode

**For Competitor Reference mode:**
1. Click the upload area or drag-drop a competitor ad image
2. AI analyzes the layout, colors, typography, and composition
3. Choose a sub-mode:

#### Sub-mode: Standard Ad
- AI generates a single ad replicating the competitor's layout
- Uses YOUR brand's product, colors, and messaging
- Competitor color scheme is explicitly blocked

#### Sub-mode: Stealth Ad
- AI generates scene-based stealth ads inspired by the competitor's reference
- 2-step flow: Plan Scenes → Generate
- Additional options:
  - **Sensitivity Level:** Normal / High
  - **Audience Age Range:** 18-25, 25-35, 35-45, 45-55, 55+
- See [Section 6](#6-stealth-ad-generation) for details on stealth ads

---

## 6. Stealth Ad Generation

**Location:** Navigation → **Stealth Ads**

Stealth ads look like organic, everyday content — iPhone photos, text screenshots, candid moments — with the product subtly placed. They bypass "ad fatigue" because viewers don't recognize them as ads.

### 6.1 How Stealth Ads Work

**2-Step Flow:**
1. **Plan Scenes** — AI generates detailed scene descriptions
2. **Generate Images** — AI creates photorealistic images from each scene plan

### 6.2 Left Panel — Configuration

#### Step 1–2: Product & Language
Same as Standard Ads — select product, URL, and language.

#### Step 3: Scene Selection

**Auto Mode (recommended):**
- AI automatically selects the best scenes based on your product and audience
- Scene priority hints shown (top pick / acceptable / avoid)

**Manual Mode:**
- Browse 45 scenes across 4 categories:

| Category | Code | Description | Example Scenes |
|----------|------|-------------|----------------|
| **Human-Centric** | HUM | Person is the hero, product is incidental | Gym Mirror Selfie, Post-Workout Glow, Beach Candid |
| **Environment** | ENV | Product placed naturally in real settings | Morning Counter, Gym Bag Flat Lay, Nightstand |
| **Content Format** | FMT | Product in screenshots/text content | iPhone Screenshot, Chat Bubble, Review Box |
| **Story** | STR | Product woven into narratives | Daily Routine, Transformation Journey, Gifting Story |

- Check scenes you want, expand categories to see all options
- Use **"Select All"** / **"Deselect All"** per category

**Custom Scenes:**
- Click **"Add Custom Scene"** to create your own scene template
- Fill in: ID, category, name, description, placement method, best-for tags
- Custom scenes appear alongside built-in ones
- Edit or delete custom scenes with the pencil/trash icons

#### Step 4: Target Audience
Same as Standard Ads — select personas.

#### Step 5: Audience Tuning

| Setting | Options | When to Use |
|---------|---------|-------------|
| **Sensitivity Level** | Normal / High | Use "High" for body image, weight, beauty products |
| **Age Range** | 18-25, 25-35, 35-45, 45-55, 55+ | Adjusts cultural references, props, text style |

**High sensitivity** ensures:
- No before/after body comparisons
- No enhancement language
- Product benefit never stated — only presence shown
- Body type shown as "attainable aspiration" (fit but not model/bodybuilder)

#### Step 6: Output
Same as Standard Ads — aspect ratio + count.

### 6.3 Right Panel — Scene Plans & Results

#### Planning Phase

Click **"Plan Scenes"** → AI generates scene plans.

Each plan card shows:
- Scene name & category badge
- Product visibility: **Physical** (product appears) or **Name-only** (only text mention)
- Composition preview (camera angle, lighting, color mood)
- Product placement details (location, size, integration method)
- Text content (what text appears in the image)

**Edit plans before generating:**
- Click any field to edit inline
- Reorder plans with up/down arrows
- Delete plans you don't want
- Regenerate a single plan with the refresh icon
- Add scenes from the scene library using the **"Add Scene"** button

#### Generation Phase

Click **"Generate"** → images are created one by one via SSE stream.

Each result shows the generated image with:
- Save to Library button
- Download button
- Copy description button
- Delete button
- Refresh (regenerate) single image button

**Bulk actions:**
- **Download All as ZIP** — download all stealth images in one file
- **Save All to Library** — bookmark all results

### 6.4 Scene Categories Explained

**HUM (Human-Centric) — 17 scenes**
- A real person is the hero (gym selfie, cooking, running)
- Product appears far in background, easy to miss
- Body is the scroll-stopper, product enters subconscious
- Text is minimal (caption-style, timestamp)
- Scenes: Gym Mirror Selfie, Progress Check Mirror, Kitchen Meal Prep, Post-Workout Glow, Beach/Pool Candid, Couple Workout, Yoga/Pilates Mat, Running Outdoors, Getting Ready Mirror, Living Room Workout, Gym Action Shot, Smoothie Making, Friend Group Gym, Shirtless Morning Routine, Locker Room Candid, Gym Outfit Check, Between Sets Rest

**ENV (Environment) — 10 scenes**
- Product sitting naturally in everyday settings
- Morning counter, bathroom shelf, gym bag, desk
- iPhone-quality photo, unedited feel
- Text overlays allowed (lifestyle captions)

**FMT (Content Format) — 10 scenes**
- Product embedded in digital content
- Screenshots, chat messages, reviews, receipts
- Platform-accurate UI (iMessage, Instagram, Notes app)
- Product name mentioned casually in text

**STR (Story) — 8 scenes**
- Product woven into a visual narrative
- The STORY is the hero, product is a supporting detail
- Daily routines, transformation journeys, social moments

---

## 7. Library (Ad Gallery)

**Location:** Navigation → **Library**

### 7.1 Viewing Ads

| Control | Options |
|---------|---------|
| **View Mode** | Grid (image tiles) / List (table rows) |
| **Sort** | Newest First / Oldest First |
| **Product Filter** | All Products / [Specific Product] / Untagged |
| **Date Filter** | All Time, Today, This Week, This Month, Last Month |
| **Search** | Search by filename |
| **Refresh** | Reload gallery from storage |

### 7.2 Product Filter

Ads are automatically tagged with the product used during generation. Use the **Product** dropdown to filter:
- **All Products** — show all ads
- **[Product Name]** — show only ads generated for that product
- **Untagged** — show legacy ads that were saved before product tagging was added

### 7.3 Actions

| Action | How |
|--------|-----|
| View full size | Click on any image → opens Detail Modal |
| Download single | Click download icon on the card |
| Delete | Click trash icon → confirm |
| Refresh | Click refresh button to reload |
| Adapt Content | Select ads → click "Adapt Content" → choose product → generate captions |

When you open an ad in the Detail Modal, the **Product Reference** dropdown auto-fills based on:
1. The product the ad was generated for (stored in metadata)
2. The active product filter in the Library
3. The only product (if the brand has just one)

### 7.4 Bulk Actions

- **Select multiple ads** using checkboxes
- **Download selected as ZIP** — batch download in one file
- **Adapt Content** — generate social media captions for selected ads
- **Delete selected** — batch delete with confirmation

---

## 8. Settings & Profile

**Location:** User Menu (avatar) → **Settings**

### 8.1 Profile Information

Displays your:
- Full Name
- Email (@patigroup.com)
- Role (CEO, Super Admin, or Member)
- Department
- Join date & last login

### 8.2 Change Password

1. Enter your **current password**
2. Enter a **new password** (minimum 8 characters)
3. **Confirm** the new password
4. Click **"Change Password"**

---

## 9. Admin Panel

**Location:** Navigation → **Admin** (shield icon)
**Access:** CEO and Super Admin only

The Admin panel has two tabs: **Users** and **Settings**.

---

### 9.1 Users Tab

#### Dashboard Overview

4 stat cards at the top:
- **Total Users** — all accounts
- **Active** — currently active accounts
- **Inactive** — deactivated accounts
- **Admins** — CEO + Super Admin count

#### User Table

Columns: User (name + email + avatar), Role, Department, Status, Last Login, Actions

**Search:** Type in the search bar to filter by name, email, role, or department.

#### Create a New User

1. Click **"Create User"** (green button, top right)
2. Fill in the form:
   - **Email** — enter username (auto-appends @patigroup.com)
   - **Full Name** — required
   - **Department** — optional (Executive, Performance Marketing, Creative, HR, CRO, CS)
   - **Role** — Member (default), or Super Admin (CEO only)
3. Click **"Create Account"**
4. A temporary password is generated:
   - If email is configured: sent to the user's email
   - If not: displayed in a toast notification (30 seconds) — copy it and share manually

#### User Actions

Click **"Actions"** dropdown on any user row:

| Action | Description | Who Can |
|--------|-------------|---------|
| **Reset Password** | Generates new password, sends via email | All admins (not on CEO unless you are CEO) |
| **Deactivate** | Soft-disable — user can't login | All admins (not on CEO, super_admin needs CEO) |
| **Reactivate** | Re-enable a deactivated account | Same rules |
| **Promote to Super Admin** | Change role to super_admin | CEO only |
| **Demote to Member** | Change role to member | CEO only |
| **Delete Account** | Permanent deletion — type email to confirm | All admins (same hierarchy rules) |

#### Activity Log

At the bottom of the Admin Users tab — shows recent admin actions:
- Who did what, to whom, when
- Actions: create_user, reset_password, deactivate_user, reactivate_user, change_role, delete_user

---

### 9.2 Settings Tab — API Key Management

**Location:** Admin → **Settings** tab

This section allows admins to configure the API keys used by the tool at runtime — no server restart required.

| Key | Purpose |
|-----|---------|
| **Google API Key** | Gemini 2.5 Flash — product page reading, concept strategy, scene planning, prompt synthesis |
| **Anthropic API Key** | Claude Haiku 4.5 — competitor ad analysis, competitor sheet analysis, landing page analysis, persona generation |
| **KIE API Key** | nano-banana-2 model — image generation |
| **Google Console API Key** | Google Sheets API (competitor data) + Google Fonts API |

#### How to Update an API Key

1. Go to **Admin → Settings**
2. Find the key you want to update
3. Click the **edit (pencil) icon** next to the key
4. The current value is masked (shows first and last 3 characters only)
5. Enter the new key value
6. Click the **eye icon** to toggle visibility while typing
7. Click **"Save"**
8. A success notification appears for 3 seconds

#### Key Priority

Keys are resolved in this order:
1. **Database** (set via Admin UI) — takes priority
2. **Environment variable** (`.env.local`) — fallback if no DB value

> If you set a key via the Admin UI, it overrides the environment variable. To revert to the env var, clear the DB value.

#### Notes

- All key changes are recorded in the activity log
- Keys are cached in memory for 60 seconds after loading
- The actual key value is never displayed in full — only masked previews

---

## 10. Role Permissions

### 10.1 Role Hierarchy

| Role | Max Accounts | Description |
|------|:---:|---|
| **CEO** | 1 | Highest authority. Cannot be deleted or demoted. |
| **Super Admin** | 2 | Can manage all users except CEO. |
| **Member** | Unlimited | Standard employee. View-only on brand setup & concepts. |

### 10.2 Permission Matrix

| Action | CEO | Super Admin | Member |
|--------|:---:|:---:|:---:|
| Generate ads (Home) | Yes | Yes | Yes |
| Generate stealth ads | Yes | Yes | Yes |
| View Library | Yes | Yes | Yes |
| Edit Brand Setup | Yes | Yes | No (view only) |
| Edit Concepts | Yes | Yes | No (view only) |
| Change own password | Yes | Yes | Yes |
| View Admin panel | Yes | Yes | No |
| Manage API keys | Yes | Yes | No |
| Create users | Yes | Yes | No |
| Reset passwords | Yes | Yes (not CEO) | No |
| Deactivate users | Yes | Yes (not CEO) | No |
| Delete users | Yes | Yes (not CEO) | No |
| Change roles | Yes | No | No |

### 10.3 CEO Protection

- CEO account **cannot** be deleted, deactivated, or demoted by anyone
- Only CEO can promote/demote Super Admin roles
- Maximum 3 admin accounts total (1 CEO + 2 Super Admin)

---

## 11. Troubleshooting

### Common Issues

| Problem | Solution |
|---------|----------|
| "Invalid email or password" | Ensure email ends with @patigroup.com, password is 8+ chars |
| "Account deactivated" | Contact your admin to reactivate |
| Brand Setup is read-only | You are a Member — ask an admin to make changes |
| Concepts page is read-only | You are a Member — ask an admin to make changes |
| No products in dropdown | Go to Brand Setup → Products tab → add products first |
| No personas available | Go to Brand Setup → Personas tab → Generate or Add profiles |
| Generation stuck at "Reading product page" | Check the Landing Page URL is valid and accessible |
| Generated images look wrong | Ensure product images are high-quality, well-lit, showing the actual product |
| Admin link not visible | Only CEO and Super Admin roles see the Admin link |
| Can't delete a user | The user may have activity log entries — this is handled automatically |
| API key not working | Go to Admin → Settings → update the key; check the key is active and has correct permissions |
| Competitor data not loading | Ensure the Google Sheet is publicly accessible (Share → Anyone with the link can view) |
| KIE generation timeout | Large images take longer; try reducing ad count or product image file sizes |
| Stealth images not generating | Check that Plan Scenes was completed first before clicking Generate |

### Tips for Best Results

1. **Product Images Matter Most** — Use 3-5 high-res photos from different angles
2. **Fill in Brand Colors** — Accurate brand colors = consistent ad output
3. **Write Good Research** — The more competitor/market data you provide, the sharper the AI personas
4. **Use Multiple Concepts** — Combining 2-3 concepts generates more diverse creatives
5. **Try Both Modes** — Standard for brand ads, Stealth for organic-looking content
6. **Competitor Reference** — Upload a competitor ad you admire, the AI will replicate its layout with your brand
7. **Adjust Sensitivity** — For health/body products, use "High" sensitivity in Stealth mode
8. **Edit Scene Plans** — Before generating stealth images, review and tweak the AI-generated plans for best results
9. **Use Age Range Tuning** — Match the audience age range to your target demographic for more authentic stealth content
10. **Download as ZIP** — For batch campaigns, use "Download All as ZIP" to get all images at once

### Text & Logo Quality Rules

The AI enforces the following quality rules automatically in all generated ads:

**Text Capitalization:**
- All visible text uses **consistent capitalization**: either Title Case (Capitalize First Letter Of Each Word) or ALL CAPS
- Random mixed case is never allowed — no "bOoSt yOuR eNeRgY" style text
- This applies to headlines, body text, captions, and all text overlays

**Brand Logo:**
- The AI will **never generate, invent, or create** a brand logo from scratch
- If a brand logo image is uploaded in Brand Setup, it is reproduced **exactly as-is** — zero modifications, zero redesign
- If no logo image is provided, only the logo naturally printed on the product packaging is allowed

---

*Last updated: March 2026 — PATI Group Internal*
