---
title: "How I Built This Site"
date: 2026-03-02
tags: [engineering, design]
---

A quick look at how this site works under the hood.

## Stack

- **Jekyll** for static site generation and blogging, built natively by GitHub Pages
- **Vanilla CSS** with `backdrop-filter` for the glass panels — no framework needed
- **Vanilla JS** for theme switching, filtering, and small interactions

## The "liquid glass" look

The core trick is layering translucent, blurred panels over a softly animated gradient background. Each `.glass` element uses `backdrop-filter: blur()` plus a subtle border highlight to catch the light, and a radial spotlight follows the cursor on hover.

More write-ups to come as the site evolves.
