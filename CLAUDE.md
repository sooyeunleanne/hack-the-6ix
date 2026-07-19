# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with this repository.

## Project Overview

**Closet Styling App** — a virtual closet and AI-powered personal styling assistant. Users log their clothing items, get outfit suggestions, virtually "try on" outfit combinations using image processing, and receive sustainability-focused recommendations for underused items.

## Tech Stack

- **Language:** JavaScript (base codebase)
- **AI / External APIs:**
  — **Google Nano Banana API** — image processing: virtual try-on of outfit sets composed from closet items, applied over the user's full-body profile photo
  — **Google Gemini** — outfit suggestions (weather-based, color-based, vibe-based), shopping list suggestions, fashion-trend analysis
  — **ElevenLabs (11Labs)** — voice assistant for conversational fashion advice and item queries

## Core Features

### 1. Closet Logging
- Users log closet items (clothing + accessories: hats, scarves, jewelry, shoes, bags, etc.)
- Each item is tagged with:
  — **Color tags** — colors are analyzed and stored as **hex codes** (e.g. `#FF6B9D`)
  — **Category tags** — e.g. top, bottom, outerwear, shoes, accessory

### 2. User Profile
- On onboarding, the user takes/uploads a **full-body photo** stored in their profile
- This photo is the base image for virtual try-on via Nano Banana

### 3. Virtual Try-On (Nano Banana)
- Compose outfit sets from closet items and render them onto the user's full-body photo
- Also supports trying on **suggested shopping items** (items not yet owned)

### 4. Wear Tracking & Sustainability
- Track **most worn / least worn** items per user
- Closet display ordering: **least worn items shown at the front, most worn at the back** (encourages rotation)
- Least worn items trigger **donate / share recommendations** (sustainability goal)

### 5. Outfit Suggestions (Gemini)
- **Weather-related** suggestions (integrate current weather for the user's location)
- **Color styling** — combinations based on hex-code color analysis of closet items
- **Vibe styling** — style presets such as Cute, Hipster, Y2K, etc.

### 6. Shopping Suggestions (Gemini)
- Suggest items that complement an outfit or fill closet gaps
- Suggested items can be **previewed via virtual try-on** (Nano Banana)
- Informed by **fashion-trend analysis**

### 7. Bookmarks
- Users can bookmark outfits (saved outfit sets) for later

### 8. Voice Assistant (ElevenLabs)
- Talk to the bot to get fashion advice and ask about closet items
- Voice responses generated via ElevenLabs; intelligence backed by Gemini

## Data Model (conceptual)

- **User**: profile info, full-body photo, location (for weather)
- **ClosetItem**: name, category tag, color tags (hex codes), image, wear count, last worn date, `isAccessory` flag
- **Outfit**: set of ClosetItem references (+ optional suggested shop items), vibe tag, bookmarked flag, try-on render image
- **WearLog**: item id, date worn (drives most/least worn stats)
- **ShoppingSuggestion**: suggested item metadata, source outfit, try-on preview

## Key Behaviors & Conventions

- **Colors are always hex codes.** Any color analysis, matching, or styling logic operates on hex values, not color names. Color names may be displayed to users but hex is the source of truth.
- **Accessories are first-class items.** All logic (tagging, wear tracking, suggestions, try-on) must include accessories, not just clothing.
- **Sorting rule:** closet views default to least-worn-first ordering.
- **Sustainability is a product priority:** surfacing least-worn items and donation prompts should not be removed or hidden by UI changes.

## API Integration Notes

- Keep all API keys in environment variables (`.env`), never committed.
- Wrap each external API (Nano Banana, Gemini, ElevenLabs) in its own service module so providers can be swapped or mocked in tests.
- Gemini prompts for outfit suggestions should include: relevant closet items (with hex colors + categories), current weather (when weather-based), and the requested vibe.