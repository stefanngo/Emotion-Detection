import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { getRecentScans } from './db';

// --- CSV EXPORTER ---
export const downloadCSV = async () => {
    try {
        const scans = await getRecentScans(24); // Pull the last 24 hours of raw data

        if (scans.length === 0) {
            alert("No data available to export. Please record a session first.");
            return;
        }

        // Set up the CSV Headers
        let csvContent = "Timestamp,Local Time,Angry,Disgusted,Fearful,Happy,Neutral,Sad,Surprised\n";

        // Format the massive array into a comma-separated string
        scans.forEach(row => {
            const date = new Date(row.timestamp);
            const timeString = date.toLocaleTimeString([], { hour12: false }); // 24hr format
            const { angry, disgusted, fearful, happy, neutral, sad, surprised } = row.emotions;

            // Round to 4 decimal places to keep the file size manageable
            csvContent += `${row.timestamp},${timeString},${angry.toFixed(4)},${disgusted.toFixed(4)},${fearful.toFixed(4)},${happy.toFixed(4)},${neutral.toFixed(4)},${sad.toFixed(4)},${surprised.toFixed(4)}\n`;
        });

        // Create an invisible anchor tag to force the browser to download the file
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

// --- PDF EXPORTER ---
export const downloadPDF = async (elementId: string) => {
    const element = document.getElementById(elementId);
    if (!element) {
        console.error(`Element with id ${elementId} not found.`);
        return;
    }

    try {
        // Alert the user since this takes a second
        const btn = document.getElementById('pdf-btn');
        if (btn) btn.innerText = "Generating PDF...";

        // Take a high-res screenshot of the dashboard
        const canvas = await html2canvas(element, {
            scale: 2, // High DPI for crisp text
            useCORS: true, // Allows it to capture your video feed if possible
            backgroundColor: '#18181b' // Forces the dark theme background
        });

        const imgData = canvas.toDataURL('image/png');

        // Initialize an A4 PDF
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

        // Paste the image into the PDF
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`EmotionDiary_Report_${new Date().toISOString().split('T')[0]}.pdf`);

        if (btn) btn.innerText = "Export PDF Report";

    } catch (error) {
        console.error("PDF Generation failed:", error);
        alert("Failed to generate PDF. Check the console for errors.");
    }
};