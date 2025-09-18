# Generator kart PDF dla pomp hydraulicznych

Cloudflare Worker, który generuje kartę katalogową w formacie PDF na podstawie danych
przekazanych w zapytaniu HTTP. Dokument wykorzystuje szablon A4 (pobierany z zadanego
adresu URL lub tworzony tymczasowo) i umieszcza w nim dane produktu, zdjęcie oraz
wykres charakterystyki pompy z możliwością przedstawienia mnożników x2 i x3.

## Struktura projektu

codex/create-pdf-generation-in-cloudflare-worker-hxcotf
- `src/index.ts` – punkt wejścia Workera deklarowany w `wrangler.jsonc`.
- `src/worker.js` – logika Workera odpowiedzialna za renderowanie PDF.
- `wrangler.jsonc` – konfiguracja Wranglera z nazwą projektu oraz datą kompatybilności.
- `package.json` – zależność `pdf-lib`, brak dodatkowych kroków buildowania.

## Uruchomienie lokalne

1. Zainstaluj zależności:

   ```bash
   npm install
   ```

2. Wdróż Workera przy użyciu [Wranglera](https://developers.cloudflare.com/workers/wrangler/) lub
   skorzystaj z trybu developerskiego:

   ```bash
   npx wrangler dev
   ```

codex/create-pdf-generation-in-cloudflare-worker-hxcotf
3. Aby wdrożyć rozwiązanie do środowiska produkcyjnego Cloudflare, uruchom:

   ```bash
   npx wrangler deploy
   ```

   Domyślny punkt wejścia (`src/index.ts`) eksportuje funkcję `fetch`, która przekazuje obsługę
   żądania do logiki z pliku `src/worker.js`, dzięki czemu projekt działa zarówno lokalnie, jak i
   po wdrożeniu na platformie Cloudflare Workers.

## Format żądania

Worker przyjmuje zapytanie `POST` z ładunkiem JSON:

```json
{
  "templateUrl": "https://example.com/szablon.pdf",
  "product": {
    "name": "Pompa Hydro 2000",
    "model": "HX-2000",
    "description": "Zastosowanie przemysłowe"
  },
  "photoUrl": "https://example.com/pompa.jpg",
  "pumpData": {
    "points": [
      { "H": 30, "flowM3h": 5.2 },
      { "H": 26, "flowM3h": 8.1 },
      { "H": 20, "flowLMin": 200 }
    ]
  },
  "metadata": {
    "title": "Charakterystyka pracy pompy HX-2000"
  }
}
```

### Wymagane pola

- `pumpData.points` – co najmniej dwa punkty pomiarowe. Każdy punkt powinien zawierać
  wysokość `H` (w metrach) oraz przepływ (`flowM3h` w m³/h lub `flowLMin` w l/min).

### Pola opcjonalne

- `templateUrl` – adres PDF, który ma zostać użyty jako szablon (nagłówek i stopka).
  Jeżeli pole nie zostanie podane, Worker wygeneruje prosty szablon zastępczy A4.
- `photoUrl` – adres obrazu (PNG lub JPEG). Zdjęcie zostanie umieszczone w ramce 1:1.
- `product` – dane opisowe produktu (nazwa, model, opis).
- `metadata.title` – tytuł umieszczany nad wykresem.

## Wynik

Odpowiedź to plik PDF (`Content-Type: application/pdf`) zawierający:

- miejsce na nazwę i model produktu,
- ramkę 1:1 na zdjęcie produktu,
- wykres zależności wysokości podnoszenia `H` od wydajności `Q` z opisami w języku polskim,
- dodatkowe oznaczenia dla pracy wielu pomp (mnożniki x2 i x3),
- tabelę z wybranymi punktami pracy.

PDF można pobrać lub wydrukować bezpośrednio z przeglądarki.
