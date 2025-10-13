import { jsPDF } from 'jspdf';

/**
 * Export a medical report to PDF
 */
export const exportMedicalReportToPDF = (report, clientInfo, institutionInfo) => {
  try {
    // Create new PDF document
    const doc = new jsPDF();
    
    // Set font
    doc.setFont('helvetica');
    
    // Header
    doc.setFontSize(20);
    doc.setTextColor(37, 99, 235); // Blue color
    doc.text('MEDICAL REPORT', 105, 20, { align: 'center' });
    
    // Institution name
    doc.setFontSize(10);
    doc.setTextColor(107, 114, 128); // Gray
    if (institutionInfo?.name) {
      doc.text(institutionInfo.name, 105, 28, { align: 'center' });
    }
    
    // Divider line
    doc.setLineWidth(0.5);
    doc.setDrawColor(229, 231, 235); // Light gray
    doc.line(20, 35, 190, 35);
    
    // Client Information Section
    let yPos = 45;
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.text('CLIENT INFORMATION', 20, yPos);
    
    yPos += 8;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Name: ${clientInfo.name || clientInfo.fullName || 'N/A'}`, 20, yPos);
    yPos += 6;
    doc.text(`Client ID: ${clientInfo.id}`, 20, yPos);
    yPos += 6;
    if (clientInfo.age) {
      doc.text(`Age: ${clientInfo.age}`, 20, yPos);
      yPos += 6;
    }
    if (clientInfo.gender) {
      doc.text(`Gender: ${clientInfo.gender}`, 20, yPos);
      yPos += 6;
    }
    
    // Report Information Section
    yPos += 5;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('REPORT INFORMATION', 20, yPos);
    
    yPos += 8;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Report Date: ${report.reportDate instanceof Date ? report.reportDate.toLocaleDateString() : new Date(report.reportDate).toLocaleDateString()}`, 20, yPos);
    yPos += 6;
    doc.text(`Doctor: ${report.doctorName || 'N/A'}`, 20, yPos);
    yPos += 6;
    doc.text(`Created: ${report.createdAt instanceof Date ? report.createdAt.toLocaleString() : new Date(report.createdAt).toLocaleString()}`, 20, yPos);
    
    // Diagnosis Section
    yPos += 10;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('DIAGNOSIS', 20, yPos);
    
    yPos += 8;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    if (report.diagnosis) {
      const diagnosisLines = doc.splitTextToSize(report.diagnosis, 170);
      doc.text(diagnosisLines, 20, yPos);
      yPos += diagnosisLines.length * 6;
    } else {
      doc.text('No diagnosis recorded', 20, yPos);
      yPos += 6;
    }
    
    // Symptoms Section
    yPos += 5;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('SYMPTOMS OBSERVED', 20, yPos);
    
    yPos += 8;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    if (report.symptoms) {
      const symptomsLines = doc.splitTextToSize(report.symptoms, 170);
      doc.text(symptomsLines, 20, yPos);
      yPos += symptomsLines.length * 6;
    } else {
      doc.text('No symptoms recorded', 20, yPos);
      yPos += 6;
    }
    
    // Check if we need a new page
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }
    
    // Treatment Section
    yPos += 5;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('TREATMENT RECOMMENDATIONS', 20, yPos);
    
    yPos += 8;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    if (report.treatmentRecommendations) {
      const treatmentLines = doc.splitTextToSize(report.treatmentRecommendations, 170);
      doc.text(treatmentLines, 20, yPos);
      yPos += treatmentLines.length * 6;
    } else {
      doc.text('No treatment recommendations recorded', 20, yPos);
      yPos += 6;
    }
    
    // Prescriptions Section
    yPos += 5;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('PRESCRIPTIONS', 20, yPos);
    
    yPos += 8;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    if (report.prescriptions) {
      const prescriptionsLines = doc.splitTextToSize(report.prescriptions, 170);
      doc.text(prescriptionsLines, 20, yPos);
      yPos += prescriptionsLines.length * 6;
    } else {
      doc.text('No prescriptions recorded', 20, yPos);
      yPos += 6;
    }
    
    // Additional Notes Section
    if (report.additionalNotes) {
      // Check if we need a new page
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }
      
      yPos += 5;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('ADDITIONAL NOTES', 20, yPos);
      
      yPos += 8;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      const notesLines = doc.splitTextToSize(report.additionalNotes, 170);
      doc.text(notesLines, 20, yPos);
      yPos += notesLines.length * 6;
    }
    
    // Footer
    const totalPages = doc.internal.pages.length - 1;
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(156, 163, 175); // Light gray
      doc.text(
        `Page ${i} of ${totalPages}`,
        105,
        287,
        { align: 'center' }
      );
      doc.text(
        `Generated on ${new Date().toLocaleString()}`,
        105,
        292,
        { align: 'center' }
      );
    }
    
    // Save the PDF
    const fileName = `Medical_Report_${clientInfo.name || clientInfo.id}_${new Date(report.reportDate).toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
    
    console.log('✅ PDF exported:', fileName);
    return true;
  } catch (error) {
    console.error('❌ Error exporting PDF:', error);
    throw error;
  }
};

/**
 * Export a care plan to PDF
 */
export const exportCarePlanToPDF = (plan, clientInfo, institutionInfo) => {
  try {
    const doc = new jsPDF();
    
    // Set font
    doc.setFont('helvetica');
    
    // Header
    doc.setFontSize(20);
    doc.setTextColor(99, 102, 241); // Indigo color
    doc.text('CARE PLAN', 105, 20, { align: 'center' });
    
    // Institution name
    doc.setFontSize(10);
    doc.setTextColor(107, 114, 128);
    if (institutionInfo?.name) {
      doc.text(institutionInfo.name, 105, 28, { align: 'center' });
    }
    
    // Divider
    doc.setLineWidth(0.5);
    doc.setDrawColor(229, 231, 235);
    doc.line(20, 35, 190, 35);
    
    // Client Information
    let yPos = 45;
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.text('CLIENT INFORMATION', 20, yPos);
    
    yPos += 8;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Name: ${clientInfo.name || clientInfo.fullName || 'N/A'}`, 20, yPos);
    yPos += 6;
    doc.text(`Client ID: ${clientInfo.id}`, 20, yPos);
    
    // Plan Details
    yPos += 12;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('PLAN DETAILS', 20, yPos);
    
    yPos += 8;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Start Date: ${plan.startDate instanceof Date ? plan.startDate.toLocaleDateString() : new Date(plan.startDate).toLocaleDateString()}`, 20, yPos);
    yPos += 6;
    if (plan.reviewDate) {
      doc.text(`Review Date: ${plan.reviewDate instanceof Date ? plan.reviewDate.toLocaleDateString() : new Date(plan.reviewDate).toLocaleDateString()}`, 20, yPos);
      yPos += 6;
    }
    doc.text(`Status: ${plan.status || 'Active'}`, 20, yPos);
    yPos += 6;
    doc.text(`Created by: ${plan.doctorName || 'Doctor'}`, 20, yPos);
    
    // Care Objectives
    yPos += 12;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('CARE OBJECTIVES', 20, yPos);
    
    yPos += 8;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    if (plan.careObjectives) {
      const objectivesLines = doc.splitTextToSize(plan.careObjectives, 170);
      doc.text(objectivesLines, 20, yPos);
      yPos += objectivesLines.length * 6;
    }
    
    // Check for new page
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }
    
    // Daily Activities
    yPos += 8;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('DAILY CARE ACTIVITIES', 20, yPos);
    
    yPos += 8;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    if (plan.dailyCareActivities) {
      const activitiesLines = doc.splitTextToSize(plan.dailyCareActivities, 170);
      doc.text(activitiesLines, 20, yPos);
      yPos += activitiesLines.length * 6;
    }
    
    // Medication Schedule
    yPos += 8;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('MEDICATION SCHEDULE', 20, yPos);
    
    yPos += 8;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    if (plan.medicationSchedule) {
      const medLines = doc.splitTextToSize(plan.medicationSchedule, 170);
      doc.text(medLines, 20, yPos);
      yPos += medLines.length * 6;
    }
    
    // Check for new page
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }
    
    // Dietary Requirements
    yPos += 8;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('DIETARY REQUIREMENTS', 20, yPos);
    
    yPos += 8;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    if (plan.dietaryRequirements) {
      const dietLines = doc.splitTextToSize(plan.dietaryRequirements, 170);
      doc.text(dietLines, 20, yPos);
      yPos += dietLines.length * 6;
    }
    
    // Mobility & Exercise Plan
    yPos += 8;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('MOBILITY & EXERCISE PLAN', 20, yPos);
    
    yPos += 8;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    if (plan.mobilityPlan) {
      const mobilityLines = doc.splitTextToSize(plan.mobilityPlan, 170);
      doc.text(mobilityLines, 20, yPos);
      yPos += mobilityLines.length * 6;
    }
    
    // Special Instructions
    if (plan.specialInstructions) {
      // Check for new page
      if (yPos > 240) {
        doc.addPage();
        yPos = 20;
      }
      
      yPos += 8;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('SPECIAL INSTRUCTIONS', 20, yPos);
      
      yPos += 8;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      const instructionsLines = doc.splitTextToSize(plan.specialInstructions, 170);
      doc.text(instructionsLines, 20, yPos);
    }
    
    // Footer
    const totalPages = doc.internal.pages.length - 1;
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(156, 163, 175);
      doc.text(`Page ${i} of ${totalPages}`, 105, 287, { align: 'center' });
      doc.text(`Generated on ${new Date().toLocaleString()}`, 105, 292, { align: 'center' });
    }
    
    // Save
    const fileName = `Medical_Report_${clientInfo.name || clientInfo.id}_${new Date(report.reportDate).toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
    
    console.log('✅ Medical report PDF exported:', fileName);
    return true;
  } catch (error) {
    console.error('❌ Error exporting medical report PDF:', error);
    throw error;
  }
};

export default {
  exportMedicalReportToPDF,
  exportCarePlanToPDF
};

