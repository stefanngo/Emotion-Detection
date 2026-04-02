import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';
import { getRecentScans } from './db';

// --- CSV EXPORTER (Unchanged) ---
export const downloadCSV = async () => {
    try {
        const scans = await getRecentScans(24);

        if (scans.length === 0) {
            alert("No data available to export. Please record a session first.");
            return;
        }

        let csvContent = "Timestamp,Local Time,Angry,Disgusted,Fearful,Happy,Neutral,Sad,Surprised\n";

        scans.forEach(row => {
            const date = new Date(row.timestamp);
            const timeString = date.toLocaleTimeString([], { hour12: false });
            const { angry, disgusted, fearful, happy, neutral, sad, surprised } = row.emotions;

            csvContent += `${row.timestamp},${timeString},${angry.toFixed(4)},${disgusted.toFixed(4)},${fearful.toFixed(4)},${happy.toFixed(4)},${neutral.toFixed(4)},${sad.toFixed(4)},${surprised.toFixed(4)}\n`;
        });

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);

        link.setAttribute("href", url);
        link.setAttribute("download", `EmotionDiary_RawData_${new Date().toISOString().split('T')[0]}.csv`);

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

    } catch (error) {
        console.error("CSV Export failed:", error);
        alert("Failed to export CSV. Check the console for errors.");
    }
};

// --- PDF EXPORTER (Continuous Scroll Upgrade) ---
export const downloadPDF = async (elementId: string) => {
    const element = document.getElementById(elementId);
    if (!element) return;

    try {
        const btn = document.getElementById('pdf-btn');
        if (btn) btn.innerText = "Generating...";

        const imgData = await toPng(element, {
            quality: 1,
            pixelRatio: 2,
            backgroundColor: '#ffffff',
        });

        // A4 width is 210mm. We calculate the exact mathematical height needed to fit the content.
        const pdfWidth = 210;
        const pdfHeight = (element.offsetHeight * pdfWidth) / element.offsetWidth;

        // THE FIX: We create a custom-sized PDF that is exactly as long as your report.
        // No more awkward page breaks cutting text in half!
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: [pdfWidth, pdfHeight]
        });

        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`EmotionDiary_Report_${new Date().toISOString().split('T')[0]}.pdf`);

        if (btn) btn.innerText = "Export PDF Report";

    } catch (error) {
        console.error("PDF Generation failed:", error);
        alert("Failed to generate PDF. Check the console for errors.");
    }
};