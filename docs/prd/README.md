# PRD balíček – nové funkce Sparr

Tato složka obsahuje separátní PRD dokumenty pro nové funkce požadované v projektu.

## Dokumenty
- [PRD-01-klubove-profily.md](./PRD-01-klubove-profily.md)
- [PRD-02-gamifikace.md](./PRD-02-gamifikace.md)
- [PRD-03-backend-pro-nove-funkce.md](./PRD-03-backend-pro-nove-funkce.md)

## Kontext pro implementaci
- UI/UX referenční návrhy: `REFERENCE.html` (části Calendar, Technique, Profile, Club Profile, Discovery, Conversations).
- Datový model: `DATABASE_SCHEMA.sql`.
- Stávající architektura: `backend` (Express + PostgreSQL), `frontend` (Expo React Native).

## Důležitá poznámka k databázi
Implementační tým může dělat **lehké změny schématu** v PostgreSQL. Každá změna musí být zapsaná do samostatného `.sql` migračního souboru (např. `backend/sql/migrations/2026-xx-xx_<nazev>.sql`), který následně provedete ručně přes SQL editor.

## Definice „lehké změny“
- přidání tabulky pro žádosti/stav (např. join requesty),
- přidání sloupců/indexů/constraintů,
- přidání enum hodnot,
- bez destruktivních změn existujících produkčních dat bez migrační strategie.
