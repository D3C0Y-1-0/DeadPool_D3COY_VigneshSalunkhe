import { jsPDF } from "jspdf";
import { Incident } from "../types";

export interface PdfReportEntry {
  label: string;
  value: unknown;
}

export interface PdfReportSection {
  title: string;
  entries: PdfReportEntry[];
}

function printableText(value: unknown) {
  if (value == null || value === "") return "Not recorded";
  const text = typeof value === "string" ? value : String(value);
  return text.replace(/\r\n?/g, "\n").replace(/[^\x09\x0A\x20-\xFF]/g, "?");
}

function formatUtc(value?: string) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : value;
}

export function downloadPdfReport(
  title: string,
  subtitle: string,
  filename: string,
  sections: PdfReportSection[],
) {
  const pdf = new jsPDF({ format: "a4", unit: "mm" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 16;
  const contentWidth = pageWidth - margin * 2;
  const bottom = pageHeight - 18;
  let y = 0;
  let pageNumber = 0;

  const addPage = () => {
    if (pageNumber > 0) pdf.addPage();
    pageNumber += 1;
    pdf.setFillColor(8, 12, 20);
    pdf.rect(0, 0, pageWidth, 14, "F");
    pdf.setTextColor(255, 255, 255);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8);
    pdf.text("MIRAGE  /  SOC INTELLIGENCE", margin, 9);
    pdf.setTextColor(102, 112, 133);
    pdf.setDrawColor(220, 224, 231);
    pdf.line(margin, 17, pageWidth - margin, 17);
    y = 24;
  };

  const ensureSpace = (height: number) => {
    if (y + height > bottom) addPage();
  };

  addPage();
  pdf.setTextColor(22, 27, 38);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(19);
  const titleLines = pdf.splitTextToSize(printableText(title), contentWidth);
  pdf.text(titleLines, margin, y);
  y += titleLines.length * 8 + 2;

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.setTextColor(81, 91, 109);
  const subtitleLines = pdf.splitTextToSize(printableText(subtitle), contentWidth);
  pdf.text(subtitleLines, margin, y);
  y += subtitleLines.length * 4.5 + 2;
  pdf.setFontSize(8);
  pdf.text(`Generated ${new Date().toISOString()} · Evidence source: MIRAGE API`, margin, y);
  y += 9;

  sections.forEach((section) => {
    ensureSpace(13);
    pdf.setFillColor(238, 241, 246);
    pdf.roundedRect(margin, y - 4, contentWidth, 8, 1.5, 1.5, "F");
    pdf.setTextColor(22, 27, 38);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9);
    pdf.text(printableText(section.title), margin + 3, y + 1.5);
    y += 9;

    const entries = section.entries.length
      ? section.entries
      : [{ label: "Evidence", value: "No records returned." }];
    entries.forEach((entry) => {
      const label = printableText(entry.label);
      const value = printableText(entry.value);
      const lines = value.split("\n").flatMap((line) => pdf.splitTextToSize(line || " ", contentWidth));
      ensureSpace(10);
      pdf.setTextColor(103, 113, 130);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(7);
      pdf.text(label.toUpperCase(), margin, y);
      y += 3.5;

      pdf.setTextColor(34, 41, 54);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8.5);
      lines.forEach((line) => {
        ensureSpace(4.5);
        pdf.text(line, margin, y);
        y += 4.2;
      });
      y += 2;
    });
    y += 2;
  });

  const pageCount = pdf.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    pdf.setPage(page);
    pdf.setDrawColor(220, 224, 231);
    pdf.line(margin, pageHeight - 13, pageWidth - margin, pageHeight - 13);
    pdf.setTextColor(115, 123, 138);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7);
    pdf.text("MIRAGE deception-lab telemetry · Synthetic environment", margin, pageHeight - 8);
    pdf.text(`Page ${page} of ${pageCount}`, pageWidth - margin, pageHeight - 8, { align: "right" });
  }

  const blobUrl = URL.createObjectURL(pdf.output("blob"));
  const link = document.createElement("a");
  link.href = blobUrl;
  link.download = `${filename.replace(/[^a-zA-Z0-9._-]/g, "-")}.pdf`;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
}

export function downloadIncidentPdf(incident: Incident) {
  const techniques = (incident.techniques ?? []).map(
    (item) => `${item.id} - ${item.name} (${item.tactic})`,
  );
  const events = [...(incident.timeline ?? [])]
    .sort((a, b) => Date.parse(a.ts) - Date.parse(b.ts))
    .map((event) => ({
      label: `${formatUtc(event.ts)} | ${event.sensor} | ${event.zone}`,
      value: [
        `${event.action} · ${event.outcome}`,
        event.summary,
        event.stage ? `Stage: ${event.stage}` : "",
        event.techniques?.length ? `Techniques: ${event.techniques.join(", ")}` : "",
      ].filter(Boolean).join("\n"),
    }));

  downloadPdfReport(
    `Attacker investigation: ${incident.src_ip}`,
    `${incident.id} · ${incident.severity.toUpperCase()} · ${incident.verdict.toUpperCase()} · MIRAGE incident evidence`,
    `mirage-${incident.id}-attacker-report`,
    [
      {
        title: "Incident overview",
        entries: [
          { label: "Incident ID", value: incident.id },
          { label: "Source address", value: incident.src_ip },
          { label: "Origin", value: [incident.country, incident.asn].filter(Boolean).join(" · ") },
          { label: "Severity and score", value: `${incident.severity} · ${incident.score}/100` },
          { label: "Verdict and stage", value: `${incident.verdict} · ${incident.stage.replace(/_/g, " ")}` },
          { label: "Status", value: incident.status },
          { label: "First observed (UTC)", value: formatUtc(incident.first_seen) },
          { label: "Last activity (UTC)", value: formatUtc(incident.last_seen) },
          { label: "Duration", value: `${incident.duration_s}s` },
          { label: "Recorded events", value: incident.timeline?.length ?? 0 },
          { label: "Observed sessions", value: incident.profile?.sessions },
          { label: "Narrative", value: incident.narrative },
        ],
      },
      {
        title: "Attacker profile",
        entries: [
          { label: "Cadence", value: incident.profile?.cadence },
          { label: "Median event gap", value: incident.profile?.median_gap_s == null ? "Not recorded" : `${incident.profile.median_gap_s}s` },
          { label: "Sensors touched", value: incident.profile?.sensors?.join(", ") },
          { label: "SSH client", value: incident.profile?.ssh_client },
          { label: "HASSH fingerprint", value: incident.profile?.hassh },
          { label: "Credentials probed", value: incident.profile?.creds_tried?.join(", ") },
          { label: "Real asset touched", value: incident.real_asset_touched ? "Yes" : "No" },
          { label: "Honeytoken activity", value: incident.honeytoken_hit ? "Yes" : "No" },
        ],
      },
      {
        title: "Risk scoring factors",
        entries: (incident.factors ?? []).map((factor) => ({
          label: factor.label,
          value: `${factor.points > 0 ? "+" : ""}${factor.points} points`,
        })),
      },
      {
        title: "Observed MITRE ATT&CK techniques",
        entries: techniques.map((technique, index) => ({ label: `Technique ${index + 1}`, value: technique })),
      },
      { title: "Chronological event evidence", entries: events },
      {
        title: "Command transcript",
        entries: (incident.transcript ?? []).map((item) => ({
          label: formatUtc(item.ts),
          value: item.cmd,
        })),
      },
      {
        title: "Production events",
        entries: (incident.real_asset_events ?? []).map((event) => ({
          label: `${formatUtc(event.ts)} | ${event.sensor} | ${event.zone}`,
          value: `${event.action} · ${event.outcome}${event.summary ? `\n${event.summary}` : ""}`,
        })),
      },
      {
        title: "Observed files",
        entries: (incident.files ?? []).map((file, index) => ({
          label: file.name || `File ${index + 1}`,
          value: `SHA-256: ${file.sha256 || "Not recorded"}\nSize: ${file.size == null ? "Not recorded" : `${file.size} bytes`}`,
        })),
      },
      {
        title: "Response actions",
        entries: (incident.actions ?? []).map((action) => ({
          label: `${action.title} · ${action.status}`,
          value: `${action.why}${action.result ? `\nResult: ${action.result}` : ""}`,
        })),
      },
    ],
  );
}
