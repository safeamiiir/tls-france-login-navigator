# TLS France Login Navigator

A Chrome extension (Manifest V3) that streamlines booking a France visa appointment on
[TLScontact](https://visas-fr.tlscontact.com/) for the **United Kingdom – London (Wandsworth)**
visa centre (`gbLON2fr`). It drives the repetitive click-through after login and can
auto-refresh the page at randomised intervals while you wait for appointment slots to appear.

> [!IMPORTANT]
> This is an unofficial personal tool, not affiliated with TLScontact or the French
> government. It only automates clicks **you** would otherwise make in your own browser and
> never bypasses login, captcha, or payment. Use it responsibly and at your own risk, in
> line with the website's terms of service.

## Features

- **One-button guided booking** — navigates to the appointment page, and if you're logged
  out, takes you to the login screen and clicks **LOG IN** for you.
- **Survives login/captcha** — a background service worker watches the tab and continues the
  flow (select travel group → open appointment booking) even after the popup is closed.
- **Randomised auto-refresh** — reloads the TLS tab on a random interval picked from a pool
  of minutes you choose (1–10), to keep checking for newly released slots. Backed by
  `chrome.alarms`, so it keeps running while the popup is shut.
- **Live status** — a status indicator and countdown show what the extension is doing.

## How the booking flow works

When you click **Book an appointment**, the extension:

1. Navigates the active tab to the appointment-booking URL.
2. If you're already logged in, it stops there — you're ready to book.
3. If you're logged out, TLS redirects to the login page; the extension clicks **LOG IN**
   and waits for you to complete your credentials and captcha.
4. Once you land on the **travel groups** page, it selects your group and continues to the
   **service level** page, then opens **appointment booking**.

The popup drives this while open; the background worker drives it via tab-navigation events
while the popup is closed. Both update a shared state in `chrome.storage.local`, and each
step advances the stored phase *before* acting so the two drivers never double-click.

## Installation

This extension is not on the Chrome Web Store — load it unpacked:

1. Clone or download this repository.
2. Open `chrome://extensions/`.
3. Enable **Developer mode** (top-right toggle).
4. Click **Load unpacked** and select the project folder.

## Usage

1. Open the TLS France appointment site for UK/London:
   <https://visas-fr.tlscontact.com/en-us/country/gb/vac/gbLON2fr>
2. Click the extension icon in the toolbar.
3. **Book an appointment** — runs the guided flow above. Click again to **Cancel** while it
   is watching for login.
4. **Random refresh** — tick the minute chips you want in the pool, then **Start random
   refresh**. The extension reloads the tab after a random interval from your pool each
   cycle (select a single chip for a fixed interval). Click **Stop** to end it.

## Configuration

The London visa centre, account, and travel-group are currently hard-coded across
`background.js`, `popup.js`, and `content.js`. To target a different centre or account,
update these constants (they appear in more than one file — change all matching copies):

| Constant | Meaning |
| --- | --- |
| `LOGIN_PAGE_URL` | Country/centre login landing page |
| `TRAVEL_GROUPS_URL` | Travel-groups page |
| `SERVICE_LEVEL_URL` | Service-level page (contains the group id) |
| `APPOINTMENT_BOOKING_URL` | Final appointment-booking page |
| `formGroupId` value `27133387` | The travel-group id clicked in `content.js` |

The refresh interval pool's available values are the chips in `popup.html`; the default
pool (the pre-selected chips) is 2–6 minutes.

## Project structure

```
.
├── manifest.json     # Extension manifest (MV3)
├── popup.html        # Popup UI
├── popup.js          # Popup logic: booking flow + refresh controls
├── content.js        # Injected script: finds and clicks page buttons
├── background.js     # Service worker: alarms (refresh) + tab-watch booking driver
├── styles.css        # Popup styling
└── images/           # Extension icons (16/48/128)
```

## Permissions

| Permission | Why |
| --- | --- |
| `scripting` | Inject `content.js` to click page elements |
| `activeTab` / `tabs` | Read the active tab's URL and navigate/reload it |
| `alarms` | Schedule the next randomised refresh |
| `storage` | Persist refresh and booking-flow state across popup opens |
| host: `visas-fr.tlscontact.com` | The extension only operates on the TLS France site |

No data leaves your browser; the extension makes no external network requests.

## Troubleshooting

- **"Please open the TLS France website first"** — open a `visas-fr.tlscontact.com` tab
  before starting a random refresh.
- **Flow stalls after login** — the site's page structure or selectors may have changed.
  Open DevTools (F12) → Console for messages, then update the selectors in `content.js`.
- **Nothing happens after a code change** — reload the extension from `chrome://extensions/`.

## License

[MIT](LICENSE)
