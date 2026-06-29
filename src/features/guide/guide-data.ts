import type { GuideSection, SetupChecklistItem } from '@/features/guide/types'

// ─── Setup Checklist ────────────────────────────────────────────────────────

export const SETUP_CHECKLIST_ITEMS: SetupChecklistItem[] = [
  { id: 'create-client', label: 'Create a Client', description: 'Header → "New Client" button', required: true, linkTo: '/' },
  { id: 'brand-identity', label: 'Set up Brand Identity', description: 'Brand Setup → Brand Identity tab', required: true, linkTo: '/brand-setup' },
  { id: 'add-products', label: 'Add Products (with images)', description: 'Brand Setup → Products tab', required: true, linkTo: '/brand-setup' },
  { id: 'create-personas', label: 'Create/Generate Personas', description: 'Brand Setup → Personas tab', required: false, linkTo: '/brand-setup' },
  { id: 'add-research', label: 'Add Brand Research', description: 'Brand Setup → Brand Intelligence tab', required: false, linkTo: '/brand-setup' },
]

// ─── Guide Sections ─────────────────────────────────────────────────────────

export const GUIDE_SECTIONS: GuideSection[] = [
  // ── Section 1: Getting Started ──────────────────────────────────────────
  {
    id: 'getting-started',
    number: 1,
    title: 'Getting Started',
    icon: 'Rocket',
    description: 'Login, password reset, and first-time setup',
    adminOnly: false,
    content: [],
    subsections: [
      {
        id: '1-1-login',
        title: '1.1 Login',
        content: [
          { type: 'steps', items: [
            'Open the tool URL in your browser',
            'Enter your @patigroup.com email and password',
            'Click Sign In',
          ]},
          { type: 'tip', text: 'First-time users: your admin will provide a temporary password via email. Change it immediately after login.' },
        ],
      },
      {
        id: '1-2-forgot-password',
        title: '1.2 Forgot Password',
        content: [
          { type: 'steps', items: [
            'Click "Forgot password?" on the login page',
            'Enter your @patigroup.com email',
            'Check your inbox for a new temporary password',
            'Login with the new password and change it in Settings',
          ]},
        ],
      },
      {
        id: '1-3-first-time-setup',
        title: '1.3 First-Time Setup Checklist',
        content: [
          { type: 'paragraph', text: 'Before generating ads, you need to complete these steps:' },
          { type: 'table', headers: ['Step', 'Where', 'Required'], rows: [
            ['Create a Client', 'Header → "New Client" button', 'Yes'],
            ['Set up Brand Identity', 'Brand Setup → Brand Identity tab', 'Yes'],
            ['Add Products (with images)', 'Brand Setup → Products tab', 'Yes'],
            ['Create/Generate Personas', 'Brand Setup → Personas tab', 'Recommended'],
            ['Add Brand Research', 'Brand Setup → Brand Intelligence tab', 'Recommended'],
          ]},
        ],
      },
    ],
  },

  // ── Section 2: Dashboard & Navigation ───────────────────────────────────
  {
    id: 'dashboard-navigation',
    number: 2,
    title: 'Dashboard & Navigation',
    icon: 'LayoutDashboard',
    description: 'Header bar, navigation links, client management',
    adminOnly: false,
    content: [],
    subsections: [
      {
        id: '2-1-header-bar',
        title: '2.1 Header Bar',
        content: [
          { type: 'paragraph', text: 'The top header contains:' },
          { type: 'list', items: [
            'Logo & App Name - click to go Home',
            'Navigation Links: Home, Stealth Ads, Brand Setup, Concepts, Library, Guide, Admin (admin only)',
            'Client Selector - dropdown to switch between clients',
            'Client Actions - Rename (pencil), Delete (trash), New Client (green button)',
            'Help Button - quick link to this User Guide',
            'User Menu - click your avatar initials to access Settings and Sign Out',
          ]},
        ],
      },
      {
        id: '2-2-client-management',
        title: '2.2 Client Management',
        content: [
          { type: 'paragraph', text: 'Each client has its own brands, products, markets, and generated ads.' },
          { type: 'table', headers: ['Action', 'How'], rows: [
            ['Create client', 'Click green "New Client" button in header'],
            ['Switch client', 'Click client name dropdown → select another'],
            ['Rename client', 'Click pencil icon next to client selector'],
            ['Delete client', 'Click trash icon next to client selector'],
          ]},
        ],
      },
    ],
  },

  // ── Section 3: Brand Setup ──────────────────────────────────────────────
  {
    id: 'brand-setup',
    number: 3,
    title: 'Brand Setup',
    icon: 'Palette',
    description: 'Visual identity, products, brand intelligence, personas',
    adminOnly: false,
    content: [
      { type: 'paragraph', text: 'Location: Navigation → Brand Setup. All users can view. Only admins (CEO, Super Admin) can edit.' },
      { type: 'warning', text: 'Members see a yellow "View only" banner and cannot modify any settings.' },
    ],
    subsections: [
      {
        id: '3-1-brand-identity',
        title: '3.1 Brand Identity Tab',
        content: [
          { type: 'table', headers: ['Field', 'Description', 'Required'], rows: [
            ['Brand Name', 'Your brand\'s display name', 'Yes'],
            ['Brand Description', 'Brief brand overview, positioning, key messages', 'Recommended'],
            ['Typography', 'Select a Google Font or upload a local font file', 'Recommended'],
            ['Color Palette', '6 colors: Primary 1&2, Secondary 1&2, Accent 1&2', 'Yes'],
            ['Logo (Light)', 'Logo for light backgrounds (SVG, PNG, or JPG)', 'Recommended'],
            ['Logo (Dark)', 'Logo for dark backgrounds', 'Recommended'],
          ]},
          { type: 'heading', level: 4, text: 'How to set colors', id: 'set-colors' },
          { type: 'steps', items: [
            'Click the color swatch',
            'A color picker opens - select your brand color',
            'The hex code updates automatically',
          ]},
          { type: 'heading', level: 4, text: 'How to upload a logo', id: 'upload-logo' },
          { type: 'steps', items: [
            'Click the dashed upload area',
            'Select a file (SVG, PNG, or JPG, max 2MB)',
            'Preview appears immediately',
            'Click X to remove and re-upload',
          ]},
          { type: 'tip', text: 'Click "Save Brand Kit" (top right) to persist all changes. A live preview card on the right updates in real-time as you modify settings.' },
        ],
      },
      {
        id: '3-2-products',
        title: '3.2 Products Tab',
        content: [
          { type: 'heading', level: 4, text: 'Add a Product', id: 'add-product' },
          { type: 'steps', items: [
            'Click "Add Product"',
            'Enter Product Name (required)',
            'Enter Description (optional but recommended - key features, ingredients, benefits)',
            'Upload Product Images (required, max 5): First image = MAIN (used as hero in ads). Click the crown icon to change primary. Use arrows to reorder. Click X to remove.',
            'Click "Create Product"',
          ]},
          { type: 'paragraph', text: 'Use the pencil (edit) and trash (delete) icons on each product card to manage products.' },
          { type: 'tip', text: 'Product images are critical for ad quality. Use high-resolution photos showing the actual product from multiple angles.' },
        ],
      },
      {
        id: '3-3-brand-intelligence',
        title: '3.3 Brand Intelligence Tab',
        content: [
          { type: 'heading', level: 4, text: 'Research Summary', id: 'research-summary' },
          { type: 'steps', items: [
            'Paste competitor research, product notes, brand briefs, or market insights into the large text area',
            'Click "Save Research Summary"',
            'This context helps AI generate better personas and ad copy',
          ]},
        ],
      },
      {
        id: '3-4-personas',
        title: '3.4 Personas Tab',
        content: [
          { type: 'heading', level: 4, text: 'Auto-generate', id: 'auto-generate-personas' },
          { type: 'steps', items: [
            'Ensure you have research saved in Brand Intelligence',
            'Go to Personas tab → Click "Generate 10 Profiles"',
            'AI analyzes your brand + research → creates persona profiles',
            'Each persona has: Title, Pain Point, Angle, Emotion',
          ]},
          { type: 'heading', level: 4, text: 'Manual add', id: 'manual-add-persona' },
          { type: 'steps', items: [
            'Click "Add Profile"',
            'Fill in: Title, Pain, Angle, Emotion',
            'Click "Create"',
          ]},
          { type: 'tip', text: 'Personas are used during ad generation to tailor messaging to specific audience segments.' },
        ],
      },
    ],
  },

  // ── Section 4: Concepts Management ──────────────────────────────────────
  {
    id: 'concepts-management',
    number: 4,
    title: 'Concepts Management',
    icon: 'Lightbulb',
    description: 'Creative strategies for ad generation',
    adminOnly: false,
    content: [
      { type: 'paragraph', text: 'Location: Navigation → Concepts. Admins can create/edit/delete. Members see view-only mode.' },
      { type: 'paragraph', text: 'Concepts define creative strategies used during ad generation. Each concept has:' },
      { type: 'table', headers: ['Field', 'Description'], rows: [
        ['Concept ID', 'Unique identifier (e.g., data_hook, social_proof)'],
        ['Label', 'Display name'],
        ['Description', 'What strategy this concept uses'],
        ['Requires Competitor', 'Whether this concept needs competitor data'],
        ['Prompt', 'Full creative strategy + visual direction for the AI'],
        ['Reference Images', 'Up to 2 reference images for visual style'],
      ]},
    ],
    subsections: [
      {
        id: '4-1-built-in-concepts',
        title: '4.1 Built-in Concepts',
        content: [
          { type: 'table', headers: ['Concept', 'Strategy'], rows: [
            ['Data Hook', 'Statistics, numbers, data-driven messaging'],
            ['Before/After', 'Transformation narrative'],
            ['VS Competitor', 'Direct comparison (needs competitor data)'],
            ['Social Proof', 'Reviews, testimonials, usage evidence'],
            ['Ingredient Callout', 'Highlight key ingredients/components'],
            ['Urgency/Scarcity', 'Limited time, limited stock messaging'],
          ]},
        ],
      },
      {
        id: '4-2-add-concept',
        title: '4.2 How to Add a Concept (Admin)',
        content: [
          { type: 'steps', items: [
            'Click "Add Concept"',
            'Fill in all fields',
            'In the Prompt field, you can structure multiple layout variants using ### Variant A, ### Variant B, etc. - AI will rotate through them per generation',
            'Optionally upload reference images (max 2) for visual style guidance',
            'Click "Save"',
          ]},
          { type: 'tip', text: 'Click the expand arrow on any concept card to view its full prompt. Reference images provide visual style guidance - product content and brand colors are never copied from references.' },
        ],
      },
    ],
  },

  // ── Section 5: Standard Ad Generation (Home) ───────────────────────────
  {
    id: 'standard-generation',
    number: 5,
    title: 'Standard Ad Generation (Home)',
    icon: 'Sparkles',
    description: 'Generate polished, brand-consistent ad creatives',
    adminOnly: false,
    content: [
      { type: 'paragraph', text: 'Location: Navigation → Home. This is the main workspace for generating polished, brand-consistent ad creatives.' },
    ],
    subsections: [
      {
        id: '5-1-configuration',
        title: '5.1 Left Panel - Configuration',
        content: [
          { type: 'paragraph', text: 'Fill in these sections from top to bottom:' },
          { type: 'heading', level: 4, text: 'Step 1: Brand Product (Required)', id: 'step1-product' },
          { type: 'list', items: [
            'Select a Product from the dropdown',
            'Enter the Landing Page URL (the product\'s web page - AI reads this for context)',
          ]},
          { type: 'heading', level: 4, text: 'Step 2: Language', id: 'step2-language' },
          { type: 'list', items: [
            'Select the Language for the ad copy (English US/UK, German, French, Spanish, Vietnamese)',
            'All generated text - headlines, body copy, and image text - will be in this language',
          ]},
          { type: 'heading', level: 4, text: 'Step 3: Generation Mode', id: 'step3-mode' },
          { type: 'list', items: [
            'Concept-Based (default) - AI applies selected concepts creatively',
            'Competitor Reference - Upload a competitor\'s ad image → AI replicates its layout with your brand',
          ]},
          { type: 'heading', level: 4, text: 'Step 4: Concepts (Required - Concept-Based mode)', id: 'step4-concepts' },
          { type: 'list', items: [
            'Check one or more concepts to apply',
            'Each concept generates ads with a different creative strategy',
            'Concepts marked "Competitor" badge need market data with a linked sheet',
          ]},
          { type: 'heading', level: 4, text: 'Step 5: Ad Copy Override (Optional)', id: 'step5-adcopy' },
          { type: 'list', items: [
            'Expand this section to manually override AI-generated text',
            'Headline - custom headline text',
            'Body Text - custom body copy',
            'Additional Notes - specific direction for the AI',
          ]},
          { type: 'heading', level: 4, text: 'Step 6: Target Audience (Required)', id: 'step6-audience' },
          { type: 'list', items: [
            'Select one or more personas',
            'Each selected persona generates a variant tailored to that audience',
            'Use "Select All" for maximum variety',
          ]},
          { type: 'heading', level: 4, text: 'Step 7: Output Configuration', id: 'step7-output' },
          { type: 'list', items: [
            'Aspect Ratio: 1:1 (Square), 4:5 (Portrait), 9:16 (Story)',
            'Ad Count: 1–10 ads per concept × persona combination',
          ]},
        ],
      },
      {
        id: '5-2-progress-results',
        title: '5.2 Right Panel - Progress & Results',
        content: [
          { type: 'paragraph', text: 'During generation, step-by-step progress shows:' },
          { type: 'steps', items: [
            'Reading product page...',
            'Analyzing competitor data...',
            'Applying concept strategy...',
            'Assembling prompt...',
            'Generating image...',
          ]},
          { type: 'paragraph', text: 'Each step shows status: Pending → Running → Completed.' },
          { type: 'heading', level: 4, text: 'Actions per ad', id: 'actions-per-ad' },
          { type: 'table', headers: ['Button', 'Action'], rows: [
            ['Bookmark', 'Save to Library'],
            ['Copy', 'Copy the generation prompt'],
            ['Download', 'Download image file'],
            ['Trash', 'Remove from results'],
          ]},
          { type: 'heading', level: 4, text: 'Bulk actions', id: 'bulk-actions' },
          { type: 'list', items: [
            'Save All - save all results to Library',
            'Download All as ZIP - download all images in a single ZIP file',
            'Clear - remove all results',
          ]},
          { type: 'tip', text: 'Results are cached locally for 1 hour. Navigating away and back preserves your results.' },
        ],
      },
      {
        id: '5-3-competitor-reference',
        title: '5.3 Competitor Reference Mode',
        content: [
          { type: 'steps', items: [
            'Click the upload area or drag-drop a competitor ad image',
            'AI analyzes the layout, colors, typography, and composition',
            'Choose a sub-mode:',
          ]},
          { type: 'heading', level: 4, text: 'Sub-mode: Standard Ad', id: 'submode-standard' },
          { type: 'list', items: [
            'AI generates a single ad replicating the competitor\'s layout',
            'Uses YOUR brand\'s product, colors, and messaging',
            'Competitor color scheme is explicitly blocked',
          ]},
          { type: 'heading', level: 4, text: 'Sub-mode: Stealth Ad', id: 'submode-stealth' },
          { type: 'list', items: [
            'AI generates scene-based stealth ads inspired by the competitor\'s reference',
            '2-step flow: Plan Scenes → Generate',
            'Additional options: Sensitivity Level (Normal / High) and Audience Age Range',
          ]},
        ],
      },
      {
        id: '5-4-language-support',
        title: '5.4 Language Support',
        content: [
          { type: 'table', headers: ['Code', 'Language'], rows: [
            ['en-US', 'English (US)'],
            ['en-UK', 'English (UK)'],
            ['de', 'German'],
            ['fr', 'French'],
            ['es', 'Spanish'],
            ['vi', 'Vietnamese'],
          ]},
          { type: 'paragraph', text: 'Language is applied to ALL generated text: headline, body copy, and any text overlays in the image.' },
        ],
      },
    ],
  },

  // ── Section 6: Stealth Ad Generation ────────────────────────────────────
  {
    id: 'stealth-generation',
    number: 6,
    title: 'Stealth Ad Generation',
    icon: 'EyeOff',
    description: 'Generate ads disguised as everyday content',
    adminOnly: false,
    content: [
      { type: 'paragraph', text: 'Location: Navigation → Stealth Ads. Stealth ads look like organic, everyday content - iPhone photos, text screenshots, candid moments - with the product subtly placed. They bypass "ad fatigue" because viewers don\'t recognize them as ads.' },
    ],
    subsections: [
      {
        id: '6-1-how-it-works',
        title: '6.1 How Stealth Ads Work',
        content: [
          { type: 'paragraph', text: '2-Step Flow:' },
          { type: 'steps', items: [
            'Plan Scenes - AI generates detailed scene descriptions',
            'Generate Images - AI creates photorealistic images from each scene plan',
          ]},
        ],
      },
      {
        id: '6-2-configuration',
        title: '6.2 Left Panel - Configuration',
        content: [
          { type: 'heading', level: 4, text: 'Step 1–2: Product & Language', id: 'stealth-step12' },
          { type: 'paragraph', text: 'Same as Standard Ads - select product, URL, and language.' },
          { type: 'heading', level: 4, text: 'Step 3: Scene Selection', id: 'stealth-step3' },
          { type: 'paragraph', text: 'Auto Mode (recommended): AI automatically selects the best scenes based on your product and audience with priority hints (top pick / acceptable / avoid).' },
          { type: 'paragraph', text: 'Manual Mode: Browse 45 scenes across 4 categories:' },
          { type: 'table', headers: ['Category', 'Code', 'Description', 'Examples'], rows: [
            ['Human-Centric', 'HUM', 'Person is the hero, product is incidental', 'Gym Mirror Selfie, Post-Workout Glow, Beach Candid'],
            ['Environment', 'ENV', 'Product placed naturally in real settings', 'Morning Counter, Gym Bag Flat Lay, Nightstand'],
            ['Content Format', 'FMT', 'Product in screenshots/text content', 'iPhone Screenshot, Chat Bubble, Review Box'],
            ['Story', 'STR', 'Product woven into narratives', 'Daily Routine, Transformation Journey, Gifting Story'],
          ]},
          { type: 'paragraph', text: 'You can also add custom scenes by clicking "Add Custom Scene" - fill in ID, category, name, description, placement method, and best-for tags.' },
          { type: 'heading', level: 4, text: 'Step 4: Target Audience', id: 'stealth-step4' },
          { type: 'paragraph', text: 'Same as Standard Ads - select personas.' },
          { type: 'heading', level: 4, text: 'Step 5: Audience Tuning', id: 'stealth-step5' },
          { type: 'table', headers: ['Setting', 'Options', 'When to Use'], rows: [
            ['Sensitivity Level', 'Normal / High', 'Use "High" for body image, weight, beauty products'],
            ['Age Range', '18-25, 25-35, 35-45, 45-55, 55+', 'Adjusts cultural references, props, text style'],
          ]},
          { type: 'paragraph', text: 'High sensitivity ensures: no before/after body comparisons, no enhancement language, product benefit never stated - only presence shown, body type shown as "attainable aspiration".' },
          { type: 'heading', level: 4, text: 'Step 6: Output', id: 'stealth-step6' },
          { type: 'paragraph', text: 'Same as Standard Ads - aspect ratio + count.' },
        ],
      },
      {
        id: '6-3-plans-results',
        title: '6.3 Right Panel - Scene Plans & Results',
        content: [
          { type: 'heading', level: 4, text: 'Planning Phase', id: 'stealth-planning' },
          { type: 'paragraph', text: 'Click "Plan Scenes" → AI generates scene plans. Each plan card shows:' },
          { type: 'list', items: [
            'Scene name & category badge',
            'Product visibility: Physical (product appears) or Name-only (only text mention)',
            'Composition preview (camera angle, lighting, color mood)',
            'Product placement details (location, size, integration method)',
            'Text content (what text appears in the image)',
          ]},
          { type: 'paragraph', text: 'Edit plans before generating:' },
          { type: 'list', items: [
            'Click any field to edit inline',
            'Reorder plans with up/down arrows',
            'Delete plans you don\'t want',
            'Regenerate a single plan with the refresh icon',
            'Add scenes from the scene library using the "Add Scene" button',
          ]},
          { type: 'heading', level: 4, text: 'Generation Phase', id: 'stealth-generation-phase' },
          { type: 'paragraph', text: 'Click "Generate" → images are created one by one. Each result has save/download/delete actions.' },
          { type: 'paragraph', text: 'Bulk actions: Download All as ZIP, Save All to Library.' },
        ],
      },
      {
        id: '6-4-scene-categories',
        title: '6.4 Scene Categories Explained',
        content: [
          { type: 'heading', level: 4, text: 'HUM (Human-Centric) - 17 scenes', id: 'hum-scenes' },
          { type: 'list', items: [
            'A real person is the hero (gym selfie, cooking, running)',
            'Product appears far in background, easy to miss',
            'Body is the scroll-stopper, product enters subconscious',
            'Text is minimal (caption-style, timestamp)',
          ]},
          { type: 'paragraph', text: 'Scenes: Gym Mirror Selfie, Progress Check Mirror, Kitchen Meal Prep, Post-Workout Glow, Beach/Pool Candid, Couple Workout, Yoga/Pilates Mat, Running Outdoors, Getting Ready Mirror, Living Room Workout, Gym Action Shot, Smoothie Making, Friend Group Gym, Shirtless Morning Routine, Locker Room Candid, Gym Outfit Check, Between Sets Rest.' },
          { type: 'heading', level: 4, text: 'ENV (Environment) - 10 scenes', id: 'env-scenes' },
          { type: 'list', items: [
            'Product sitting naturally in everyday settings',
            'Morning counter, bathroom shelf, gym bag, desk',
            'iPhone-quality photo, unedited feel',
            'Text overlays allowed (lifestyle captions)',
          ]},
          { type: 'heading', level: 4, text: 'FMT (Content Format) - 10 scenes', id: 'fmt-scenes' },
          { type: 'list', items: [
            'Product embedded in digital content',
            'Screenshots, chat messages, reviews, receipts',
            'Platform-accurate UI (iMessage, Instagram, Notes app)',
            'Product name mentioned casually in text',
          ]},
          { type: 'heading', level: 4, text: 'STR (Story) - 8 scenes', id: 'str-scenes' },
          { type: 'list', items: [
            'Product woven into a visual narrative',
            'The STORY is the hero, product is a supporting detail',
            'Daily routines, transformation journeys, social moments',
          ]},
        ],
      },
    ],
  },

  // ── Section 7: Library (Ad Gallery) ─────────────────────────────────────
  {
    id: 'library',
    number: 7,
    title: 'Library (Ad Gallery)',
    icon: 'FolderOpen',
    description: 'Browse, download, and manage all generated ads',
    adminOnly: false,
    content: [
      { type: 'paragraph', text: 'Location: Navigation → Library.' },
    ],
    subsections: [
      {
        id: '7-1-viewing-ads',
        title: '7.1 Viewing Ads',
        content: [
          { type: 'table', headers: ['Control', 'Options'], rows: [
            ['View Mode', 'Grid (image tiles) / List (table rows)'],
            ['Sort', 'Newest First / Oldest First'],
            ['Date Filter', 'All Time, Today, This Week, This Month, Last Month'],
            ['Search', 'Search by filename'],
            ['Refresh', 'Reload gallery from storage'],
          ]},
        ],
      },
      {
        id: '7-2-actions',
        title: '7.2 Actions',
        content: [
          { type: 'table', headers: ['Action', 'How'], rows: [
            ['View full size', 'Click on any image'],
            ['Download single', 'Click download icon on the card'],
            ['Delete', 'Click trash icon → confirm'],
            ['Refresh', 'Click refresh button to reload from storage'],
          ]},
        ],
      },
      {
        id: '7-3-bulk-actions',
        title: '7.3 Bulk Actions',
        content: [
          { type: 'list', items: [
            'Select multiple ads using checkboxes',
            'Download selected as ZIP - batch download in one file',
            'Delete selected - batch delete with confirmation',
          ]},
        ],
      },
    ],
  },

  // ── Section 8: Settings & Profile ───────────────────────────────────────
  {
    id: 'settings-profile',
    number: 8,
    title: 'Settings & Profile',
    icon: 'Settings',
    description: 'View profile and change password',
    adminOnly: false,
    content: [
      { type: 'paragraph', text: 'Location: User Menu (avatar) → Settings.' },
    ],
    subsections: [
      {
        id: '8-1-profile',
        title: '8.1 Profile Information',
        content: [
          { type: 'paragraph', text: 'Displays your:' },
          { type: 'list', items: [
            'Full Name',
            'Email (@patigroup.com)',
            'Role (CEO, Super Admin, or Member)',
            'Department',
            'Join date & last login',
          ]},
        ],
      },
      {
        id: '8-2-change-password',
        title: '8.2 Change Password',
        content: [
          { type: 'steps', items: [
            'Enter your current password',
            'Enter a new password (minimum 8 characters)',
            'Confirm the new password',
            'Click "Change Password"',
          ]},
        ],
      },
    ],
  },

  // ── Section 9: Admin Panel ──────────────────────────────────────────────
  {
    id: 'admin-panel',
    number: 9,
    title: 'Admin Panel',
    icon: 'Shield',
    description: 'User management, API keys, activity log',
    adminOnly: true,
    content: [
      { type: 'paragraph', text: 'Location: Navigation → Admin (shield icon). CEO and Super Admin only.' },
      { type: 'paragraph', text: 'The Admin panel has two tabs: Users and Settings.' },
    ],
    subsections: [
      {
        id: '9-1-dashboard',
        title: '9.1 Users Tab - Dashboard Overview',
        content: [
          { type: 'paragraph', text: '4 stat cards at the top:' },
          { type: 'list', items: [
            'Total Users - all accounts',
            'Active - currently active accounts',
            'Inactive - deactivated accounts',
            'Admins - CEO + Super Admin count',
          ]},
          { type: 'heading', level: 4, text: 'User Table', id: 'user-table' },
          { type: 'paragraph', text: 'Columns: User (name + email + avatar), Role, Department, Status, Last Login, Actions.' },
          { type: 'paragraph', text: 'Search: Type in the search bar to filter by name, email, role, or department.' },
        ],
      },
      {
        id: '9-2-create-user',
        title: '9.2 Create a New User',
        content: [
          { type: 'steps', items: [
            'Click "Create User" (green button, top right)',
            'Fill in the form: Email (auto-appends @patigroup.com), Full Name (required), Department (optional), Role (Member default, or Super Admin for CEO only)',
            'Click "Create Account"',
            'A temporary password is generated - if email is configured: sent to the user\'s email. If not: displayed in a toast notification (30 seconds) - copy it and share manually.',
          ]},
        ],
      },
      {
        id: '9-3-user-actions',
        title: '9.3 User Actions',
        content: [
          { type: 'paragraph', text: 'Click "Actions" dropdown on any user row:' },
          { type: 'table', headers: ['Action', 'Description', 'Who Can'], rows: [
            ['Reset Password', 'Generates new password, sends via email', 'All admins (not on CEO unless you are CEO)'],
            ['Deactivate', 'Soft-disable - user can\'t login', 'All admins (not on CEO, super_admin needs CEO)'],
            ['Reactivate', 'Re-enable a deactivated account', 'Same rules'],
            ['Promote to Super Admin', 'Change role to super_admin', 'CEO only'],
            ['Demote to Member', 'Change role to member', 'CEO only'],
            ['Delete Account', 'Permanent deletion - type email to confirm', 'All admins (same hierarchy rules)'],
          ]},
        ],
      },
      {
        id: '9-4-activity-log',
        title: '9.4 Activity Log',
        content: [
          { type: 'paragraph', text: 'At the bottom of the Admin Users tab - shows recent admin actions: who did what, to whom, when.' },
          { type: 'paragraph', text: 'Actions: create_user, reset_password, deactivate_user, reactivate_user, change_role, delete_user.' },
        ],
      },
      {
        id: '9-5-api-keys',
        title: '9.5 Settings Tab - API Key Management',
        content: [
          { type: 'paragraph', text: 'This section allows admins to configure the API keys used by the tool at runtime - no server restart required.' },
          { type: 'table', headers: ['Key', 'Purpose'], rows: [
            ['Google API Key', 'Gemini 2.5 Flash - product page reading, concept strategy, scene planning, prompt synthesis'],
            ['Anthropic API Key', 'Claude Haiku 4.5 - competitor ad analysis, competitor sheet analysis, landing page analysis, persona generation'],
            ['KIE API Key', 'nano-banana-2 model - image generation'],
            ['Google Console API Key', 'Google Sheets API (competitor data) + Google Fonts API'],
          ]},
          { type: 'heading', level: 4, text: 'How to Update an API Key', id: 'update-api-key' },
          { type: 'steps', items: [
            'Go to Admin → Settings',
            'Find the key you want to update',
            'Click the edit (pencil) icon next to the key',
            'Enter the new key value (use the eye icon to toggle visibility)',
            'Click "Save"',
            'A success notification appears for 3 seconds',
          ]},
          { type: 'tip', text: 'Keys set via Admin UI override environment variables. Keys are cached for 60 seconds. The actual key value is never displayed in full - only masked previews. All changes are recorded in the activity log.' },
        ],
      },
    ],
  },

  // ── Section 10: Role Permissions ────────────────────────────────────────
  {
    id: 'role-permissions',
    number: 10,
    title: 'Role Permissions',
    icon: 'Lock',
    description: 'Role hierarchy and permission matrix',
    adminOnly: true,
    content: [],
    subsections: [
      {
        id: '10-1-role-hierarchy',
        title: '10.1 Role Hierarchy',
        content: [
          { type: 'table', headers: ['Role', 'Max Accounts', 'Description'], rows: [
            ['CEO', '1', 'Highest authority. Cannot be deleted or demoted.'],
            ['Super Admin', '2', 'Can manage all users except CEO.'],
            ['Member', 'Unlimited', 'Standard employee. View-only on brand setup & concepts.'],
          ]},
        ],
      },
      {
        id: '10-2-permission-matrix',
        title: '10.2 Permission Matrix',
        content: [
          { type: 'table', headers: ['Action', 'CEO', 'Super Admin', 'Member'], rows: [
            ['Generate ads (Home)', 'Yes', 'Yes', 'Yes'],
            ['Generate stealth ads', 'Yes', 'Yes', 'Yes'],
            ['View Library', 'Yes', 'Yes', 'Yes'],
            ['Edit Brand Setup', 'Yes', 'Yes', 'No (view only)'],
            ['Edit Concepts', 'Yes', 'Yes', 'No (view only)'],
            ['Change own password', 'Yes', 'Yes', 'Yes'],
            ['View Admin panel', 'Yes', 'Yes', 'No'],
            ['Manage API keys', 'Yes', 'Yes', 'No'],
            ['Create users', 'Yes', 'Yes', 'No'],
            ['Reset passwords', 'Yes', 'Yes (not CEO)', 'No'],
            ['Deactivate users', 'Yes', 'Yes (not CEO)', 'No'],
            ['Delete users', 'Yes', 'Yes (not CEO)', 'No'],
            ['Change roles', 'Yes', 'No', 'No'],
          ]},
        ],
      },
      {
        id: '10-3-ceo-protection',
        title: '10.3 CEO Protection',
        content: [
          { type: 'list', items: [
            'CEO account cannot be deleted, deactivated, or demoted by anyone',
            'Only CEO can promote/demote Super Admin roles',
            'Maximum 3 admin accounts total (1 CEO + 2 Super Admin)',
          ]},
        ],
      },
    ],
  },

  // ── Section 11: Troubleshooting ─────────────────────────────────────────
  {
    id: 'troubleshooting',
    number: 11,
    title: 'Troubleshooting',
    icon: 'Wrench',
    description: 'Common issues and tips for best results',
    adminOnly: false,
    content: [],
    subsections: [
      {
        id: '11-1-common-issues',
        title: '11.1 Common Issues',
        content: [
          { type: 'table', headers: ['Problem', 'Solution'], rows: [
            ['"Invalid email or password"', 'Ensure email ends with @patigroup.com, password is 8+ chars'],
            ['"Account deactivated"', 'Contact your admin to reactivate'],
            ['Brand Setup is read-only', 'You are a Member - ask an admin to make changes'],
            ['Concepts page is read-only', 'You are a Member - ask an admin to make changes'],
            ['No products in dropdown', 'Go to Brand Setup → Products tab → add products first'],
            ['No personas available', 'Go to Brand Setup → Personas tab → Generate or Add profiles'],
            ['Generation stuck at "Reading product page"', 'Check the Landing Page URL is valid and accessible'],
            ['Generated images look wrong', 'Ensure product images are high-quality, well-lit, showing the actual product'],
            ['Admin link not visible', 'Only CEO and Super Admin roles see the Admin link'],
            ['API key not working', 'Go to Admin → Settings → update the key; check the key is active'],
            ['Competitor data not loading', 'Ensure the Google Sheet is publicly accessible (if market is configured)'],
            ['KIE generation timeout', 'Try reducing ad count or product image file sizes'],
            ['Stealth images not generating', 'Check that Plan Scenes was completed first before clicking Generate'],
          ]},
        ],
      },
      {
        id: '11-2-tips',
        title: '11.2 Tips for Best Results',
        content: [
          { type: 'steps', items: [
            'Product Images Matter Most - Use 3-5 high-res photos from different angles',
            'Fill in Brand Colors - Accurate brand colors = consistent ad output',
            'Write Good Research - The more competitor/market data you provide, the sharper the AI personas',
            'Use Multiple Concepts - Combining 2-3 concepts generates more diverse creatives',
            'Try Both Modes - Standard for brand ads, Stealth for organic-looking content',
            'Competitor Reference - Upload a competitor ad you admire, the AI will replicate its layout with your brand',
            'Adjust Sensitivity - For health/body products, use "High" sensitivity in Stealth mode',
            'Edit Scene Plans - Before generating stealth images, review and tweak the AI-generated plans',
            'Use Age Range Tuning - Match the audience age range to your target demographic for more authentic stealth content',
            'Download as ZIP - For batch campaigns, use "Download All as ZIP" to get all images at once',
            'Text Capitalization - AI enforces consistent capitalization: Title Case or ALL CAPS only, never random mixed case',
            'Brand Logo - AI never generates logos. If a logo image is uploaded, it is used exactly as-is with zero modifications',
          ]},
        ],
      },
    ],
  },
]
