# SportBase website

Two pages, no build step, nothing to install. Open `index.html` in a browser
to check it, or upload the folder to get a real address.

## Layout

```
index.html   the landing page
app.html     the web app
css/         site.css, app.css
js/          site.js, app.js
images/      screenshots and icons
sw.js        service worker
```

## Getting it on a real link

The quickest way, with no account juggling and no repository:

1. Go to https://app.netlify.com/drop
2. Drag this `website` folder onto the page.
3. It goes live in a few seconds on a random address.
4. Site settings, then Change site name, gives you `sportbase.netlify.app`.

That address is free and stays free. It is the one to put on a business card
while the apps are still being built.

## Later, on sportbase.ph

Buy the domain from a Philippine registrar for about 1,500 a year and point it
at the same site under Domain management. Only the address in front of the page
changes. A domain also brings a real mailbox, so `hello@sportbase.ph` can
replace a personal Gmail on a public page.

## Editing it

The colours live in the block of custom properties at the top of
`css/site.css`. `--accent` is the orange, and the dark theme repeats the same
names with different values further down.

The booking grid in the hero is hand written example data, and the page says so
underneath it. That is deliberate. A landing page that shows invented venues as
though they were real is the first thing a venue owner will catch.
