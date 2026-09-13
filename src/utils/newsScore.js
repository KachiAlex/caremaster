/**
 * National Early Warning Score (NEWS) Calculator
 *
 * NEWS is a tool used in healthcare to improve the detection of and response to
 * clinical deterioration in adult patients.
 */

export const calculateNewsScore = (vitals) => {
  let score = 0;
  const details = {};

  // 1. Respiration Rate (breaths per minute)
  if (vitals.respiratoryRate !== undefined) {
    const rr = parseInt(vitals.respiratoryRate);
    let rrScore = 0;
    if (rr <= 8 || rr >= 25) rrScore = 3;
    else if (rr >= 21 && rr <= 24) rrScore = 2;
    else if (rr >= 9 && rr <= 11) rrScore = 1;
    score += rrScore;
    details.respiratoryRate = rrScore;
  }

  // 2. Oxygen Saturation (%)
  if (vitals.oxygenSaturation !== undefined) {
    const spo2 = parseInt(vitals.oxygenSaturation);
    let spo2Score = 0;
    if (spo2 <= 91) spo2Score = 3;
    else if (spo2 >= 92 && spo2 <= 93) spo2Score = 2;
    else if (spo2 >= 94 && spo2 <= 95) spo2Score = 1;
    score += spo2Score;
    details.oxygenSaturation = spo2Score;
  }

  // 3. Any Supplemental Oxygen? (Assume false if not provided)
  if (vitals.supplementalOxygen) {
    score += 2;
    details.supplementalOxygen = 2;
  }

  // 4. Temperature (°C) - assume Celsius for score, convert if needed
  if (vitals.temperature !== undefined) {
    let temp = parseFloat(vitals.temperature);
    if (vitals.temperatureUnit === '°F' || vitals.temperatureUnit === 'F' || temp > 50) {
      temp = (temp - 32) * 5 / 9; // Convert F to C
    }
    
    let tempScore = 0;
    if (temp <= 35.0) tempScore = 3;
    else if (temp >= 39.1) tempScore = 2;
    else if ((temp >= 35.1 && temp <= 36.0) || (temp >= 38.1 && temp <= 39.0)) tempScore = 1;
    score += tempScore;
    details.temperature = tempScore;
  }

  // 5. Systolic Blood Pressure (mmHg)
  if (vitals.bloodPressureSystolic !== undefined) {
    const sbp = parseInt(vitals.bloodPressureSystolic);
    let sbpScore = 0;
    if (sbp <= 90 || sbp >= 220) sbpScore = 3;
    else if (sbp >= 91 && sbp <= 100) sbpScore = 2;
    else if (sbp >= 101 && sbp <= 110) sbpScore = 1;
    score += sbpScore;
    details.bloodPressureSystolic = sbpScore;
  }

  // 6. Heart Rate (beats per minute)
  if (vitals.heartRate !== undefined) {
    const hr = parseInt(vitals.heartRate);
    let hrScore = 0;
    if (hr <= 40 || hr >= 131) hrScore = 3;
    else if (hr >= 111 && hr <= 130) hrScore = 2;
    else if ((hr >= 41 && hr <= 50) || (hr >= 91 && hr <= 110)) hrScore = 1;
    score += hrScore;
    details.heartRate = hrScore;
  }

  // 7. Level of Consciousness (Mental Status)
  if (vitals.mentalStatus) {
    let consciousnessScore = 0;
    const status = vitals.mentalStatus.toLowerCase();
    // 'alert' is 0, anything else (Confused, Lethargic, agitated, Responsive to voice/pain, Unresponsive) is 3
    if (status !== 'alert' && status !== 'independent') {
      consciousnessScore = 3;
    }
    score += consciousnessScore;
    details.mentalStatus = consciousnessScore;
  }

  // Determine clinical risk level
  let risk = 'low';
  let color = 'green';
  if (score >= 7) {
    risk = 'high';
    color = 'red';
  } else if (score >= 5 || Object.values(details).some(v => v === 3)) {
    risk = 'medium';
    color = 'orange';
  }

  return {
    score,
    details,
    risk,
    color,
    timestamp: new Date().toISOString()
  };
};
