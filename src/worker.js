import { PDFDocument, StandardFonts, rgb, degrees } from './lib/pdf-lib.esm.min.js';

const FALLBACK_TEMPLATE_TITLE = 'Karta pracy pompy';
const DEFAULT_FILENAME = 'karta-pompy.pdf';
const PHOTO_FRAME_SIZE = 160;
const MARGIN = 40;

const TEST_PAGE_HTML = `<!DOCTYPE html>
<html lang="pl">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Moduł testowy generatora kart pompy</title>
    <style>
      :root {
        color-scheme: only light;
      }
      body {
        margin: 0;
        font-family: 'Segoe UI', Roboto, sans-serif;
        background: #f5f7fb;
        color: #151b2f;
      }
      header {
        background: linear-gradient(135deg, #0c3d91, #1282c3);
        color: #fff;
        padding: 40px 16px 32px;
        box-shadow: 0 2px 8px rgba(8, 35, 68, 0.25);
      }
      header h1 {
        margin: 0 auto;
        max-width: 960px;
        font-size: 2rem;
      }
      header p {
        margin: 12px auto 0;
        max-width: 960px;
        font-size: 1rem;
        line-height: 1.5;
        opacity: 0.85;
      }
      main {
        max-width: 960px;
        margin: 0 auto;
        padding: 32px 16px 64px;
      }
      .layout {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
        gap: 24px;
        align-items: start;
      }
      .panel {
        background: #ffffff;
        border-radius: 18px;
        border: 1px solid rgba(12, 61, 145, 0.08);
        box-shadow: 0 12px 30px rgba(12, 45, 120, 0.08);
        padding: 24px;
      }
      h2 {
        margin-top: 0;
        color: #0c3d91;
        font-size: 1.25rem;
      }
      form {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
      textarea {
        width: 100%;
        min-height: 280px;
        resize: vertical;
        font-family: 'Fira Code', 'SFMono-Regular', ui-monospace, monospace;
        font-size: 0.9rem;
        line-height: 1.4;
        padding: 16px;
        border-radius: 12px;
        border: 1px solid rgba(19, 56, 108, 0.25);
        background: #fdfdff;
        box-shadow: inset 0 1px 3px rgba(15, 36, 72, 0.1);
      }
      textarea:focus {
        outline: none;
        border-color: #1282c3;
        box-shadow: 0 0 0 3px rgba(18, 130, 195, 0.25);
      }
      .controls {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
      }
      button {
        border: none;
        border-radius: 999px;
        padding: 12px 22px;
        font-size: 0.95rem;
        font-weight: 600;
        cursor: pointer;
        transition: transform 0.15s ease, box-shadow 0.15s ease;
      }
      button.primary {
        background: linear-gradient(135deg, #0c3d91, #1282c3);
        color: #fff;
        box-shadow: 0 10px 18px rgba(18, 130, 195, 0.25);
      }
      button.secondary {
        background: #e6eef7;
        color: #0c3d91;
        box-shadow: 0 6px 12px rgba(14, 52, 110, 0.12);
      }
      button:active {
        transform: translateY(1px);
      }
      .status {
        font-weight: 600;
        margin: 8px 0 16px;
        color: #374260;
      }
      .status.error {
        color: #b3261e;
      }
      .status.success {
        color: #1b834d;
      }
      iframe {
        width: 100%;
        min-height: 520px;
        border-radius: 14px;
        border: 1px solid rgba(12, 61, 145, 0.16);
        background: #ffffff;
        box-shadow: inset 0 2px 10px rgba(12, 45, 120, 0.12);
      }
      footer {
        max-width: 960px;
        margin: 32px auto 48px;
        padding: 0 16px;
        font-size: 0.85rem;
        color: rgba(21, 27, 47, 0.6);
      }
      code {
        background: rgba(12, 61, 145, 0.08);
        padding: 2px 6px;
        border-radius: 6px;
        font-size: 0.85rem;
      }
      @media (max-width: 640px) {
        header {
          padding: 32px 16px 28px;
        }
        header h1 {
          font-size: 1.6rem;
        }
        header p {
          font-size: 0.95rem;
        }
      }
    </style>
  </head>
  <body>
    <header>
      <h1>Moduł testowy generatora kart pracy pomp</h1>
      <p>
        Wypełnij przykładowe dane produktu oraz punkty pomiarowe pompy, a następnie wygeneruj PDF.
        Formularz wyśle zapytanie <code>POST</code> do tego samego Workera i wyświetli dokument w podglądzie.
      </p>
    </header>
    <main>
      <section class="layout">
        <article class="panel">
          <h2>Dane wejściowe (JSON)</h2>
          <p>
            Zmień wartości i kliknij <strong>Generuj PDF</strong>. Pola <code>photoUrl</code> oraz <code>templateUrl</code> są opcjonalne.
          </p>
          <form id="pdfForm">
            <textarea id="payload" spellcheck="false" aria-label="Dane wejściowe JSON"></textarea>
            <div class="controls">
              <button class="primary" type="submit">Generuj PDF</button>
              <button class="secondary" type="button" id="resetSample">Przywróć przykład</button>
            </div>
          </form>
        </article>
        <article class="panel">
          <h2>Podgląd PDF</h2>
          <p id="status" class="status">Oczekiwanie na dane…</p>
          <iframe id="viewer" title="Podgląd wygenerowanego PDF"></iframe>
        </article>
      </section>
    </main>
    <footer>
      Przykład zakłada idealne dodawanie wydajności w trybie równoległym pomp (mnożniki x2 i x3) bez zmiany krzywej charakterystyki.
    </footer>
    <script>
      const payloadField = document.getElementById('payload');
      const statusField = document.getElementById('status');
      const viewer = document.getElementById('viewer');
      const resetButton = document.getElementById('resetSample');
      const form = document.getElementById('pdfForm');
      const samplePayload = {
        product: {
          name: 'Pompa Hydro-200',
          model: 'H200',
          description: 'Przykładowa pompa do układów hydroforowych',
        },
        photoUrl: 'https://placekitten.com/640/640',
        pumpData: {
          points: [
            { H: 42, flowM3h: 0 },
            { H: 40, flowM3h: 3.2 },
            { H: 33, flowM3h: 6.5 },
            { H: 27, flowM3h: 9.2 },
            { H: 20, flowM3h: 12.1 },
            { H: 11, flowM3h: 15.4 }
          ]
        },
        metadata: {
          title: 'Karta pracy pompy Hydro-200',
          author: 'Moduł testowy',
        }
      };

      payloadField.value = JSON.stringify(samplePayload, null, 2);

      resetButton.addEventListener('click', () => {
        payloadField.value = JSON.stringify(samplePayload, null, 2);
        payloadField.focus();
        statusField.textContent = 'Przywrócono przykładowe dane.';
        statusField.className = 'status';
        viewer.removeAttribute('src');
      });

      let lastObjectUrl;

      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (lastObjectUrl) {
          URL.revokeObjectURL(lastObjectUrl);
          lastObjectUrl = undefined;
        }
        let payload;
        try {
          payload = JSON.parse(payloadField.value);
        } catch (error) {
          statusField.textContent = 'Błąd: niepoprawny JSON – ' + error.message;
          statusField.className = 'status error';
          viewer.removeAttribute('src');
          return;
        }

        statusField.textContent = 'Generowanie dokumentu…';
        statusField.className = 'status';
        viewer.removeAttribute('src');

        try {
          const endpoint = new URL('/', window.location.href);
          const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });

          if (!response.ok) {
            const message = await response.text();
            statusField.textContent = 'Błąd serwera (' + response.status + '): ' + message;
            statusField.className = 'status error';
            return;
          }

          const blob = await response.blob();
          lastObjectUrl = URL.createObjectURL(blob);
          viewer.src = lastObjectUrl;
          statusField.textContent = 'Dokument wygenerowany pomyślnie.';
          statusField.className = 'status success';
        } catch (error) {
          statusField.textContent = 'Błąd połączenia: ' + error.message;
          statusField.className = 'status error';
        }
      });
    </script>
  </body>
</html>`;

function formatNumber(value, decimals = 1) {
  if (!Number.isFinite(value)) {
    return '-';
  }
  const fixed = value.toFixed(decimals);
  const withoutTrailingZeros = fixed.replace(/\.0+$/, '').replace(/(\.\d*[1-9])0+$/, '$1');
  return withoutTrailingZeros.replace('.', ',');
}

function sanitizeText(value, fallback = '—') {
  if (!value) {
    return fallback;
  }
  return String(value);
}

function safeNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : undefined;
}

function flowToM3h(point) {
  const direct = safeNumber(point.flowM3h ?? point.flow_m3h ?? point.przeplywM3h);
  if (direct !== undefined) {
    return direct;
  }
  const litersPerMinute =
    safeNumber(point.flowLMin ?? point.flowLmin ?? point.flow_l_min ?? point.przeplywLMin) ?? undefined;
  if (litersPerMinute !== undefined) {
    return litersPerMinute * 0.06;
  }
  return undefined;
}

function flowToLMin(point) {
  const direct = safeNumber(point.flowLMin ?? point.flowLmin ?? point.flow_l_min ?? point.przeplywLMin);
  if (direct !== undefined) {
    return direct;
  }
  const m3h = safeNumber(point.flowM3h ?? point.flow_m3h ?? point.przeplywM3h);
  if (m3h !== undefined) {
    return (m3h * 1000) / 60;
  }
  return undefined;
}

function niceStep(range) {
  if (!Number.isFinite(range) || range <= 0) {
    return 1;
  }
  const exponent = Math.floor(Math.log10(range));
  const fraction = range / 10 ** exponent;
  let niceFraction;
  if (fraction <= 1) {
    niceFraction = 1;
  } else if (fraction <= 2) {
    niceFraction = 2;
  } else if (fraction <= 5) {
    niceFraction = 5;
  } else {
    niceFraction = 10;
  }
  return niceFraction * 10 ** exponent;
}

function generateTicks(maxValue, desiredCount = 5) {
  if (!Number.isFinite(maxValue) || maxValue <= 0) {
    return { ticks: [], niceMax: 0, step: 1 };
  }
  const step = niceStep(maxValue / desiredCount);
  const niceMax = Math.ceil(maxValue / step) * step;
  const ticks = [];
  for (let value = 0; value <= niceMax + step * 0.5; value += step) {
    ticks.push({ value, ratio: value / niceMax });
  }
  return { ticks, niceMax, step };
}

async function createFallbackTemplateBytes() {
  const fallbackDoc = await PDFDocument.create();
  const page = fallbackDoc.addPage([595.28, 841.89]);
  const helveticaBold = await fallbackDoc.embedFont(StandardFonts.HelveticaBold);
  const helvetica = await fallbackDoc.embedFont(StandardFonts.Helvetica);

  page.drawText(FALLBACK_TEMPLATE_TITLE, {
    x: MARGIN,
    y: page.getHeight() - MARGIN - 24,
    size: 20,
    font: helveticaBold,
    color: rgb(0.16, 0.2, 0.36),
  });

  page.drawRectangle({
    x: MARGIN,
    y: page.getHeight() - MARGIN - 32,
    width: page.getWidth() - MARGIN * 2,
    height: 2,
    color: rgb(0.76, 0.8, 0.86),
  });

  page.drawText('Szablon domyślny', {
    x: MARGIN,
    y: MARGIN - 10,
    size: 10,
    font: helvetica,
    color: rgb(0.4, 0.4, 0.4),
  });

  return fallbackDoc.save();
}

async function loadTemplateDocument(templateUrl) {
  let templateBytes;
  if (templateUrl) {
    const response = await fetch(templateUrl);
    if (!response.ok) {
      throw new Error('Nie udało się pobrać szablonu PDF');
    }
    templateBytes = await response.arrayBuffer();
  } else {
    templateBytes = await createFallbackTemplateBytes();
  }
  return PDFDocument.load(templateBytes);
}

async function embedProductPhoto(pdfDoc, photoUrl) {
  if (!photoUrl) {
    return undefined;
  }
  const response = await fetch(photoUrl);
  if (!response.ok) {
    throw new Error('Nie udało się pobrać zdjęcia produktu');
  }
  const bytes = await response.arrayBuffer();
  const contentType = (response.headers.get('Content-Type') || '').toLowerCase();
  try {
    if (contentType.includes('png') || photoUrl.toLowerCase().endsWith('.png')) {
      return await pdfDoc.embedPng(bytes);
    }
    return await pdfDoc.embedJpg(bytes);
  } catch (error) {
    // Spróbuj alternatywnego formatu
    if (!contentType.includes('png')) {
      try {
        return await pdfDoc.embedPng(bytes);
      } catch (err) {
        throw error;
      }
    }
    throw error;
  }
}

function mapDataPoints(rawPoints) {
  if (!Array.isArray(rawPoints) || rawPoints.length === 0) {
    throw new Error('Brak punktów pomiarowych pompy');
  }
  const parsed = [];
  rawPoints.forEach((point, index) => {
    const head = safeNumber(point.H ?? point.h ?? point.head ?? point.wysokosc);
    const flowM3h = flowToM3h(point);
    const flowLMin = flowToLMin(point);
    if (!Number.isFinite(head) || head < 0) {
      throw new Error(`Niepoprawna wysokość H w punkcie ${index + 1}`);
    }
    if (flowM3h === undefined) {
      throw new Error(`Niepoprawny przepływ w punkcie ${index + 1}`);
    }
    parsed.push({ head, flowM3h, flowLMin: flowLMin ?? (flowM3h * 1000) / 60 });
  });
  parsed.sort((a, b) => a.flowM3h - b.flowM3h);
  return parsed;
}

function drawGridAndAxes({
  page,
  chartArea,
  axisFont,
  axisFontSize,
  axisColor,
  gridColor,
  flowTicks,
  headTicks,
  flowMax,
  headMax,
}) {
  const origin = { x: chartArea.x, y: chartArea.y };
  const xEnd = chartArea.x + chartArea.width;
  const yTop = chartArea.y + chartArea.height;

  // Obrys wykresu
  page.drawRectangle({
    x: chartArea.x,
    y: chartArea.y,
    width: chartArea.width,
    height: chartArea.height,
    borderColor: axisColor,
    borderWidth: 1,
    color: undefined,
  });

  // Linie poziome
  headTicks.ticks.forEach(({ value, ratio }) => {
    const y = origin.y + chartArea.height * ratio;
    const isMainLine = value === 0;
    page.drawLine({
      start: { x: chartArea.x, y },
      end: { x: xEnd, y },
      thickness: isMainLine ? 1.2 : 0.5,
      color: isMainLine ? axisColor : gridColor,
      opacity: 1,
    });
    const label = `${formatNumber(value, 1)} m`;
    page.drawText(label, {
      x: chartArea.x - 40,
      y: y - 4,
      size: axisFontSize,
      font: axisFont,
      color: axisColor,
    });
  });

  // Linie pionowe
  flowTicks.ticks.forEach(({ value, ratio }) => {
    const x = origin.x + chartArea.width * ratio;
    const isMainLine = value === 0;
    page.drawLine({
      start: { x, y: origin.y },
      end: { x, y: yTop },
      thickness: isMainLine ? 1.2 : 0.5,
      color: isMainLine ? axisColor : gridColor,
      opacity: 1,
    });

    const baseLabel = `${formatNumber(value, value < 10 ? 1 : 0)} m³/h`;
    const liters = (value * 1000) / 60;
    const litersLabel = `${formatNumber(liters, liters < 100 ? 1 : 0)} l/min`;
    const multiplierLabel = `x2: ${formatNumber(value * 2, value * 2 < 10 ? 1 : 0)} | x3: ${formatNumber(
      value * 3,
      value * 3 < 10 ? 1 : 0,
    )}`;
    const labelX = x - baseLabel.length * axisFontSize * 0.15;
    page.drawText(baseLabel, {
      x: labelX,
      y: origin.y - 18,
      size: axisFontSize,
      font: axisFont,
      color: axisColor,
    });
    page.drawText(litersLabel, {
      x: labelX,
      y: origin.y - 32,
      size: axisFontSize - 1,
      font: axisFont,
      color: axisColor,
    });
    page.drawText(multiplierLabel, {
      x: labelX,
      y: origin.y - 46,
      size: axisFontSize - 1,
      font: axisFont,
      color: axisColor,
    });
  });

  page.drawText('Wysokość podnoszenia H [m]', {
    x: chartArea.x - 70,
    y: chartArea.y + chartArea.height / 2 - 20,
    size: axisFontSize + 1,
    font: axisFont,
    color: axisColor,
    rotate: degrees(90),
  });

  page.drawText('Wydajność [m³/h] oraz [l/min]', {
    x: chartArea.x + chartArea.width / 2 - 100,
    y: chartArea.y - 64,
    size: axisFontSize + 1,
    font: axisFont,
    color: axisColor,
  });
}

function drawPumpCurve({ page, chartArea, points, flowMax, headMax, curveColor }) {
  const origin = { x: chartArea.x, y: chartArea.y };
  const scaleX = chartArea.width / flowMax;
  const scaleY = chartArea.height / headMax;

  const scaledPoints = points.map((point) => ({
    x: origin.x + point.flowM3h * scaleX,
    y: origin.y + point.head * scaleY,
  }));

  for (let i = 0; i < scaledPoints.length - 1; i += 1) {
    page.drawLine({
      start: scaledPoints[i],
      end: scaledPoints[i + 1],
      thickness: 1.8,
      color: curveColor,
    });
  }

  scaledPoints.forEach((pt) => {
    page.drawCircle({
      x: pt.x,
      y: pt.y,
      size: 3,
      color: curveColor,
    });
  });
}

function drawLegend({ page, chartArea, font, fontSize, curveColor }) {
  const legendX = chartArea.x + chartArea.width - 160;
  const legendY = chartArea.y + chartArea.height + 20;
  page.drawRectangle({
    x: legendX,
    y: legendY - 20,
    width: 150,
    height: 36,
    borderWidth: 0.8,
    borderColor: rgb(0.6, 0.6, 0.6),
    color: rgb(0.98, 0.98, 0.98),
  });

  page.drawLine({
    start: { x: legendX + 12, y: legendY + 10 },
    end: { x: legendX + 48, y: legendY + 10 },
    thickness: 1.6,
    color: curveColor,
  });
  page.drawCircle({ x: legendX + 48, y: legendY + 10, size: 3, color: curveColor });
  page.drawText('Charakterystyka pompy (1 szt.)', {
    x: legendX + 60,
    y: legendY + 4,
    size: fontSize,
    font,
    color: rgb(0.2, 0.2, 0.2),
  });
  page.drawText('x2 i x3: mnożnik przepływu bez zmiany krzywej', {
    x: legendX + 8,
    y: legendY - 10,
    size: fontSize - 1,
    font,
    color: rgb(0.3, 0.3, 0.3),
  });
}

function drawMultipliersNote({ page, chartArea, font }) {
  const note =
    'Przy pracy równoległej zakładamy idealne dodawanie wydajności (x2, x3) przy tej samej krzywej H=f(Q).';
  page.drawText(note, {
    x: chartArea.x,
    y: chartArea.y - 80,
    size: 9,
    font,
    color: rgb(0.25, 0.25, 0.25),
  });
}

async function renderPdf(payload) {
  const { product = {}, photoUrl, pumpData = {}, templateUrl, metadata = {} } = payload || {};
  const points = mapDataPoints(pumpData.points);
  const maxFlow = Math.max(...points.map((p) => p.flowM3h));
  const maxHead = Math.max(...points.map((p) => p.head));

  const flowTicks = generateTicks(maxFlow, 6);
  const headTicks = generateTicks(maxHead, 6);

  const pdfDoc = await loadTemplateDocument(templateUrl);
  const page = pdfDoc.getPages()[0];
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const pageWidth = page.getWidth();
  const pageHeight = page.getHeight();

  const chartBottomMargin = MARGIN + 110;
  let chartHeight = Math.min(340, pageHeight - chartBottomMargin - 200);
  if (chartHeight < 220) {
    chartHeight = Math.max(pageHeight - chartBottomMargin - 160, 200);
  }
  const chartArea = {
    x: MARGIN,
    y: chartBottomMargin,
    width: pageWidth - MARGIN * 2,
    height: chartHeight,
  };

  const titleY = pageHeight - MARGIN - 80;
  page.drawText(sanitizeText(metadata.title ?? 'Karta pracy pompy hydraulicznej'), {
    x: MARGIN,
    y: titleY,
    size: 20,
    font: helveticaBold,
    color: rgb(0.1, 0.1, 0.2),
  });

  const productInfoYStart = titleY - 28;
  const infoLines = [
    `Nazwa produktu: ${sanitizeText(product.name, 'brak danych')}`,
    `Model: ${sanitizeText(product.model, 'brak danych')}`,
    product.description ? `Opis: ${sanitizeText(product.description)}` : null,
  ].filter(Boolean);

  let currentY = productInfoYStart;
  infoLines.forEach((line) => {
    page.drawText(line, {
      x: MARGIN,
      y: currentY,
      size: 12,
      font: helvetica,
      color: rgb(0.15, 0.15, 0.18),
    });
    currentY -= 18;
  });

  const photoX = pageWidth - MARGIN - PHOTO_FRAME_SIZE;
  const photoY = pageHeight - MARGIN - PHOTO_FRAME_SIZE;
  page.drawRectangle({
    x: photoX,
    y: photoY,
    width: PHOTO_FRAME_SIZE,
    height: PHOTO_FRAME_SIZE,
    borderColor: rgb(0.55, 0.55, 0.6),
    borderWidth: 1.2,
    color: rgb(0.98, 0.98, 0.98),
  });
  page.drawText('Zdjęcie produktu 1:1', {
    x: photoX + 10,
    y: photoY - 16,
    size: 10,
    font: helvetica,
    color: rgb(0.3, 0.3, 0.3),
  });

  if (photoUrl) {
    try {
      const embeddedPhoto = await embedProductPhoto(pdfDoc, photoUrl);
      if (embeddedPhoto) {
        const { width, height } = embeddedPhoto;
        const scale = Math.min(PHOTO_FRAME_SIZE / width, PHOTO_FRAME_SIZE / height);
        const scaled = embeddedPhoto.scale(scale);
        const offsetX = photoX + (PHOTO_FRAME_SIZE - scaled.width) / 2;
        const offsetY = photoY + (PHOTO_FRAME_SIZE - scaled.height) / 2;
        page.drawImage(embeddedPhoto, {
          x: offsetX,
          y: offsetY,
          width: scaled.width,
          height: scaled.height,
        });
      }
    } catch (error) {
      page.drawText('Błąd podczas ładowania zdjęcia', {
        x: photoX + 8,
        y: photoY + PHOTO_FRAME_SIZE / 2,
        size: 10,
        font: helvetica,
        color: rgb(0.8, 0.1, 0.1),
      });
    }
  }

  drawGridAndAxes({
    page,
    chartArea,
    axisFont: helvetica,
    axisFontSize: 10,
    axisColor: rgb(0.2, 0.2, 0.2),
    gridColor: rgb(0.75, 0.75, 0.75),
    flowTicks,
    headTicks,
    flowMax: flowTicks.niceMax,
    headMax: headTicks.niceMax,
  });

  drawPumpCurve({
    page,
    chartArea,
    points,
    flowMax: flowTicks.niceMax || maxFlow,
    headMax: headTicks.niceMax || maxHead,
    curveColor: rgb(0.02, 0.42, 0.65),
  });

  drawLegend({
    page,
    chartArea,
    font: helvetica,
    fontSize: 9,
    curveColor: rgb(0.02, 0.42, 0.65),
  });

  drawMultipliersNote({ page, chartArea, font: helvetica });

  const tableYStart = chartArea.y + chartArea.height + 60;
  page.drawText('Zestawienie wybranych punktów pracy:', {
    x: MARGIN,
    y: tableYStart,
    size: 12,
    font: helveticaBold,
    color: rgb(0.15, 0.15, 0.18),
  });

  const tableFontSize = 10;
  const columnX = [MARGIN, MARGIN + 140, MARGIN + 280, MARGIN + 420];
  const headerY = tableYStart - 18;
  const headers = ['H [m]', 'Q [m³/h]', 'Q [l/min]', 'Uwagi'];

  headers.forEach((header, idx) => {
    page.drawText(header, {
      x: columnX[idx],
      y: headerY,
      size: tableFontSize,
      font: helveticaBold,
      color: rgb(0.2, 0.2, 0.2),
    });
  });

  let rowY = headerY - 16;
  points.slice(0, 6).forEach((point) => {
    const cells = [
      formatNumber(point.head, 1),
      formatNumber(point.flowM3h, point.flowM3h < 10 ? 1 : 0),
      formatNumber(point.flowLMin, point.flowLMin < 100 ? 1 : 0),
      '',
    ];
    cells.forEach((cell, idx) => {
      page.drawText(cell, {
        x: columnX[idx],
        y: rowY,
        size: tableFontSize,
        font: helvetica,
        color: rgb(0.2, 0.2, 0.2),
      });
    });
    rowY -= 16;
  });

  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
}

async function handleRequest(request) {
  const url = new URL(request.url);
  const normalizedPath = url.pathname.replace(/\/+$/, '') || '/';

  if (request.method === 'GET' || request.method === 'HEAD') {
    if (normalizedPath === '/test') {
      return new Response(request.method === 'HEAD' ? null : TEST_PAGE_HTML, {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=UTF-8',
          'Cache-Control': 'no-store',
        },
      });
    }

    if (normalizedPath === '/') {
      const body =
        'Ten Worker generuje karty PDF dla pomp. Wyślij żądanie POST z danymi lub odwiedź /test, aby skorzystać z modułu podglądu.';
      return new Response(request.method === 'HEAD' ? null : body, {
        status: 200,
        headers: {
          'Content-Type': 'text/plain; charset=UTF-8',
          'Cache-Control': 'no-store',
        },
      });
    }

    return new Response(request.method === 'HEAD' ? null : 'Nie znaleziono zasobu.', {
      status: 404,
      headers: {
        'Content-Type': 'text/plain; charset=UTF-8',
        'Cache-Control': 'no-store',
      },
    });
  }

  if (request.method !== 'POST') {
    return new Response('Do wygenerowania PDF użyj metody POST.', {
      status: 405,
      headers: {
        Allow: 'GET, HEAD, POST',
        'Content-Type': 'text/plain; charset=UTF-8',
      },
    });
  }

  let payload;
  try {
    payload = await request.json();
  } catch (error) {
    return new Response('Nieprawidłowe dane wejściowe (JSON).', {
      status: 400,
      headers: { 'Content-Type': 'text/plain; charset=UTF-8' },
    });
  }

  try {
    const pdfBytes = await renderPdf(payload);
    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${DEFAULT_FILENAME}"`,
      },
    });
  } catch (error) {
    return new Response(`Błąd generowania PDF: ${error.message}`, {
      status: 400,
      headers: { 'Content-Type': 'text/plain; charset=UTF-8' },
    });
  }
}

export default {
  async fetch(request, env, ctx) {
    return handleRequest(request, env, ctx);
  },
};
