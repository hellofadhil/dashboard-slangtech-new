# Quick Start Guide - Admin Dashboard

Get your admin dashboard up and running in 5 minutes!

## 1. Set Up Environment Variables (2 min)

Create `.env.local` in the project root:

```env
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

Get these values from your [Firebase Console](https://console.firebase.google.com):
1. Click ⚙️ → Project Settings
2. Copy the config values
3. Paste into `.env.local`

## 2. Set Up Firebase Firestore (2 min)

### Option A: Create Collections Manually

1. Go to Firebase Console → Firestore Database
2. Create a new database (Production mode)
3. Create these collections (empty for now):
   - `products`
   - `categories`
   - `heroSlides`

### Option B: Use Script (Coming Soon)

```bash
# Script will auto-create collections with default settings
# pnpm run seed
```

## 3. Start the Development Server (1 min)

```bash
pnpm dev
```

Open [http://localhost:3000/dashboard](http://localhost:3000/dashboard)

You should see the empty dashboard!

## 4. Create Your First Category (30 sec)

1. Click "Categories" in the sidebar
2. Click "New Category"
3. Fill in the form:
   - Name: "Electronics"
   - Slug: "electronics"
   - Description: "Electronic products"
4. Click "Create Category"

## 5. Create Your First Product (1 min)

1. Click "Products" in the sidebar
2. Click "New Product"
3. Fill in the form:
   - Title: "Wireless Headphones"
   - Slug: "wireless-headphones"
   - Category: "Electronics"
   - Description: "Quality wireless headphones"
   - Base Price: "99.99"
   - Add an image URL: `https://via.placeholder.com/500`
4. Click "Create Product"

✨ **Congratulations!** Your dashboard is working!

## Next Steps

### Essential Setup

1. **Add More Categories**
   - Electronics, Clothing, Home & Garden, etc.

2. **Add Product Variants**
   - Colors, sizes, storage options
   - Different prices per variant

3. **Configure Store Settings**
   - Go to Settings
   - Enter your store name, email, phone
   - Set tax rate and shipping costs

4. **Create Hero Slides**
   - Go to Hero Slides
   - Add carousel images for your homepage

### Production Setup

1. **Set up Authentication** (see [DEPLOYMENT.md](DEPLOYMENT.md))
2. **Implement Image Upload** (see [DASHBOARD_SETUP.md](DASHBOARD_SETUP.md))
3. **Deploy to Vercel** (see [DEPLOYMENT.md](DEPLOYMENT.md))

## Common Tasks

### Edit a Product

1. Click "Products"
2. Find the product in the list
3. Click the edit icon (pencil)
4. Make changes
5. Click "Update Product"

### Delete a Product

1. Click "Products"
2. Find the product
3. Click the trash icon
4. Confirm deletion

### Reorder Hero Slides

1. Click "Hero Slides"
2. Click edit on a slide
3. Change the "Order" number
4. Lower numbers appear first
5. Click "Update Slide"

### Toggle Hero Slide Visibility

1. Click "Hero Slides"
2. Click the eye icon to show/hide slides
3. Only "active" slides appear on homepage

### Update Store Information

1. Click "Settings" in the sidebar
2. Update any field
3. Click "Save Settings"

## Troubleshooting

### "Firebase initialization failed"

**Solution:**
- Check `.env.local` has correct Firebase keys
- Verify keys are copied exactly (no extra spaces)
- Make sure Firestore database exists in Firebase Console

### "Collections not found"

**Solution:**
- Go to Firebase Console → Firestore Database
- Manually create collections: `products`, `categories`, `heroSlides`
- Collections auto-create when you add documents

### "Can't upload images"

**Solution:**
- Image upload requires R2 configuration (optional)
- For now, use external image URLs (e.g., `https://via.placeholder.com/`)
- See [DASHBOARD_SETUP.md](DASHBOARD_SETUP.md) for R2 setup

### "Form validation errors"

**Solution:**
- Check that all required fields are filled
- Product must have at least one image URL
- Prices must be numbers
- Ensure SEO description is under 160 characters

## File Organization

```
Your project
├── .env.local                    ← Your Firebase keys here
├── QUICK_START.md                ← You are here
├── DASHBOARD_SETUP.md            ← Detailed setup guide
├── DASHBOARD_README.md           ← Full documentation
├── DEPLOYMENT.md                 ← Production deployment
├── app/dashboard/                ← Dashboard pages
├── components/dashboard/         ← Dashboard components
└── lib/                           ← Types, schemas, utilities
    ├── dashboard/
    ├── firebase/
    └── r2/
```

## What's Included

✅ **Product Management**
- Create/edit/delete products
- Multiple variants per product
- Stock tracking
- Product status (draft, active, archived)
- SEO fields

✅ **Category Management**
- Organize products
- Track product counts
- Manage descriptions

✅ **Hero Slides**
- Homepage carousel management
- Slide ordering
- Visibility toggle
- CTA buttons

✅ **Store Settings**
- Store configuration
- Currency and tax settings
- Shipping configuration
- Social media links

✅ **Form Features**
- Real-time validation
- Error messages
- Loading states
- Success notifications

✅ **Database**
- Firebase Firestore integration
- Automatic timestamps
- Type-safe operations

✅ **Image Uploads**
- API endpoint ready
- R2 integration (optional)
- URL-based images (default)

## Learn More

- [Full Dashboard Documentation](DASHBOARD_README.md)
- [Detailed Setup Guide](DASHBOARD_SETUP.md)
- [Deployment Guide](DEPLOYMENT.md)
- [Firebase Docs](https://firebase.google.com/docs)
- [Next.js Docs](https://nextjs.org/docs)

## Support

**Having issues?** Check:

1. Firebase keys are correct in `.env.local`
2. Firestore collections exist
3. Browser console for error messages
4. Terminal output for build errors

## Features Roadmap

- [ ] User authentication
- [ ] Product search and filtering
- [ ] Bulk operations
- [ ] Inventory management
- [ ] Order management
- [ ] Analytics dashboard
- [ ] Email notifications
- [ ] Scheduled backups

---

**Ready to customize?** Check out the [Full Documentation](DASHBOARD_README.md)!
