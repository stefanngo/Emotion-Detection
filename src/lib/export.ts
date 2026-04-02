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

// --- PDF EXPORTER (Upgraded Engine) ---
export const downloadPDF = async (elementId: string) => {
    const element = document.getElementById(elementId);
    if (!element) {
        console.error(`Element with id ${elementId} not found.`);
        return;
    }

    try {
        const btn = document.getElementById('pdf-btn');
        if (btn) btn.innerText = "Generating PDF...";

        // Use the modern html-to-image engine
        const imgData = await toPng(element, {
            quality: 1,
            pixelRatio: 2, // High resolution
            backgroundColor: '#18181b', // Forces the dark theme background
        });

        // Initialize an A4 PDF
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        // Dynamically calculate height based on the specific aspect ratio of your dashboard
        const pdfHeight = (element.offsetHeight * pdfWidth) / element.offsetWidth;

        // Paste the image into the PDF
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`EmotionDiary_Report_${new Date().toISOString().split('T')[0]}.pdf`);

        if (btn) btn.innerText = "Export PDF Report";

    } catch (error) {
        console.error("PDF Generation failed:", error);
        alert("Failed to generate PDF. Check the console for errors.");
    }
};