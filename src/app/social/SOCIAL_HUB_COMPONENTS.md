# 🃏 SMARTER.POKER SOCIAL HUB

## Vision: Facebook Clone with a Poker Twist

The Smarter.Poker Social Hub combines the familiar social networking experience of Facebook with deep poker-specific features, creating a community where players share hands, track progress, and build reputation.

---

## 🎨 Theme Options

### ✅ RECOMMENDED: Facebook-Style (Light Theme)
- **Classic Facebook look and feel**
- Light, bright backgrounds (#F0F2F5)
- White card backgrounds
- Facebook blue accents (#1877F2)
- Familiar, friendly interface
- **Files:** `FacebookStyleCard.jsx`, `FacebookFeedView.jsx`, `facebook-style.css`

### Alternative: Dark Theme (Poker-focused)
- Neon/cyberpunk aesthetic
- Dark backgrounds with glowing accents
- Heat map borders for trending posts
- GTO Master golden glow effects
- **Files:** `PokerFeedCard.jsx`, `HeatMapBorder.jsx`

---

## 📱 Component Library

### 1. **Core Layout & views**
Located in `src/app/social/components/` and `src/app/social/views/`

| Component | Description | Status |
|-----------|-------------|--------|
| `FacebookLayout` | Main shell with fixed Navbar, Chat Dock, and Responsive container | ✅ Ready |
| `FacebookFeedView` | Main news feed with Stories, Create Post, and infinite scroll | ✅ Ready |
| `FacebookProfileView` | User profile with Cover, Bio, Photos, and Timeline | ✅ Ready |
| `FacebookClubView` | Group pages for Poker Clubs with Leaderboards and Events | ✅ Ready |
| `FacebookWatchView` | Video feed for hand histories and live streams | ✅ Ready |

### 2. **Facebook Modules**
Core Facebook features implemented as self-contained modules:

| Module | Components | Description |
|--------|------------|-------------|
| **Messenger** | `ChatDock`, `ChatWindow`, `ConversationList` | Persistent chat windows, real-time messaging, minimization |
| **Notifications** | `NotificationBell`, `NotificationsDropdown` | Real-time alerts, dropdown lists, read tracking |
| **Friends** | `FriendsList`, `FriendCard` | Friend searching, requests, online status sidebar |
| **Reels** | `ReelsCarousel`, `ReelCard` | Short-form video carousel, immersive player |
| **Photos** | `PhotoGrid`, `PhotoLightbox` | Photo albums, grid layouts, lightbox viewer |

### 3. **PokerTierBadge** - Player Reputation
Like Facebook's verified badge, but poker-themed:

| Tier | Icon | Meaning |
|------|------|---------|
| Fish | 🐟 | Still learning |
| Reg | ♠️ | Regular player |
| Grinder | 💪 | Puts in volume |
| Shark | 🦈 | Winning player |
| Whale | 🐋 | High roller |
| GTO Master | 👑 | 85%+ Mastery verified |

### 4. **PokerReactionBar** - Poker Reactions
Instead of Like/Love/Haha, we use poker terminology:

| Reaction | Icon | When to Use |
|----------|------|-------------|
| Fold | 🃏 | "I would have folded" |
| Call | ✋ | "I agree with this" |
| Raise | 🔥 | "Great analysis!" |
| All-In | 💎 | "Best post ever!" |
| Nuts! | 🥜 | "Unbeatable content" |
| Cooler | 🧊 | "That's so unlucky" |

### 5. **PokerFeedCard** - Social Posts
Facebook-style post cards with:
- Hand history embeds (visual cards)
- Session recap stats
- Bad beat stories
- GTO breakdown requests
- Live session indicators

### 6. **PokerStoriesRow** - Stories
Instagram/Facebook Stories with poker themes:
- Session highlights
- Big hand stories
- Bad beat stories
- Streak milestones

---

## 🎯 Post Types

| Type | Icon | Description |
|------|------|-------------|
| Status | 💭 | Regular text update |
| Hand History | 🃏 | Share and analyze a hand |
| Session Recap | 📊 | Daily/weekly stats summary |
| Bad Beat | 💔 | Share an unlucky hand |
| Big Win | 🏆 | Celebrate a major win |
| Question | ❓ | Ask strategy questions |
| GTO Breakdown | 🧠 | Educational content |
| Live Stream | 🔴 | Live session broadcast |

---

## 🏆 Achievement System

### Rarity Tiers
- **Common** (Gray) - Easy to earn
- **Uncommon** (Green) - Some effort required
- **Rare** (Blue) - Notable achievement
- **Epic** (Purple) - Major milestone
- **Legendary** (Gold) - Elite status

### Sample Achievements
| Achievement | Icon | Rarity |
|-------------|------|--------|
| First Hand | 🃏 | Common |
| Winner Winner | 🏆 | Common |
| 3-Day Streak | 🔥 | Uncommon |
| Week Warrior | ⚡ | Rare |
| Royal Flush | 👑 | Legendary |
| Bad Beat Survivor | 💔 | Rare |
| Bluff Master | 🎭 | Epic |
| GTO Certified | 🧠 | Epic |
| Diamond Hands | 💎 | Legendary |

---

## 🎨 Theme Colors

```css
/* Brand */
--primary: #FF6B35;      /* Club Orange */
--secondary: #3B82F6;    /* Action Blue */
--accent: #22C55E;       /* Winner Green */
--danger: #EF4444;       /* Fold Red */

/* Background */
--dark-bg: #0A0F1E;
--card-bg: rgba(18, 24, 38, 0.95);

/* Tier Colors */
--fish: #6B7280;
--reg: #3B82F6;
--grinder: #8B5CF6;
--shark: #EF4444;
--whale: #F59E0B;
--gto-master: #FFD700;
```

---

## 📂 File Structure

```
src/app/social/
├── components/
│   ├── index.js                    # Barrel exports
│   ├── FacebookLayout.jsx          # Main Shell
│   ├── FacebookMessenger.jsx       # Chat Dock & Windows
│   ├── FacebookNotifications.jsx   # Notification Bell & Dropdown
│   ├── FacebookFriends.jsx         # Friends List & Cards
│   ├── FacebookReels.jsx           # Video Components
│   ├── FacebookPhotos.jsx          # Photo Grids
│   ├── FacebookStyleCard.jsx       # Post Cards & Feed Elements
│   └── PokerReputationBadges.jsx   # Tiers & Reactions
├── views/
│   ├── FacebookFeedView.jsx        # Main Feed Page
│   ├── FacebookClubView.jsx        # Clubs/Groups Page
│   ├── FacebookWatchView.jsx       # Video Page
│   └── FacebookProfileView.jsx     # Profile Page
└── hooks/
    └── useSocialFeed.js            # Feed data fetching
```

---

## 🏗️ Build & Integration

### Build Commands
To compile the React Social Hub for production:
```bash
cd ~/Documents/IDENTITY_DNA_ENGINE
npm run build:ui
```
This generates:
- `dist/assets/social-hub-index.js`
- `dist/assets/social-hub-index.css`
- `dist/index.html`

### Sngine Integration
The build artifacts are automatically staged to:
`~/Documents/SmarterSocial/web/content/themes/starter/react-hub/`

**To activate in Sngine:**
1. Include the CSS in the header.
2. Include the JS in the footer.
3. Add `<div id="root"></div>` to the target page template.

---

*Created: 2026-01-12*
*Framework: "Facebook Clone with a Poker Twist"*
