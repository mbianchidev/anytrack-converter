# Accessibility

AnyTrack Converter targets **WCAG 2.2 Level AA** for its web interface and documentation. This is a contribution goal, not a claim of certification or complete conformance.

## Interface requirements

- Use native buttons, inputs, labels, radio groups, checkboxes, and audio controls. Keep every control named and keyboard-operable.
- Keep a logical Tab order, visible focus in both themes, and a skip link to the main content. Avoid keyboard traps and positive `tabIndex` values.
- Announce request results through the status region. Expose expanded and pressed states and identify progress as approximate, not measured processing progress.
- Meet 4.5:1 contrast for normal text and 3:1 for large text and necessary control boundaries. Check input placeholders, hover, focus, success, and error states separately in light and dark themes.
- Convey state through text or native control state, not color alone.
- Support narrow layouts and zoom/reflow without hiding essential controls. Keep touch targets usable and honor reduced-motion preferences.
- Give screenshots useful alt text and textual context. Use synthetic media, not personal recordings, in documentation and tests.

## Verification

Follow the [developer accessibility checks](docs/development.md#accessibility-checks), including keyboard-only operation, both themes, narrow layouts, contrast measurements, and screen-reader verification. Existing lint/build checks do not certify accessibility.

## Known limitations

- Progress percentages are simulated, and are described as approximate.
- Audio playback support depends on the browser and output codec; download remains available when preview is unsupported.
- Native media/file controls vary by browser and operating system.
- A full assistive-technology audit across browsers and screen readers has not been completed. Report the browser, operating system, affected workflow, and assistive technology when relevant.

## Reporting barriers

Use the existing [issue tracker](https://github.com/mbianchidev/anytrack-converter/issues) for accessibility barriers, with reproduction steps and expected behavior. Do not include personal media or sensitive data. Report security concerns privately using [SECURITY.md](SECURITY.md).
