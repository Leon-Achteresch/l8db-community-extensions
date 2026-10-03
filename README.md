# l8db Community-Extensions

Offener Katalog für l8db-Extensions aus der Community. Jede und jeder kann per Pull Request eine Extension veröffentlichen oder aktualisieren, ähnlich wie bei `winget-pkgs`. l8db zeigt den Katalog unter **Einstellungen → Erweiterungen → Community**, prüft jedes Paket vor der Installation per SHA-256 und installiert es deaktiviert. Berechtigungen werden erst beim Aktivieren erteilt.

Offizielle Extensions liegen in [l8db-extension-market](https://github.com/Leon-Achteresch/l8db-extension-market).

## Extension einreichen

1. Extension mit dem SDK aus dem [l8db-Repository](https://github.com/Leon-Achteresch/l8db) bauen:
   ```sh
   git clone https://github.com/Leon-Achteresch/l8db && cd l8db && bun install
   bun run extension pack <ordner> <id>-<version>.l8db-extension
   ```
2. Dieses Repository forken und die Datei nach `packages/<id>-<version>.l8db-extension` legen.
3. Pull Request gegen `main` öffnen und die Vorlage ausfüllen, inklusive Link zum öffentlichen Quellcode.

Der Check `validate` prüft automatisch:

- Der Pull Request fügt ausschließlich neue Dateien unter `packages/` hinzu. Bestehende Pakete sind unveränderlich.
- Das Paket ist gültig (gleiche Prüfung wie in l8db), höchstens 8 MiB groß, und der Dateiname entspricht ID und Version aus dem Manifest.
- `publisher` ist dein GitHub-Benutzername in Kleinbuchstaben, die ID lautet also `<benutzername>.<name>`. So kann nur der Herausgeber selbst Updates einreichen. `l8db` ist reserviert.
- Die Version ist höher als jede bereits veröffentlichte Version dieser ID.
- Das Manifest enthält eine `description` (max. 1000 Zeichen), der Name hat höchstens 120 Zeichen.

Danach prüft ein Maintainer Quellcode, Berechtigungen und Netzwerk-Hosts. Nach dem Merge baut der Workflow `Publish` den Katalog neu.

## Aufbau

- `packages/` enthält alle eingereichten Pakete, auch ältere Versionen.
- Der Branch `catalog` wird automatisch erzeugt und enthält `catalog.json` (jeweils neueste Version pro ID) und `packages/`. l8db lädt `https://raw.githubusercontent.com/Leon-Achteresch/l8db-community-extensions/catalog/catalog.json`.
- `scripts/market.ts` prüft Pull Requests (`check`) und erzeugt den Katalog (`catalog`). Es nutzt die Validierung aus dem `main`-Branch von l8db, die die Workflows nach `l8db/` auschecken.

## Extension entfernen

Issue öffnen oder Pull Request mit Begründung stellen. Entfernungen und Sicherheitsmeldungen bearbeitet ein Maintainer manuell.
