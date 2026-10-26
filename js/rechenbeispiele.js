/* Rechenbeispiele der Investitionsmodelle – ausschließlich Muster- und Beispielzahlen.
   Einzige Quelle für das Pop-up auf der Seite und für die PDF-Dateien (scripts/build-pdfs.mjs). */
(function (root) {
  'use strict';
  function eur(n) { return (n < 0 ? '−' : '') + Math.abs(Math.round(n)).toLocaleString('de-DE') + ' €'; }
  function pct(n, d) { return n.toLocaleString('de-DE', { minimumFractionDigits: d == null ? 1 : d, maximumFractionDigits: d == null ? 1 : d }) + ' %'; }
  // Zeile: [Bezeichnung, Wert, Art] – Art: '' normal, 'sum' Zwischenergebnis, 'res' Ergebnis
  function row(l, v, k) { return { label: l, value: v, kind: k || '' }; }

  // 1) Buy & Hold
  var bh = { preis: 300000, nk: 0.10, ek: 90000, zins: 0.038, tilg: 0.01, miete: 1250, kost: 0.20 };
  bh.gesamt = bh.preis * (1 + bh.nk);
  bh.dar = bh.gesamt - bh.ek;
  bh.mj = bh.miete * 12;
  bh.k = bh.mj * bh.kost;
  bh.netto = bh.mj - bh.k;
  bh.z = bh.dar * bh.zins;
  bh.t = bh.dar * bh.tilg;
  bh.cf = bh.netto - bh.z - bh.t;

  // 2) Rent-to-Rent mit Kapitalanleger
  var rr = { haupt: 850, unter: 1650, ausl: 0.90, bk: 280, einsatz: 12000, anteil: 0.5 };
  rr.einn = rr.unter * rr.ausl;
  rr.ue = rr.einn - rr.haupt - rr.bk;
  rr.uej = rr.ue * 12;
  rr.inv = rr.uej * rr.anteil;
  rr.amort = rr.einsatz / rr.inv;
  rr.schlecht = (rr.unter * 0.75 - rr.haupt - rr.bk) * 12 * rr.anteil;

  // 3) Projektentwicklung / Aufwertung
  var pe = { kauf: 180000, nk: 0.07, san: 45000, halt: 6000, vk: 275000, vkk: 0.03, erfolg: 0.30 };
  pe.nkE = pe.kauf * pe.nk;
  pe.kosten = pe.kauf + pe.nkE + pe.san + pe.halt;
  pe.verkk = pe.vk * pe.vkk;
  pe.erloes = pe.vk - pe.verkk;
  pe.gewinn = pe.erloes - pe.kosten;
  pe.lev = pe.gewinn * pe.erfolg;
  pe.inv = pe.gewinn - pe.lev;
  pe.schlecht = pe.vk * 0.9 * (1 - pe.vkk) - pe.kosten;

  // 4) Joint Venture
  var jv = { kosten: 600000, dar: 360000, zins: 0.0375, jahre: 2, ekInv: 200000, ekLev: 40000, erloes: 672000, erfolg: 0.20 };
  jv.ek = jv.ekInv + jv.ekLev;
  jv.z = jv.dar * jv.zins * jv.jahre;
  jv.gewinn = jv.erloes - jv.dar - jv.z - jv.ek;
  jv.lev1 = jv.gewinn * jv.erfolg;
  jv.rest = jv.gewinn - jv.lev1;
  jv.invQ = jv.ekInv / jv.ek;
  jv.inv = jv.rest * jv.invQ;
  jv.lev2 = jv.rest - jv.inv;
  jv.schlecht = jv.erloes * 0.9 - jv.dar - jv.z - jv.ek;

  var data = {
    'buy-hold': {
      title: 'Buy & Hold', file: 'rechenbeispiel-buy-and-hold.pdf',
      intro: 'Erwerb einer vermieteten Eigentumswohnung mit Bankfinanzierung und langfristiger Haltedauer.',
      blocks: [
        { h: 'Investition und Finanzierung', rows: [
          row('Kaufpreis', eur(bh.preis)), row('Kaufnebenkosten (' + pct(bh.nk * 100, 0) + ')', eur(bh.preis * bh.nk)),
          row('Gesamtinvestition', eur(bh.gesamt), 'sum'), row('Eigenkapital', eur(bh.ek)), row('Darlehen', eur(bh.dar), 'sum')] },
        { h: 'Laufende Rechnung pro Jahr', rows: [
          row('Kaltmiete (' + eur(bh.miete) + ' pro Monat)', eur(bh.mj)),
          row('Nicht umlagefähige Kosten, Verwaltung, Instandhaltung (' + pct(bh.kost * 100, 0) + ')', '− ' + eur(bh.k).replace('−', '')),
          row('Ertrag vor Finanzierung', eur(bh.netto), 'sum'),
          row('Darlehenszins (' + pct(bh.zins * 100) + ')', '− ' + eur(bh.z)),
          row('Tilgung (' + pct(bh.tilg * 100, 0) + ')', '− ' + eur(bh.t)),
          row('Überschuss nach Zins und Tilgung', eur(bh.cf), 'res')] }
      ],
      scenario: 'Steht die Wohnung einen Monat leer, sinkt der Jahresüberschuss um ' + eur(bh.miete) + ' auf ' + eur(bh.cf - bh.miete) + '.',
      note: 'Nicht enthalten: Steuern, Wertentwicklung der Immobilie, Sonderumlagen. Die Tilgung baut Vermögen auf, ist aber keine Ausgabe im Sinne von Kosten.'
    },
    'rent-to-rent': {
      title: 'Rent-to-Rent mit Kapitalanleger', file: 'rechenbeispiel-rent-to-rent.pdf',
      intro: 'Leventum mietet eine Wohnung, richtet sie möbliert ein und vermietet sie weiter. Der Anleger finanziert die Ausstattung.',
      blocks: [
        { h: 'Einsatz', rows: [row('Kapital des Anlegers für Umbau und Ausstattung', eur(rr.einsatz), 'sum')] },
        { h: 'Monatliche Rechnung', rows: [
          row('Möblierte Untermiete bei Vollauslastung', eur(rr.unter)),
          row('Angenommene Auslastung', pct(rr.ausl * 100, 0)),
          row('Erwartete Einnahmen', eur(rr.einn), 'sum'),
          row('Hauptmiete an den Eigentümer', '− ' + eur(rr.haupt)),
          row('Nebenkosten, Internet, Reinigung, Verwaltung', '− ' + eur(rr.bk)),
          row('Überschuss pro Monat', eur(rr.ue), 'sum')] },
        { h: 'Verteilung pro Jahr', rows: [
          row('Überschuss pro Jahr', eur(rr.uej)),
          row('Anteil Anleger (' + pct(rr.anteil * 100, 0) + ', vertraglich vereinbart)', eur(rr.inv), 'res'),
          row('Anteil Leventum (' + pct((1 - rr.anteil) * 100, 0) + ')', eur(rr.uej - rr.inv)),
          row('Rechnerische Rückflusszeit des Einsatzes', pct(rr.amort, 1).replace(' %', ' Jahre'), 'sum')] }
      ],
      scenario: 'Sinkt die Auslastung auf 75 %, bleiben dem Anleger nur ' + eur(rr.schlecht) + ' pro Jahr.',
      note: 'Nicht enthalten: Steuern, Ersatz der Ausstattung, Leerstand zwischen Mietern. Die Verteilung hängt vom jeweiligen Vertrag ab.'
    },
    'projektentwicklung': {
      title: 'Projektentwicklung und Immobilienaufwertung', file: 'rechenbeispiel-projektentwicklung.pdf',
      intro: 'Kauf einer sanierungsbedürftigen Wohnung, Aufwertung und Verkauf nach rund 12 Monaten.',
      blocks: [
        { h: 'Gesamtkosten', rows: [
          row('Kaufpreis', eur(pe.kauf)), row('Kaufnebenkosten (' + pct(pe.nk * 100, 0) + ')', eur(pe.nkE)),
          row('Sanierung und Aufwertung', eur(pe.san)), row('Finanzierungs- und Haltekosten', eur(pe.halt)),
          row('Gesamtkosten', eur(pe.kosten), 'sum')] },
        { h: 'Verkauf', rows: [
          row('Angenommener Verkaufspreis', eur(pe.vk)), row('Verkaufskosten (' + pct(pe.vkk * 100, 0) + ')', '− ' + eur(pe.verkk)),
          row('Erlös', eur(pe.erloes), 'sum'), row('Gewinn vor Steuern', eur(pe.gewinn), 'sum')] },
        { h: 'Verteilung des Gewinns', rows: [
          row('Erfolgsbeteiligung Leventum (' + pct(pe.erfolg * 100, 0) + ', vertraglich vereinbart)', eur(pe.lev)),
          row('Gewinn des Investors', eur(pe.inv), 'res'),
          row('Bezogen auf die Gesamtkosten', pct(pe.inv / pe.kosten * 100))] }
      ],
      scenario: 'Wird nur 10 % weniger als angenommen erzielt (' + eur(pe.vk * 0.9) + '), ergibt sich ein Ergebnis von ' + eur(pe.schlecht) + ' vor Verteilung.',
      note: 'Nicht enthalten: Steuern, Bauverzögerungen, Kostensteigerungen. Der Verkaufspreis ist nicht vorhersehbar.'
    },
    'joint-venture': {
      title: 'Gemeinsame Projektgesellschaft (Joint Venture)', file: 'rechenbeispiel-joint-venture.pdf',
      intro: 'Investor und Leventum entwickeln gemeinsam ein Projekt über eine Projektgesellschaft mit Bankfinanzierung.',
      blocks: [
        { h: 'Kapital', rows: [
          row('Projektkosten', eur(jv.kosten)), row('Bankdarlehen', eur(jv.dar)),
          row('Eigenkapital Investor', eur(jv.ekInv)), row('Eigenkapital Leventum', eur(jv.ekLev)),
          row('Eigenkapital gesamt', eur(jv.ek), 'sum')] },
        { h: 'Ergebnis nach ' + jv.jahre + ' Jahren', rows: [
          row('Verkaufserlös', eur(jv.erloes)), row('Rückzahlung Darlehen', '− ' + eur(jv.dar)),
          row('Darlehenszinsen (' + pct(jv.zins * 100, 2) + ')', '− ' + eur(jv.z)), row('Rückzahlung Eigenkapital', '− ' + eur(jv.ek)),
          row('Gewinn der Gesellschaft', eur(jv.gewinn), 'sum')] },
        { h: 'Verteilung des Gewinns', rows: [
          row('Erfolgsanteil Leventum vorab (' + pct(jv.erfolg * 100, 0) + ')', eur(jv.lev1)),
          row('Restgewinn nach Kapitalanteil: Leventum (' + pct((1 - jv.invQ) * 100) + ')', eur(jv.lev2)),
          row('Restgewinn nach Kapitalanteil: Investor (' + pct(jv.invQ * 100) + ') = Gewinn des Investors', eur(jv.inv), 'res'),
          row('Bezogen auf sein Eigenkapital', pct(jv.inv / jv.ekInv * 100))] }
      ],
      scenario: 'Wird 10 % weniger verkauft (' + eur(jv.erloes * 0.9) + '), entsteht ein Verlust von ' + eur(-jv.schlecht) + ' – wegen der Bankfinanzierung wirkt sich der Preisrückgang stark auf das Eigenkapital aus.',
      note: 'Nicht enthalten: Steuern, Zeitverzug, Haftungsfragen. Rollen, Beteiligung und Haftung werden vertraglich individuell geregelt.'
    }
  };
  var api = { data: data, order: ['buy-hold', 'rent-to-rent', 'projektentwicklung', 'joint-venture'], disclaimer: 'Muster- und Beispielzahlen. Keine Prognose, keine Zusage von Erträgen und kein Angebot. Tatsächliche Ergebnisse hängen von Objekt, Markt, Finanzierung, Steuern und Vertrag ab und können niedriger ausfallen – bis hin zum Verlust des eingesetzten Kapitals.' };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.LEV_RB = api;
})(typeof window !== 'undefined' ? window : globalThis);
