"use client";

import { FileText, Download, Loader2 } from "lucide-react";
import { useState } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

export default function ContentIntegrityRail({
  currentStep,
  comicData,
  projectData,
  onGenerateRequest,
}) {
  const projectTitle = projectData?.title || "Untitled Project";
  const chapters = projectData?.chapters || [];
  const [isExporting, setIsExporting] = useState(false);

  const handleExportPDF = async () => {
    // We look for all panel containers
    const panels = document.querySelectorAll('[id^="comic-panel-"]');
    if (panels.length === 0) return;

    setIsExporting(true);
    try {
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pdfWidth = 210;
      const pdfPageHeight = 297;

      for (let i = 0; i < panels.length; i++) {
        const panel = panels[i];

        // Capture each panel at high resolution
        const canvas = await html2canvas(panel, {
          scale: 2,
          useCORS: true,
          backgroundColor: "#ffffff",
          logging: false,
        });

        const imgData = canvas.toDataURL("image/png");
        const imgWidth = pdfWidth - 20; // 10mm margin on each side
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        // Add a new page if it's not the first one
        if (i > 0) pdf.addPage();

        // Center the panel on the A4 page
        const xOffset = 10;
        const yOffset = Math.max(10, (pdfPageHeight - imgHeight) / 2);

        pdf.addImage(imgData, "PNG", xOffset, yOffset, imgWidth, imgHeight);
      }

      pdf.save(`${projectTitle.replace(/\s+/g, "_")}_Comic_Flow.pdf`);
    } catch (error) {
      console.error("Failed to generate PDF:", error);
      alert(
        "Failed to generate PDF. Make sure all images have finished loading.",
      );
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="w-[300px] border-r border-white/5 bg-[#131316]/40 shrink-0 flex flex-col pt-6">
      <div className="px-6 pb-6 border-b border-white/5">
        <h2 className="text-[10px] font-bold text-[#ba9eff] tracking-widest uppercase">
          Content Integrity Rail
        </h2>
      </div>

      <div className="p-6 flex-1 flex flex-col gap-4">
        {/* Project Title Field */}
        <div className="flex items-center gap-3 px-4 py-3 bg-[#0e0e11] rounded-xl border border-white/5 opacity-70">
          <FileText size={16} className="text-[#69daff]" />
          <span className="text-sm text-white/70 truncate">{projectTitle}</span>
        </div>

        {/* Dynamic Chapter Fields */}
        {chapters.length > 0 ? (
          chapters.slice(0, 3).map((chap, idx) => (
            <div
              key={chap.id || idx}
              className="flex items-center gap-3 px-4 py-3 bg-[#0e0e11] rounded-xl border border-white/5 opacity-70"
            >
              <FileText size={16} className="text-[#69daff]" />
              <span className="text-sm text-white/50 truncate">
                {chap.title}
              </span>
            </div>
          ))
        ) : (
          <div className="text-xs text-white/30 px-2 italic">
            No chapters defined.
          </div>
        )}
      </div>

      {/* Footer Action */}
      <div className="p-6">
        {currentStep === 5 ? (
          <button
            onClick={handleExportPDF}
            disabled={isExporting}
            className="w-full py-4 bg-[#ba9eff] hover:bg-[#a385ff] text-[#0e0e11] font-bold rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(186,158,255,0.2)] disabled:opacity-50"
          >
            {isExporting ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Download size={18} />
            )}
            {isExporting ? "GENERATING PDF..." : "GENERATE PDF"}
          </button>
        ) : currentStep === 1 ? (
          <button
            onClick={onGenerateRequest}
            className="w-full py-4 bg-[#ba9eff] hover:bg-[#a385ff] text-[#0e0e11] font-bold rounded-xl transition-all active:scale-95 shadow-[0_0_20px_rgba(186,158,255,0.2)]"
          >
            CONFIRM TEMPLATE
          </button>
        ) : (
          <div className="w-full py-4 bg-white/5 text-white/30 font-bold rounded-xl text-center cursor-not-allowed">
            {currentStep === 2 || currentStep === 3
              ? "PROCESSING..."
              : "PROCEED"}
          </div>
        )}
      </div>
    </div>
  );
}
