const knex = require('knex');
const pg = require('pg');
const config = require('../knexfile');

// Return DATE columns as 'YYYY-MM-DD' strings. The default parser produces
// Date objects at local midnight, which serialize to the previous day in UTC
// (e.g. 1960-08-01 stored -> "1960-07-31T23:00:00.000Z" over the wire) and
// corrupt every date-only value across timezones (DOB, schedule_date, due_date...).
pg.types.setTypeParser(pg.types.builtins.DATE, (v) => v);

const environment = process.env.NODE_ENV || 'development';
const db = knex(config[environment]);

// Test database connection
db.raw('SELECT 1')
  .then(() => {
    console.log('Database connected successfully');
  })
  .catch((err) => {
    console.error('Database connection failed:', err);
    process.exit(1);
  });

module.exports = db;
