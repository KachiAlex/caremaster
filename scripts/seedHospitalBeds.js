/**
 * Hospital Beds Seeding Script
 * ----------------------------
 * This script seeds initial bed data for institutions in Firestore.
 * 
 * Usage:
 *   node scripts/seedHospitalBeds.js [institutionId] [options]
 * 
 * Options:
 *   --institution-id <id>  - Specific institution ID to seed beds for
 *   --department <name>    - Department name (default: "General")
 *   --floor <number>       - Floor number (default: 1)
 *   --unit <name>          - Unit name (optional)
 *   --count <number>       - Number of beds to create (default: 10)
 *   --dry-run              - Preview changes without writing to database
 */

const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin
try {
  const serviceAccount = require(path.join(__dirname, '../serviceAccountKey.json'));
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
} catch (error) {
  console.error('Error initializing Firebase Admin:', error.message);
  console.error('Please ensure serviceAccountKey.json exists in the project root.');
  process.exit(1);
}

const db = admin.firestore();

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  institutionId: null,
  department: 'General',
  floor: 1,
  unit: null,
  count: 10,
  dryRun: false,
};

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg === '--institution-id' && args[i + 1]) {
    options.institutionId = args[i + 1];
    i++;
  } else if (arg === '--department' && args[i + 1]) {
    options.department = args[i + 1];
    i++;
  } else if (arg === '--floor' && args[i + 1]) {
    options.floor = parseInt(args[i + 1]);
    i++;
  } else if (arg === '--unit' && args[i + 1]) {
    options.unit = args[i + 1];
    i++;
  } else if (arg === '--count' && args[i + 1]) {
    options.count = parseInt(args[i + 1]);
    i++;
  } else if (arg === '--dry-run') {
    options.dryRun = true;
  } else if (!arg.startsWith('--') && !options.institutionId) {
    // First non-flag argument is treated as institutionId
    options.institutionId = arg;
  }
}

async function getInstitutions() {
  try {
    const institutionsSnapshot = await db.collection('institutions').get();
    return institutionsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error('Error fetching institutions:', error);
    throw error;
  }
}

async function checkExistingBeds(institutionId, department, floor) {
  try {
    const bedsSnapshot = await db
      .collection('hospitalBeds')
      .where('institutionId', '==', institutionId)
      .where('department', '==', department)
      .where('floor', '==', floor)
      .get();
    
    return bedsSnapshot.size;
  } catch (error) {
    console.error('Error checking existing beds:', error);
    return 0;
  }
}

async function createBed(institutionId, bedNumber, department, floor, unit, roomType = 'standard') {
  const bedData = {
    institutionId,
    bedNumber: bedNumber.toString(),
    department,
    floor,
    status: 'available',
    roomType,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
  };

  if (unit) {
    bedData.unit = unit;
  }

  if (options.dryRun) {
    console.log(`[DRY RUN] Would create bed:`, bedData);
    return { id: `dry-run-${bedNumber}`, ...bedData };
  }

  try {
    const docRef = await db.collection('hospitalBeds').add(bedData);
    return { id: docRef.id, ...bedData };
  } catch (error) {
    console.error(`Error creating bed ${bedNumber}:`, error);
    throw error;
  }
}

async function seedBeds() {
  console.log('🏥 Hospital Beds Seeding Script');
  console.log('================================\n');

  if (options.dryRun) {
    console.log('⚠️  DRY RUN MODE - No changes will be written to the database\n');
  }

  let institutions = [];

  if (options.institutionId) {
    // Use specific institution
    try {
      const institutionDoc = await db.collection('institutions').doc(options.institutionId).get();
      if (!institutionDoc.exists) {
        console.error(`❌ Institution ${options.institutionId} not found.`);
        process.exit(1);
      }
      institutions = [{ id: institutionDoc.id, ...institutionDoc.data() }];
    } catch (error) {
      console.error('Error fetching institution:', error);
      process.exit(1);
    }
  } else {
    // Get all institutions
    console.log('Fetching institutions...');
    institutions = await getInstitutions();
    
    if (institutions.length === 0) {
      console.error('❌ No institutions found. Please create an institution first.');
      process.exit(1);
    }
    
    console.log(`Found ${institutions.length} institution(s)\n`);
  }

  for (const institution of institutions) {
    console.log(`📋 Processing: ${institution.name || institution.id}`);
    console.log(`   Institution ID: ${institution.id}`);
    console.log(`   Department: ${options.department}`);
    console.log(`   Floor: ${options.floor}`);
    if (options.unit) {
      console.log(`   Unit: ${options.unit}`);
    }
    console.log(`   Beds to create: ${options.count}\n`);

    // Check existing beds
    const existingCount = await checkExistingBeds(
      institution.id,
      options.department,
      options.floor
    );
    
    if (existingCount > 0) {
      console.log(`   ⚠️  Found ${existingCount} existing bed(s) in this department/floor.`);
      console.log(`   Continuing to create ${options.count} additional bed(s)...\n`);
    }

    // Determine starting bed number
    const startNumber = existingCount + 1;
    const beds = [];

    // Create beds
    console.log('   Creating beds...');
    for (let i = 0; i < options.count; i++) {
      const bedNumber = startNumber + i;
      const roomType = i < options.count * 0.3 ? 'private' : 
                      i < options.count * 0.6 ? 'semi-private' : 'standard';
      
      try {
        const bed = await createBed(
          institution.id,
          bedNumber,
          options.department,
          options.floor,
          options.unit,
          roomType
        );
        beds.push(bed);
        process.stdout.write(`   ✓ Bed ${bedNumber} (${roomType})\r`);
      } catch (error) {
        console.error(`\n   ❌ Failed to create bed ${bedNumber}:`, error.message);
      }
    }

    console.log(`\n   ✅ Successfully created ${beds.length} bed(s)\n`);
  }

  console.log('✨ Seeding complete!');
  
  if (options.dryRun) {
    console.log('\n⚠️  This was a dry run. Use without --dry-run to actually create beds.');
  }

  process.exit(0);
}

// Run the script
seedBeds().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

