# Copilot instructions

## Project shape

Órbita is a standalone Spanish-language space-exploration quiz. The whole application lives in `index.html`: markup, CSS, the ten-question data set, and the quiz logic are kept together. It has no package manifest, build step, external runtime dependency, or configured test/lint command.

The page has two main UI states, `#quiz-screen` and `#result-screen`. The quiz state is rendered from the `questions` array by `renderQuestion`; `selectAnswer` locks the current question, updates the score and feedback, and enables the next action. `showResults` derives the final reaction and copy from the score. The restart handler resets the score and question index before rendering the first question.

## Run and verify

- Run the app by opening `index.html` directly in a browser; no server or install step is needed.
- There are no automated test, build, or lint commands configured.
- For a quick single-case check, open the file in a browser, choose one correct answer and one incorrect answer in separate runs, and verify feedback, score, and focus on the next action.
- For a full-flow check, answer all ten questions, verify the final score/reaction and 100% progress, then use “Jugar otra vez” and verify the score and question reset.

## Project-specific conventions

- Keep the page self-contained and dependency-free unless the project scope explicitly changes.
- Keep user-facing copy and question data in Spanish. Add or edit quiz entries in the `questions` array with `question`, four `answers`, a zero-based `correct` index, and a short explanatory `fact`.
- Preserve the current accessible interaction pattern: use native buttons for answers/actions, keep feedback and score changes announced through live regions, maintain the progress bar's ARIA values, associate the answer group with the question text, and move focus to the next meaningful control when advancing or restarting.
- Theme colors come from CSS custom properties in `:root` and `@media (prefers-color-scheme: dark)`. Reuse these tokens for both themes rather than introducing a one-theme-only color.
- Respect `prefers-reduced-motion`; decorative or feedback animation should not require motion and should be suppressed or minimized for users who request reduced motion.
