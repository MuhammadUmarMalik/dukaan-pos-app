# 0005: Manual right-to-left and paired strings

Status: accepted

**Context.** The app is English and Urdu. `I18nManager.forceRTL` needs an app restart on native and does not exist on web.

**Decision.** Layout direction is handled by our own components (`Row`, `Text`, `Icon flip`) driven by the language setting, so switching language is instant. Strings are written as pairs, `t('Home', 'ہوم')`, next to the code that uses them, so a missing translation is visible in review. No translation files until a third language is needed.

**Consequences.** Never hard-code `left` or `right`; use `start` and `end`. Digits and codes stay Latin, left to right. If more languages arrive, move to a message catalog.
