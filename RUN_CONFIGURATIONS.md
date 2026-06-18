# Run Configurations — IntelliJ IDEA

## What is a Run Configuration?

Think of a **run configuration** like a saved shortcut for a command you want to run.
Instead of opening a terminal and typing `npm test` every time, you click a button in
IntelliJ and it does it for you — with the right settings already filled in.

This project ships six ready-made configurations stored in
`.idea/runConfigurations/`. IntelliJ reads these XML files automatically when you
open the project, so the buttons appear straight away with no setup needed.

---

## How to Use Them

1. Open the project in IntelliJ IDEA.
2. Look at the **toolbar** near the top-right of the window.
3. Click the **dropdown** that shows a configuration name (it might say "Add Configuration…" the first time).
4. Pick any configuration from the list.
5. Click the **green ▶ Run button** (or press `Shift + F10`).

That's it. Output appears in the **Run** panel at the bottom of the screen.

> **Tip — running from the menu:**  
> `Run` → `Run…` → pick a configuration name → Enter

---

## The Six Configurations

### 1. `npm: test` — Run All Tests

**File:** `.idea/runConfigurations/Test.xml`  
**Command it runs:** `npm test` → `jest`

Runs every test file in the `tests/` folder once and shows you a pass/fail
summary. This is the one you'll use most often — run it after making any code change
to check you haven't broken anything.

```
✓ returns 1 for first Monday of 2023
✓ 2026 has 53 weeks
✓ ... (140 tests)
```

---

### 2. `npm: test:watch` — Tests in Watch Mode

**File:** `.idea/runConfigurations/Test_Watch.xml`  
**Command it runs:** `npm run test:watch` → `jest --watch --verbose`

Same as above, but **stays running** in the background. Every time you save a
`.js` file, Jest automatically re-runs the relevant tests. Great when you are
actively writing code and want instant feedback without clicking Run again and
again.

Press `q` in the Run panel to stop it.

---

### 3. `npm: test:coverage` — Coverage Report

**File:** `.idea/runConfigurations/Test_Coverage.xml`  
**Command it runs:** `npm run test:coverage` → `jest --coverage`

Runs all tests **and** measures which lines of code were actually executed during
the tests. Produces a summary table in the Run panel and a full HTML report inside
`coverage/lcov-report/index.html` (open that file in a browser for a colour-coded
line-by-line view).

```
---------|---------|----------|---------|---------|
File     | % Stmts | % Branch | % Funcs | % Lines |
---------|---------|----------|---------|---------|
All files|   100   |   100    |   100   |   100   |
---------|---------|----------|---------|---------|
```

---

### 4. `npm: validate` — Full CI Gate

**File:** `.idea/runConfigurations/Validate.xml`  
**Command it runs:** `npm run validate` → version check + `eslint .` + `jest`

Runs the exact gate CI runs: confirms `manifest.json` and `package.json` agree
on the version, lints, and runs all tests. Use this before committing or pushing.

```
✅ Version check passed.
   eslint .
   Tests: 140 passed
```

---

### 5. `npm: build` — Package Chrome + Edge zips

**File:** `.idea/runConfigurations/Build.xml`  
**Command it runs:** `npm run build` → `./build.sh`

There is **no compilation step** (the browser loads raw `.js`). "build" packages
the raw source into store-ready zips under `build/chrome/` and `build/edge/`,
each with `manifest.json` at the zip root. Run `npm run validate` for the
test/lint gate.

---

### 6. `npm: package:chrome` — Package the Extension

**File:** `.idea/runConfigurations/Package.xml`  
**Command it runs:** `npm run package:chrome` (→ `./build.sh chrome`)

Reads the `version` from `manifest.json` and creates a store-ready zip under
`build/chrome/` with `manifest.json` at the zip root:

```
build/chrome/week-number-v1.10-chrome.zip   ← ignored by .gitignore (build/, *.zip)
  ├── manifest.json
  ├── background.js
  ├── popup/
  │   ├── popup.html
  │   ├── popup.js
  │   └── popup.css
  ├── options/
  │   ├── options.html
  │   ├── options.js
  │   └── options.css
  └── icons/
      ├── icon48.png
      └── icon128.png
```

`./build.sh chrome edge` (or `npm run build`) produces both the Chrome and Edge
zips at once under `build/<store>/`. When you bump the version in
`manifest.json`, the filename tracks it automatically.

You can upload this zip by hand at the
[Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole),
but the normal path is the automated **Release (Chrome + Edge)** GitHub Actions
workflow — see `DOCUMENTATION/RELEASE.md`.

> **Note:** `tests/`, `node_modules/`, and other development-only files are
> intentionally excluded from the zip — Chrome doesn't need them.

---

## What are the XML Files?

Each configuration is stored as a small XML file in `.idea/runConfigurations/`.
Here is what one looks like and what each line means:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<component name="ProjectRunConfigurationManager">   <!-- IntelliJ container tag -->
  <configuration
    default="false"                  <!-- not a template, this is a real config -->
    name="npm: test"                 <!-- the name shown in the IntelliJ dropdown -->
    type="js.build_tools.npm"        <!-- tells IntelliJ this is an npm config -->
    factoryName="npm">               <!-- the plugin that handles it -->

    <package-json value="$PROJECT_DIR$/package.json" />   <!-- where package.json lives -->
    <command value="run" />          <!-- equivalent to typing: npm run ... -->
    <scripts>
      <script value="test" />        <!-- the script name from package.json -->
    </scripts>
    <node-interpreter value="project" />   <!-- uses the Node.js version the project prefers -->
    <envs />                         <!-- no extra environment variables needed -->
    <method v="2" />                 <!-- IntelliJ internal versioning, leave as-is -->
  </configuration>
</component>
```

You never need to edit these files by hand. If you want to change a configuration,
use IntelliJ's **Edit Configurations…** dialog (`Run` → `Edit Configurations…`)
and IntelliJ will update the XML automatically.

---

## The npm Scripts (package.json)

The XML files are just launchers — the actual commands live in `package.json`:

| Script                   | What it runs                                                           |
| ------------------------ | ---------------------------------------------------------------------- |
| `npm test`               | `jest` — run all tests once                                            |
| `npm run test:watch`     | `jest --watch --verbose` — re-run tests on save                        |
| `npm run test:coverage`  | `jest --coverage` — tests + coverage report                            |
| `npm run validate`       | version check + lint + tests — the full CI gate                        |
| `npm run lint`           | `eslint .`                                                             |
| `npm run build`          | `./build.sh` — packages Chrome + Edge zips under `build/`              |
| `npm run package:chrome` | `./build.sh chrome` → `build/chrome/week-number-v<version>-chrome.zip` |

You can run any of these directly in a terminal too — the IntelliJ configurations
are just a convenient shortcut to avoid typing them out.
