# Adding languages

This app currently ships 6 languages: English, French, Spanish, Portuguese, Arabic, Swahili.
They were chosen as a starting set with broad global reach, not as a final list.

**To add another language** (say German):
1. Copy `locales/en.json` to `locales/de.json`.
2. Translate every value (the text on the right of each `:`). Never change the keys on the left -
   those are what the code looks up.
3. In `index.js`: add `import de from './locales/de.json';`, add `de: { translation: de }` to
   `resources`, and add `{ code: 'de', label: 'Deutsch' }` to `SUPPORTED_LANGUAGES`.
4. If it's a right-to-left language (Arabic, Hebrew, Urdu, Farsi, ...), also add its code to
   `RTL_LANGUAGES`.

No screen needs to change - every screen that calls `t('some.key')` picks up the new language
automatically, and it appears in the Settings language picker on its own.

## What's translated right now

Only the Login and Settings screens use `t(...)` so far, as a working example of the pattern.
Every other screen (Home, Admin, Connect, Talent, Chat, etc.) still has hardcoded English text -
those need to be converted the same way: replace each hardcoded string with `t('screenName.key')`,
using `useTranslation()` from `react-i18next`, and add the matching key to every file in `locales/`.
This is mechanical but has to be done screen by screen.

## Before shipping

- Get a native speaker to review each translation file - these were written without a linguist
  reviewing them, and tone/formality conventions vary a lot by language.
- Arabic (and any other RTL language) needs manual layout testing - React Native only *mostly*
  auto-flips layout, and things like icons, swipe directions, and custom-positioned elements often
  need explicit adjustment.
